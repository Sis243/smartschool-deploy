"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Démarrage du seed SmartSchool ERP...');
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@smartschool.cd' },
        update: {},
        create: {
            email: 'superadmin@smartschool.cd',
            password: await bcrypt.hash('SmartSchool@2024', 12),
            firstName: 'Super',
            lastName: 'Admin',
            role: 'SUPER_ADMIN',
            isSuperAdmin: true,
        },
    });
    console.log('Super admin créé:', superAdmin.email);
    const bonDepart = await prisma.tenant.upsert({
        where: { slug: 'bondepart' },
        update: {},
        create: {
            name: 'École Bon Départ',
            slug: 'bondepart',
            email: 'info@bondepart.cd',
            phone: '+243 99 000 0001',
            address: 'Avenue Kabinda, Kinshasa',
            schoolType: 'PRIMAIRE',
            subscriptionPlan: 'PREMIUM',
        },
    });
    await prisma.user.upsert({
        where: { email: 'admin@bondepart.cd' },
        update: {},
        create: {
            tenantId: bonDepart.id,
            email: 'admin@bondepart.cd',
            password: await bcrypt.hash('Admin@2024', 12),
            firstName: 'Jean-Pierre',
            lastName: 'Mukendi',
            role: 'ADMIN',
        },
    });
    const enseignant = await prisma.user.upsert({
        where: { email: 'prof.kabila@bondepart.cd' },
        update: {},
        create: {
            tenantId: bonDepart.id,
            email: 'prof.kabila@bondepart.cd',
            password: await bcrypt.hash('Prof@2024', 12),
            firstName: 'Marie',
            lastName: 'Kabila',
            role: 'ENSEIGNANT',
        },
    });
    const anneeScolaire = await prisma.anneeScolaire.create({
        data: {
            tenantId: bonDepart.id,
            libelle: '2025-2026',
            dateDebut: new Date('2025-09-01'),
            dateFin: new Date('2026-06-30'),
            isActive: true,
        },
    });
    const periode1 = await prisma.periode.create({
        data: {
            tenantId: bonDepart.id,
            anneeScolaireId: anneeScolaire.id,
            libelle: '1er Trimestre',
            dateDebut: new Date('2025-09-01'),
            dateFin: new Date('2025-11-30'),
            isActive: true,
            ordre: 1,
        },
    });
    const cp = await prisma.classe.create({
        data: {
            tenantId: bonDepart.id,
            anneeScolaireId: anneeScolaire.id,
            nom: 'CP A',
            niveau: 'CP',
            section: 'A',
            effectifMax: 30,
            titulaireId: enseignant.id,
        },
    });
    await prisma.classe.create({
        data: {
            tenantId: bonDepart.id,
            anneeScolaireId: anneeScolaire.id,
            nom: 'CE1 B',
            niveau: 'CE1',
            section: 'B',
            effectifMax: 28,
        },
    });
    const francais = await prisma.matiere.create({
        data: { tenantId: bonDepart.id, nom: 'Français', code: 'FR', coefficient: 3 },
    });
    const maths = await prisma.matiere.create({
        data: { tenantId: bonDepart.id, nom: 'Mathématiques', code: 'MATH', coefficient: 3 },
    });
    const eveil = await prisma.matiere.create({
        data: { tenantId: bonDepart.id, nom: 'Éveil scientifique', code: 'EVS', coefficient: 2 },
    });
    const religion = await prisma.matiere.create({
        data: { tenantId: bonDepart.id, nom: 'Religion', code: 'REL', coefficient: 1 },
    });
    const parent1 = await prisma.parent.create({
        data: {
            tenantId: bonDepart.id,
            nom: 'Mutamba',
            prenom: 'Bienvenu',
            telephone: '+243 81 234 5678',
            email: 'bienvenu.mutamba@gmail.com',
        },
    });
    const eleve1 = await prisma.eleve.create({
        data: {
            tenantId: bonDepart.id,
            matricule: 'SS-2025-0001',
            nom: 'Mutamba',
            prenom: 'Amani',
            dateNaissance: new Date('2018-03-15'),
            genre: 'M',
            classeId: cp.id,
            parentId: parent1.id,
        },
    });
    const parent2 = await prisma.parent.create({
        data: {
            tenantId: bonDepart.id,
            nom: 'Kabila',
            prenom: 'Grace',
            telephone: '+243 99 876 5432',
        },
    });
    const eleve2 = await prisma.eleve.create({
        data: {
            tenantId: bonDepart.id,
            matricule: 'SS-2025-0002',
            nom: 'Kabila',
            prenom: 'Espoir',
            dateNaissance: new Date('2017-07-22'),
            genre: 'F',
            classeId: cp.id,
            parentId: parent2.id,
        },
    });
    await prisma.note.createMany({
        data: [
            { tenantId: bonDepart.id, eleveId: eleve1.id, matiereId: francais.id, periodeId: periode1.id, valeur: 78 },
            { tenantId: bonDepart.id, eleveId: eleve1.id, matiereId: maths.id, periodeId: periode1.id, valeur: 85 },
            { tenantId: bonDepart.id, eleveId: eleve1.id, matiereId: eveil.id, periodeId: periode1.id, valeur: 72 },
            { tenantId: bonDepart.id, eleveId: eleve1.id, matiereId: religion.id, periodeId: periode1.id, valeur: 90 },
            { tenantId: bonDepart.id, eleveId: eleve2.id, matiereId: francais.id, periodeId: periode1.id, valeur: 91 },
            { tenantId: bonDepart.id, eleveId: eleve2.id, matiereId: maths.id, periodeId: periode1.id, valeur: 88 },
            { tenantId: bonDepart.id, eleveId: eleve2.id, matiereId: eveil.id, periodeId: periode1.id, valeur: 95 },
            { tenantId: bonDepart.id, eleveId: eleve2.id, matiereId: religion.id, periodeId: periode1.id, valeur: 92 },
        ],
    });
    const facture1 = await prisma.facture.create({
        data: {
            tenantId: bonDepart.id,
            eleveId: eleve1.id,
            type: 'MINERVAL',
            libelle: 'Minerval 1er trimestre 2025-2026',
            montant: 150000,
            montantPaye: 150000,
            montantDu: 0,
            statut: 'PAYE',
        },
    });
    await prisma.paiement.create({
        data: {
            tenantId: bonDepart.id,
            factureId: facture1.id,
            eleveId: eleve1.id,
            montant: 150000,
            modePaiement: 'MOBILE_MONEY',
            reference: 'MM-2025-001',
            statut: 'PAYE',
            recu: 'REC-001',
        },
    });
    const autismHope = await prisma.tenant.upsert({
        where: { slug: 'autismhope' },
        update: {},
        create: {
            name: 'Autism Hope Center',
            slug: 'autismhope',
            email: 'info@autismhope.cd',
            phone: '+243 99 000 0002',
            address: 'Avenue de la Paix, Kinshasa',
            schoolType: 'SPECIALISE',
            subscriptionPlan: 'ENTERPRISE',
        },
    });
    await prisma.user.upsert({
        where: { email: 'admin@autismhope.cd' },
        update: {},
        create: {
            tenantId: autismHope.id,
            email: 'admin@autismhope.cd',
            password: await bcrypt.hash('Admin@2024', 12),
            firstName: 'Directeur',
            lastName: 'Autisme',
            role: 'ADMIN',
        },
    });
    console.log('Seed terminé avec succès !');
    console.log('');
    console.log('Comptes créés:');
    console.log('  Super Admin: superadmin@smartschool.cd / SmartSchool@2024');
    console.log('  Admin Bon Départ: admin@bondepart.cd / Admin@2024');
    console.log('  Prof: prof.kabila@bondepart.cd / Prof@2024');
    console.log('  Admin Autism Hope: admin@autismhope.cd / Admin@2024');
}
main()
    .catch((e) => {
    console.error('Erreur seed:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map