-- Le module Communication ne pouvait cibler que le personnel (userId NOT
-- NULL, FK vers users) alors que l'interface propose "Parents" par défaut —
-- chaque envoi vers des parents renvoyait 404 "destinataires introuvables".
ALTER TABLE "notification_destinataires" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "notification_destinataires" ADD COLUMN "parentId" TEXT;
ALTER TABLE "notification_destinataires" ADD CONSTRAINT "notification_destinataires_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
