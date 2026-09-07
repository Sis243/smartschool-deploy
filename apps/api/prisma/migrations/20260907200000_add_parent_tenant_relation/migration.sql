-- Parent.tenantId n'avait pas de contrainte FK ni de relation Prisma nommée,
-- nécessaire pour naviguer Parent -> Tenant (utilisé pour vérifier l'état de
-- l'abonnement de l'école à la connexion d'un parent).
ALTER TABLE "parents" ADD CONSTRAINT "parents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
