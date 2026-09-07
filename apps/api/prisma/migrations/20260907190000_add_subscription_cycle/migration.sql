CREATE TYPE "CycleAbonnement" AS ENUM ('MENSUEL', 'ANNUEL', 'A_VIE');
ALTER TABLE "tenants" ADD COLUMN "subscriptionCycle" "CycleAbonnement" NOT NULL DEFAULT 'MENSUEL';
ALTER TABLE "tenants" ADD COLUMN "dernierRappelAbonnement" TIMESTAMP(3);
