-- Manquait sur la contrainte d'origine : supprimer une école bloquait sur
-- FK violation dès qu'un membre du personnel avait reçu une notification.
ALTER TABLE "notification_destinataires" DROP CONSTRAINT "notification_destinataires_userId_fkey";
ALTER TABLE "notification_destinataires" ADD CONSTRAINT "notification_destinataires_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
