import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunicationService } from './communication.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communication')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post('notifications')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  @ApiOperation({ summary: 'Envoyer une notification (SMS/Email/Push/WhatsApp)' })
  envoyer(@CurrentTenant('id') tenantId: string, @Body() data: any) {
    return this.communicationService.envoyerNotification(tenantId, data);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Historique des notifications' })
  getNotifications(
    @CurrentTenant('id') tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.communicationService.getNotifications(tenantId, limit);
  }
}
