-- Modules payants activables/désactivables par école (super admin).
ALTER TABLE "tenants" ADD COLUMN "modulesActifs" TEXT[] NOT NULL DEFAULT ARRAY['FINANCES', 'RH', 'PAIE', 'BIBLIOTHEQUE', 'TRANSPORT', 'AUTISME', 'MATERNELLE', 'COMMUNICATION', 'PARENT_PORTAL']::TEXT[];
