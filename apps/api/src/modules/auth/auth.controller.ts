import { Controller, Post, Body, UseGuards, Get, Patch, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import {
  LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto,
  VerifyTwoFactorDto, ConfirmTwoFactorDto, DisableTwoFactorDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, CurrentTenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Connexion utilisateur' })
  async login(@Body() dto: LoginDto, @CurrentTenant('id') tenantId: string) {
    return this.authService.login(dto, tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Profil utilisateur connecté' })
  async me(@CurrentUser() user: any) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('change-password')
  @ApiOperation({ summary: 'Changer le mot de passe' })
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Renouveler la session avec le refresh token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Demander un lien de réinitialisation de mot de passe' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le lien reçu par email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ── Vérification en 2 étapes ────────────────────────────────────────────

  @Public()
  @Post('2fa/verify')
  @ApiOperation({ summary: 'Terminer la connexion avec le code de vérification en 2 étapes' })
  async verifyTwoFactor(@Body() dto: VerifyTwoFactorDto) {
    return this.authService.verifierDeuxFacteurs(dto.pendingToken, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/setup')
  @ApiOperation({ summary: "Démarrer l'activation de la vérification en 2 étapes (génère le QR code)" })
  async setupTwoFactor(@CurrentUser('id') userId: string, @CurrentUser('email') email: string) {
    return this.authService.preparerDeuxFacteurs(userId, email);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/enable')
  @ApiOperation({ summary: 'Confirmer et activer la vérification en 2 étapes' })
  async enableTwoFactor(@CurrentUser('id') userId: string, @Body() dto: ConfirmTwoFactorDto) {
    return this.authService.confirmerDeuxFacteurs(userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/disable')
  @ApiOperation({ summary: 'Désactiver la vérification en 2 étapes' })
  async disableTwoFactor(@CurrentUser('id') userId: string, @Body() dto: DisableTwoFactorDto) {
    return this.authService.desactiverDeuxFacteurs(userId, dto.password);
  }
}
