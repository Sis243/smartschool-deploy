import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les utilisateurs' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR')
  @ApiOperation({ summary: 'Créer un utilisateur (admin/directeur uniquement)' })
  create(@CurrentTenant('id') tenantId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un utilisateur' })
  findOne(@Param('id') id: string, @CurrentTenant('id') tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un utilisateur (son propre profil, ou tout profil si admin/directeur)' })
  update(
    @Param('id') id: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.update(id, tenantId, dto, currentUser);
  }

  @Patch(':id/toggle')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR')
  @ApiOperation({ summary: 'Activer/Désactiver un utilisateur (admin/directeur uniquement)' })
  toggle(@Param('id') id: string, @CurrentTenant('id') tenantId: string) {
    return this.usersService.toggleActive(id, tenantId);
  }
}
