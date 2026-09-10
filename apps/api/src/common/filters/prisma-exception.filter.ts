import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

// Sans ce filtre, toute erreur Prisma (mauvais type de champ, contrainte
// unique violée, référence introuvable...) remonte comme un 500 générique
// "Internal server error" — c'est exactement la cause de la plupart des
// bugs "Erreur lors de..." trouvés cette session (un champ renommé côté
// frontend, une date incomplète, un id du mauvais type...). Ce filtre les
// transforme en réponses claires et catégorisées, et fait la même chose
// pour les erreurs qu'un DTO manquant laisserait autrement passer en 500.
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Données invalides';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          const champs = (exception.meta?.target as string[] | undefined)?.join(', ') ?? 'valeur';
          status = HttpStatus.CONFLICT;
          message = `Cette valeur existe déjà (${champs}) — vérifiez qu'il n'y a pas de doublon.`;
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Élément introuvable ou déjà supprimé.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Référence invalide — un élément lié n\'existe pas.';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Données invalides — vérifiez les informations saisies.';
      }
    } else {
      // PrismaClientValidationError : type de champ incorrect, champ inconnu,
      // date incomplète... (ex. "capacite" au lieu de "effectifMax", ou une
      // date sans les secondes) — toujours une erreur de saisie/format, jamais
      // une faute du serveur, donc 400 plutôt que 500.
      message = 'Certaines informations envoyées sont dans un format inattendu — vérifiez le formulaire.';
    }

    this.logger.error(`${request.method} ${request.url} - ${status} - ${exception.message.split('\n').slice(-2).join(' ')}`);

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
