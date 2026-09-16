-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "rappelsAbonnementEnvoyes" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
