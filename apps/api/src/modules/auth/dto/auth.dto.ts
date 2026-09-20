import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@bondepart.cd' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'bondepart' })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'jean.dupont@bondepart.cd' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@bondepart.cd' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class VerifyTwoFactorDto {
  @ApiProperty({ description: 'Reçu dans la réponse de /auth/login quand requiresTwoFactor est vrai' })
  @IsString()
  pendingToken: string;

  @ApiProperty({ example: '123456', description: 'Code de l\'application d\'authentification, ou un code de secours' })
  @IsString()
  code: string;
}

export class ConfirmTwoFactorDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  code: string;
}

export class DisableTwoFactorDto {
  @ApiProperty()
  @IsString()
  password: string;
}
