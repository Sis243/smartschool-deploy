import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(tenantId: string, data: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({ where: { email: data.email } });
    if (existing) throw new ConflictException('Un compte avec cet email existe déjà');

    // Mot de passe initial inconnu de tous — la personne choisit le sien via
    // le lien d'invitation envoyé par e-mail, jamais transmis à la main.
    const hashed = await bcrypt.hash(randomBytes(24).toString('hex'), 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        password: hashed,
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true },
    });

    const invitationEnvoyee = await this.authService.envoyerInvitation(user.id);
    return { ...user, invitationEnvoyee };
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateUserDto,
    currentUser: { id: string; role: string; isSuperAdmin: boolean },
  ) {
    await this.findOne(id, tenantId);

    const isSelf = currentUser.id === id;
    const isPrivilegie = currentUser.isSuperAdmin || ['ADMIN', 'DIRECTEUR'].includes(currentUser.role);

    // Chacun peut modifier son propre nom/téléphone, mais modifier un AUTRE
    // utilisateur — ou changer un rôle, y compris le sien — exige un rôle
    // ADMIN/DIRECTEUR. Sans ça, un enseignant pourrait s'auto-promouvoir ADMIN
    // via cette même route.
    if (!isSelf && !isPrivilegie) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre profil');
    }
    if (data.role !== undefined && !isPrivilegie) {
      throw new ForbiddenException('Rôle insuffisant pour modifier un rôle');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: isPrivilegie ? data.role : undefined,
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
    });
  }

  async toggleActive(id: string, tenantId: string) {
    const user = await this.findOne(id, tenantId);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }
}
