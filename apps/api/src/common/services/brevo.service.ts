import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const BREVO_API = 'https://api.brevo.com/v3';

// Service Brevo partagé (email + SMS + WhatsApp) — utilisé par les
// notifications parent ET par les e-mails "système" (mot de passe oublié...).
// Le nom d'expéditeur peut être surchargé pour afficher le nom de
// l'établissement plutôt que "SmartSchool" générique.
@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);

  constructor(private readonly configService: ConfigService) {}

  get isConfigured(): boolean {
    return !!this.configService.get<string>('brevo.apiKey');
  }

  private headers() {
    return {
      'api-key': this.configService.get<string>('brevo.apiKey')!,
      'Content-Type': 'application/json',
    };
  }

  async sendEmail(to: string, sujet: string, texte: string, nomExpediteur?: string, html?: string) {
    if (!this.isConfigured) return false;
    try {
      await axios.post(
        `${BREVO_API}/smtp/email`,
        {
          sender: {
            email: this.configService.get<string>('brevo.senderEmail'),
            name: nomExpediteur || this.configService.get<string>('brevo.senderName'),
          },
          to: [{ email: to }],
          subject: sujet,
          textContent: texte,
          ...(html ? { htmlContent: html } : {}),
        },
        { headers: this.headers() },
      );
      return true;
    } catch (error: any) {
      this.logger.error(`Échec envoi email à ${to}: ${error?.response?.data?.message || error?.message}`);
      return false;
    }
  }

  async sendSms(to: string, texte: string, nomExpediteur?: string) {
    if (!this.isConfigured) return false;
    try {
      await axios.post(
        `${BREVO_API}/transactionalSMS/sms`,
        {
          sender: (nomExpediteur || this.configService.get<string>('brevo.smsSender'))!.slice(0, 11),
          recipient: to,
          content: texte,
          type: 'transactional',
        },
        { headers: this.headers() },
      );
      return true;
    } catch (error: any) {
      this.logger.error(`Échec envoi SMS à ${to}: ${error?.response?.data?.message || error?.message}`);
      return false;
    }
  }

  async sendWhatsapp(to: string, texte: string) {
    if (!this.isConfigured) return false;
    try {
      await axios.post(
        `${BREVO_API}/whatsapp/sendMessage`,
        { contactNumbers: [to], senderNumber: this.configService.get<string>('brevo.smsSender'), text: texte },
        { headers: this.headers() },
      );
      return true;
    } catch (error: any) {
      this.logger.error(`Échec envoi WhatsApp à ${to}: ${error?.response?.data?.message || error?.message}`);
      return false;
    }
  }
}
