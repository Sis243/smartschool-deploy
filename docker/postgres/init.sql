-- Initialisation de la base de données SmartSchool ERP
-- Ce script s'exécute au premier démarrage du container PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Pour la recherche full-text

-- Index pour améliorer les performances des requêtes multi-tenant
-- (Ces index seront créés automatiquement par Prisma migrate,
--  mais on peut en ajouter des personnalisés ici après)
