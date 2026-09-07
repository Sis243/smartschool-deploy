import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { CanalNotification } from '@prisma/client';

export interface SendNotifDto {
  tenantId: string;
  parentId: string;
  canal: CanalNotification;
  titre: string;
  message: string;
}

const BREVO_API = 'https://api.brevo.com/v3';

@Injectable()
export class NotifParentService {
  private readonly logger = new Logger(NotifParentService.name);
  private readonly apiKey: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('brevo.apiKey');
  }

  private brevoHeaders() {
    return { 'api-key': this.apiKey!, 'Content-Type': 'application/json' };
  }

  private async envoyerEmail(to: string, sujet: string, texte: string) {
    await axios.post(
      `${BREVO_API}/smtp/email`,
      {
        sender: {
          email: this.configService.get<string>('brevo.senderEmail'),
          name: this.configService.get<string>('brevo.senderName'),
        },
        to: [{ email: to }],
        subject: sujet,
        textContent: texte,
      },
      { headers: this.brevoHeaders() },
    );
  }

  private async envoyerSms(to: string, texte: string) {
    await axios.post(
      `${BREVO_API}/transactionalSMS/sms`,
      {
        sender: this.configService.get<string>('brevo.smsSender'),
        recipient: to,
        content: texte,
        type: 'transactional',
      },
      { headers: this.brevoHeaders() },
    );
  }

  private async envoyerWhatsapp(to: string, texte: string) {
    // API WhatsApp Brevo (nécessite un modèle de message approuvé en
    // production) — en cas d'échec (modèle non configuré), on se contente de
    // journaliser plutôt que de faire échouer toute la notification.
    await axios.post(
      `${BREVO_API}/whatsapp/sendMessage`,
      { contactNumbers: [to], senderNumber: this.configService.get<string>('brevo.smsSender'), text: texte },
      { headers: this.brevoHeaders() },
    );
  }

  async send(dto: SendNotifDto) {
    const parent = await this.prisma.parent.findUnique({ where: { id: dto.parentId } });

    let statut: string = 'SIMULE';
    if (parent && this.apiKey) {
      try {
        const texte = `${dto.titre}\n${dto.message}`;
        if (dto.canal === 'EMAIL' && parent.email) {
          await this.envoyerEmail(parent.email, dto.titre, texte);
          statut = 'ENVOYE';
        } else if (dto.canal === 'SMS') {
          await this.envoyerSms(parent.telephone, texte);
          statut = 'ENVOYE';
        } else if (dto.canal === 'WHATSAPP') {
          await this.envoyerWhatsapp(parent.telephone, texte);
          statut = 'ENVOYE';
        }
      } catch (error: any) {
        this.logger.error(`Échec envoi ${dto.canal} à ${dto.parentId}: ${error?.response?.data?.message || error?.message}`);
        statut = 'ECHEC';
      }
    }

    // Statut reste 'SIMULE' si aucune clé Brevo n'est configurée — la
    // notification apparaît quand même dans le portail parent, sans envoi réel.
    return this.prisma.notifParent.create({
      data: {
        tenantId: dto.tenantId,
        parentId: dto.parentId,
        canal: dto.canal,
        titre: dto.titre,
        message: dto.message,
        statut,
      },
    });
  }

  async sendAll(tenantId: string, parentId: string, titre: string, message: string) {
    const parent = await this.prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent) return;

    const canaux: CanalNotification[] = ['SMS', 'EMAIL', 'WHATSAPP'];
    await Promise.all(
      canaux.map((canal) => this.send({ tenantId, parentId, canal, titre, message })),
    );
  }

  async findByParent(parentId: string, page = 1, limit = 20) {
    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const [data, total] = await Promise.all([
      this.prisma.notifParent.findMany({
        where: { parentId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notifParent.count({ where: { parentId } }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async marquerLu(id: string, parentId: string) {
    return this.prisma.notifParent.updateMany({
      where: { id, parentId },
      data: { lu: true },
    });
  }

  async countNonLues(parentId: string) {
    return this.prisma.notifParent.count({ where: { parentId, lu: false } });
  }
}
