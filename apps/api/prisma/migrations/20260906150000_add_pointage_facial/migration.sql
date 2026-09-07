-- CreateEnum
CREATE TYPE "MethodePointage" AS ENUM ('MANUEL', 'FACIAL', 'EMPREINTE', 'DISPOSITIF');

-- AlterTable
ALTER TABLE "presences"
  ADD COLUMN "heureArrivee" TIMESTAMP(3),
  ADD COLUMN "methode" "MethodePointage" NOT NULL DEFAULT 'MANUEL';

-- AlterTable
ALTER TABLE "presences_personnel"
  ADD COLUMN "heureArrivee" TIMESTAMP(3),
  ADD COLUMN "methode" "MethodePointage" NOT NULL DEFAULT 'MANUEL';

-- AlterTable
ALTER TABLE "eleves"
  ADD COLUMN "faceDescriptor" JSONB;
