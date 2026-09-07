-- GENERALE devient la valeur par défaut : la spécialisation d'une école se
-- fait désormais via Tenant.modulesActifs, pas via ce type figé.
ALTER TYPE "SchoolType" ADD VALUE IF NOT EXISTS 'GENERALE' BEFORE 'MATERNELLE';
