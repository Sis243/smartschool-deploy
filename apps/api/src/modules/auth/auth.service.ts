import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BrevoService } from '../../common/services/brevo.service';
import { buildEmailHtml } from '../../common/services/email-template';
import { LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

const RESET_TOKEN_VALIDITY_MS = 60 * 60 * 1000; // 1 heure
const INVITATION_TOKEN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

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
        role: true, tenantId: true, isSuperAdmin: true,
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

    return this.generateTokens(user);
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
    if (!user) return false;

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

    return this.brevo.sendEmail(
      user.email,
      `Bienvenue${nomEtablissement ? ` sur ${nomEtablissement}` : ' sur SmartSchool ERP'}`,
      `Bonjour ${user.firstName},\n\nUn compte vient d'être créé pour vous sur SmartSchool ERP.\nVotre identifiant : ${user.email}\n\nActivez votre compte et choisissez votre mot de passe ici (valable 7 jours) :\n${lien}`,
      nomEtablissement,
      html,
    );
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
