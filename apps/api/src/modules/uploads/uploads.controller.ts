import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ParentJwtGuard } from '../parent-portal/parent-jwt.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StorageService } from '../../storage/storage.service';

// Les fichiers transitent en mémoire (pas de disque : Vercel serverless a un
// système de fichiers éphémère) puis sont envoyés vers Supabase Storage.
const imageFilter = (allowed: string[]) => (req: any, file: Express.Multer.File, cb: any) => {
  if (allowed.includes(extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`Format non accepté (${allowed.join(', ')} uniquement)`), false);
  }
};

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storageService: StorageService) {}

  @Post('preuve-paiement')
  @ApiBearerAuth()
  @UseGuards(ParentJwtGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: imageFilter(['.jpg', '.jpeg', '.png', '.pdf', '.webp']),
    }),
  )
  @ApiConsumes('multipart/form-data')
  async uploadPreuve(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    const url = await this.storageService.upload('preuves', file);
    return { url, nom: file.originalname, taille: file.size };
  }

  // Public — aucune auth : le formulaire d'inscription en ligne est rempli
  // par un parent qui n'a pas encore de compte (ni staff, ni portail parent).
  // Limite basse + filtre image strict pour limiter l'abus d'un endpoint ouvert.
  @Post('photo-inscription')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
      fileFilter: imageFilter(['.jpg', '.jpeg', '.png', '.webp']),
    }),
  )
  @ApiConsumes('multipart/form-data')
  async uploadPhotoInscription(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    const url = await this.storageService.upload('inscriptions', file);
    return { url, nom: file.originalname, taille: file.size };
  }

  @Post('photo-eleve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: imageFilter(['.jpg', '.jpeg', '.png', '.webp']),
    }),
  )
  @ApiConsumes('multipart/form-data')
  async uploadPhotoEleve(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    const url = await this.storageService.upload('eleves', file);
    return { url, nom: file.originalname, taille: file.size };
  }

  @Post('logo-ecole')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
      fileFilter: imageFilter(['.jpg', '.jpeg', '.png', '.webp', '.svg']),
    }),
  )
  @ApiConsumes('multipart/form-data')
  async uploadLogoEcole(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    const url = await this.storageService.upload('logos', file);
    return { url, nom: file.originalname, taille: file.size };
  }
}
