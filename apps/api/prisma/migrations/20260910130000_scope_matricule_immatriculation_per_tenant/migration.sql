-- Eleve.matricule et Bus.immatriculation etaient uniques globalement au lieu
-- de par ecole - deux etablissements differents ne pouvaient pas avoir le
-- meme matricule ou la meme plaque, une collision de plus en plus probable
-- a mesure que la plateforme grandit.
DROP INDEX "eleves_matricule_key";
CREATE UNIQUE INDEX "eleves_tenantId_matricule_key" ON "eleves"("tenantId", "matricule");
DROP INDEX "bus_immatriculation_key";
CREATE UNIQUE INDEX "bus_tenantId_immatriculation_key" ON "bus"("tenantId", "immatriculation");
