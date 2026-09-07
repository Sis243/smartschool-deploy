-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REJETEE');

-- CreateTable
CREATE TABLE "demandes_inscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prenomEnfant" TEXT NOT NULL,
    "nomEnfant" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "lieuNaissance" TEXT,
    "genre" TEXT,
    "classeVisee" TEXT,
    "anneeScolaire" TEXT,
    "nomParent" TEXT NOT NULL,
    "prenomParent" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "adresse" TEXT,
    "lienFiliation" TEXT,
    "noteSecretaire" TEXT,
    "eleveCreId" TEXT,

    CONSTRAINT "demandes_inscription_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "demandes_inscription" ADD CONSTRAINT "demandes_inscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
