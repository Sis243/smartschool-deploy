import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/tenant.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.slug }, { email: dto.email }] },
    });

    if (existing) {
      throw new ConflictException('Un établissement avec ce slug ou email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(dto.adminPassword, 12);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        schoolType: dto.schoolType,
        subscriptionPlan: dto.subscriptionPlan || 'BASIC',
        users: {
          create: {
            email: dto.adminEmail,
            password: hashedPassword,
            firstName: dto.adminFirstName,
            lastName: dto.adminLastName,
            role: 'ADMIN',
          },
        },
      },
      include: { users: { select: { id: true, email: true, role: true } } },
    });

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        schoolType: true,
        subscriptionPlan: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true, eleves: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, eleves: true, classes: true } },
      },
    });

    if (!tenant) throw new NotFoundException('Établissement introuvable');
    return tenant;
  }

  async toggleActive(id: string) {
    const tenant = await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    });
  }

  async updateSettings(tenantId: string, data: {
    name?: string;
    phone?: string;
    address?: string;
    email?: string;
  }) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        email: data.email,
      },
      select: {
        id: true, name: true, slug: true, email: true,
        phone: true, address: true, schoolType: true,
        subscriptionPlan: true, logoUrl: true,
      },
    });
  }
}
