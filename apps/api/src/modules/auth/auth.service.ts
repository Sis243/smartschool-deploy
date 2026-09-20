import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BrevoService } from '../../common/services/brevo.service';
import { buildEmailHtml } from '../../common/services/email-template';
import { LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

const RESET_TOKEN_VALIDITY_MS = 60 * 60 * 1000; // 1 heure
const INVITATION_TOKEN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const DEUX_FACTEURS_ISSUER = 'SmartSchool ERP';
const DEUX_FACTEURS_PENDING_VALIDITY = '5m';
const NB_CODES_SECOURS = 8;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly brevo: BrevoService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isSuperAdmin: true,
        twoFactorEnabled: true,
      },
    });

    // Le personnel d'appui (jardinier, gardien...) n'a pas de mot de passe —
    // c'est une fiche RH sans compte de connexion, jamais un compte à activer.
    if (!user || !user.password) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    const { password: _, ...result } = user;
    return result;
  }

  // Renouvelle une session à partir du refresh token (durée de vie longue),
  // sans exiger de se reconnecter avec email/mot de passe. Jusqu'ici ce
  // jeton était émis à la connexion mais jamais utilisé nulle part — la
  // session expirait donc au bout de JWT_EXPIRES_IN (7 jours) au lieu de se
  // renouveler silencieusement.
  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, isActive: true },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, tenantId: true, isSuperAdmin: true, twoFactorEnabled: true,
      },
    });
    if (!user) throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');

    return this.generateTokens(user);
  }

  async login(dto: LoginDto, tenantId?: string) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (tenantId && !user.isSuperAdmin && user.tenantId !== tenantId) {
      throw new UnauthorizedException('Accès refusé à cet établissement');
    }

    // Mot de passe correct mais 2FA active : pas de session complète tant que
    // le code n'est pas vérifié — un jeton à durée de vie très courte et à
    // usage unique (type distinct, rejeté par JwtStrategy) sert juste à relier
    // les deux étapes sans redemander le mot de passe.
    if (user.twoFactorEnabled) {
      const pendingToken = await this.jwtService.signAsync(
        { sub: user.id, type: '2fa_pending' },
        { expiresIn: DEUX_FACTEURS_PENDING_VALIDITY },
      );
      return { requiresTwoFactor: true, pendingToken };
    }

    return this.generateTokens(user);
  }

  // ── Vérification en 2 étapes (TOTP) ─────────────────────────────────────

  async verifierDeuxFacteurs(pendingToken: string, code: string) {
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync(pendingToken);
    } catch {
      throw new UnauthorizedException('Session de connexion expirée, veuillez vous reconnecter');
    }
    if (payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Jeton invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, isActive: true },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true,
        tenantId: true, isSuperAdmin: true, twoFactorEnabled: true,
        twoFactorSecret: true, twoFactorBackupCodes: true,
      },
    });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Session de connexion expirée, veuillez vous reconnecter');
    }

    const codeNettoye = code.replace(/\s+/g, '');
    const estCodeTotp = authenticator.check(codeNettoye, user.twoFactorSecret);

    if (!estCodeTotp) {
      // Un code de secours n'est valable qu'une fois — on le retire dès usage.
      const codeHache = createHash('sha256').update(codeNettoye.toUpperCase()).digest('hex');
      const index = user.twoFactorBackupCodes.indexOf(codeHache);
      if (index === -1) throw new UnauthorizedException('Code de vérification incorrect');

      await this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: user.twoFactorBackupCodes.filter((_, i) => i !== index) },
      });
    }

    return this.generateTokens(user);
  }

  // Étape 1 : génère un secret (pas encore actif) + le QR code à scanner.
  // twoFactorEnabled reste false tant que confirmerDeuxFacteurs n'a pas
  // validé un premier code — sinon une config ratée (QR mal scanné, etc.)
  // verrouillerait le compte dès la prochaine connexion.
  async preparerDeuxFacteurs(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    const otpauthUrl = authenticator.keyuri(email, DEUX_FACTEURS_ISSUER, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, qrCodeDataUrl };
  }

  // Étape 2 : confirme la mise en place avec un premier code réel, active la
  // 2FA, et génère les codes de secours (affichés une seule fois en clair).
  async confirmerDeuxFacteurs(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorSecret: true } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException("Aucune configuration en cours — relancez depuis \"Activer la vérification en 2 étapes\"");
    }
    if (!authenticator.check(code.replace(/\s+/g, ''), user.twoFactorSecret)) {
      throw new BadRequestException('Code incorrect — vérifiez l\'heure de votre téléphone et réessayez');
    }

    const codesSecours = Array.from({ length: NB_CODES_SECOURS }, () =>
      randomBytes(5).toString('hex').toUpperCase(),
    );
    const codesHaches = codesSecours.map((c) => createHash('sha256').update(c).digest('hex'));

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorBackupCodes: codesHaches },
    });

    return { backupCodes: codesSecours };
  }

  async desactiverDeuxFacteurs(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Mot de passe incorrect');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
    });
    return { message: 'Vérification en 2 étapes désactivée' };
  }

  async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      requiresTwoFactor: false as const,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin,
        twoFactorEnabled: !!user.twoFactorEnabled,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) throw new UnauthorizedException();

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: { tenant: { select: { name: true } } },
    });

    // Toujours la même réponse, que l'email existe ou non — sinon on révèle
    // quels emails sont enregistrés (énumération de comptes).
    const message = 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.';
    if (!user) return { message };

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_VALIDITY_MS),
      },
    });

    const frontendUrl = this.configService.get<string>('frontendUrl');
    const lien = `${frontendUrl}/reset-password?token=${rawToken}`;
    const html = buildEmailHtml({
      titre: 'Réinitialisation de votre mot de passe',
      etablissement: user.tenant?.name,
      paragraphes: [
        `Bonjour ${user.firstName},`,
        `Vous avez demandé à réinitialiser le mot de passe de votre compte. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.`,
      ],
      ctaLabel: 'Réinitialiser mon mot de passe',
      ctaUrl: lien,
      note: `Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail — votre mot de passe actuel reste inchangé.`,
    });
    await this.brevo.sendEmail(
      user.email,
      'Réinitialisation de votre mot de passe',
      `Bonjour ${user.firstName},\n\nCliquez sur ce lien pour choisir un nouveau mot de passe (valable 1 heure) :\n${lien}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
      user.tenant?.name,
      html,
    );

    return { message };
  }

  // Invite un utilisateur nouvellement créé (par un admin/RH) à activer son
  // compte : aucun mot de passe temporaire à transmettre à la main, la
  // personne choisit elle-même son mot de passe via un lien signé.
  async envoyerInvitation(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: { select: { name: true } } },
    });
    // Le personnel d'appui (voir RhService.createPersonnel) n'a pas d'email
    // et n'est jamais invité — vérification défensive, ce cas ne devrait
    // jamais atteindre cette méthode.
    if (!user || !user.email) return false;

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + INVITATION_TOKEN_VALIDITY_MS),
      },
    });

    const frontendUrl = this.configService.get<string>('frontendUrl');
    const lien = `${frontendUrl}/reset-password?token=${rawToken}&bienvenue=1`;
    const nomEtablissement = user.tenant?.name;
    const html = buildEmailHtml({
      titre: `Bienvenue${nomEtablissement ? ` sur l'espace ${nomEtablissement}` : ''}`,
      etablissement: nomEtablissement,
      paragraphes: [
        `Bonjour ${user.firstName},`,
        `Un compte vient d'être créé pour vous${nomEtablissement ? ` sur <strong>${nomEtablissement}</strong>` : ''} sur SmartSchool ERP.`,
        `Votre identifiant de connexion est votre adresse e-mail : <strong>${user.email}</strong>.`,
        `Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et activer votre compte.`,
      ],
      ctaLabel: 'Activer mon compte',
      ctaUrl: lien,
      note: `Ce lien est valable 7 jours. Si vous ne vous attendiez pas à cet e-mail, vous pouvez l'ignorer sans risque.`,
    });

    const envoye = await this.brevo.sendEmail(
      user.email,
      `Bienvenue${nomEtablissement ? ` sur ${nomEtablissement}` : ' sur SmartSchool ERP'}`,
      `Bonjour ${user.firstName},\n\nUn compte vient d'être créé pour vous sur SmartSchool ERP.\nVotre identifiant : ${user.email}\n\nActivez votre compte et choisissez votre mot de passe ici (valable 7 jours) :\n${lien}`,
      nomEtablissement,
      html,
    );

    // WhatsApp en plus de l'email (best-effort) — voir ParentPortalService
    // .genererAccessCode pour le même principe côté parents.
    if (user.phone) {
      await this.brevo.sendWhatsapp(
        user.phone,
        `Bonjour ${user.firstName}, un compte vient d'être créé pour vous${nomEtablissement ? ` sur ${nomEtablissement}` : ''} sur SmartSchool ERP.\nVotre identifiant : ${user.email}\nActivez votre compte ici (valable 7 jours) : ${lien}`,
      );
    }

    return envoye;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { resetToken: hashedToken, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}
