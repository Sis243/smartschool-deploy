import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'smartschool-uploads';

// Stockage des fichiers uploadés (preuves de paiement, photos élèves) sur
// Supabase Storage plutôt que sur le disque local : sur Vercel (serverless),
// le système de fichiers est éphémère et ne survit pas d'une requête à
// l'autre — un fichier écrit sur disque disparaîtrait immédiatement.
@Injectable()
export class StorageService {
  private readonly client: SupabaseClient | null;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('supabase.url');
    const serviceKey = this.configService.get<string>('supabase.serviceRoleKey');
    this.client = url && serviceKey ? createClient(url, serviceKey) : null;
  }

  async upload(dossier: 'preuves' | 'eleves' | 'logos', file: Express.Multer.File): Promise<string> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'Stockage non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants)',
      );
    }

    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
    const path = `${dossier}/${unique}.${ext}`;

    const { error } = await this.client.storage.from(BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (error) throw new InternalServerErrorException(`Échec de l'upload : ${error.message}`);

    const { data } = this.client.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}
