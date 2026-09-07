-- CreateEnum
CREATE TYPE "StatutFichePaie" AS ENUM ('BROUILLON', 'VALIDEE', 'PAYEE');

-- CreateEnum
CREATE TYPE "TypeLignePaie" AS ENUM ('PRIME', 'DEDUCTION');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "resetToken" TEXT, ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- CreateTable
CREATE TABLE "fiches_paie" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "salaireBase" DOUBLE PRECISION NOT NULL,
    "statut" "StatutFichePaie" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiches_paie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_paie" (
    "id" TEXT NOT NULL,
    "ficheId" TEXT NOT NULL,
    "type" "TypeLignePaie" NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "lignes_paie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiches_paie_userId_periode_key" ON "fiches_paie"("userId", "periode");

-- AddForeignKey
ALTER TABLE "fiches_paie" ADD CONSTRAINT "fiches_paie_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiches_paie" ADD CONSTRAINT "fiches_paie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_paie" ADD CONSTRAINT "lignes_paie_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "fiches_paie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
