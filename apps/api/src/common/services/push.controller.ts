import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PushService } from './push.service';
import { Public } from '../decorators/public.decorator';
import { CurrentUser, CurrentTenant } from '../decorators/tenant.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Push')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Public()
  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('subscribe')
  async subscribe(
    @CurrentUser() user: any,
    @CurrentTenant('id') tenantId: string,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    const estParent = user.type === 'parent';
    await this.pushService.subscribe(
      tenantId,
      estParent ? { parentId: user.id } : { userId: user.id },
      body,
    );
    return { message: 'Abonnement enregistré' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('unsubscribe')
  async unsubscribe(@Body() body: { endpoint: string }) {
    await this.pushService.unsubscribe(body.endpoint);
    return { message: 'Abonnement supprimé' };
  }
}
