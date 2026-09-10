-- AlterTable
ALTER TABLE "demandes_inscription"
  ADD COLUMN "photoUrl" TEXT,
  ADD COLUMN "ecolePrecedente" TEXT,
  ADD COLUMN "besoinsParticuliers" TEXT,
  ADD COLUMN "contactUrgenceNom" TEXT,
  ADD COLUMN "contactUrgenceTelephone" TEXT;

-- AlterTable
ALTER TABLE "eleves"
  ADD COLUMN "ecolePrecedente" TEXT,
  ADD COLUMN "besoinsParticuliers" TEXT,
  ADD COLUMN "contactUrgenceNom" TEXT,
  ADD COLUMN "contactUrgenceTelephone" TEXT;
