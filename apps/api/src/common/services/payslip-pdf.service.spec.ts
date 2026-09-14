import { PayslipPdfService, FichePaieAvecDetails } from './payslip-pdf.service';

describe('PayslipPdfService', () => {
  const service = new PayslipPdfService();
  const tenant = { name: 'École Test', address: 'Kinshasa', phone: null };

  const fiche: FichePaieAvecDetails = {
    id: 'fiche_1',
    periode: '2026-05',
    salaireBase: 246635,
    joursAbsence: 1,
    joursMaladie: null,
    statut: 'VALIDEE',
    lignes: [
      { type: 'PRIME', libelle: 'Prime de transport', montant: 150000 },
      { type: 'DEDUCTION', libelle: 'IPR', montant: 43605 },
    ],
    user: { firstName: 'Fanny', lastName: 'Kisimba', role: 'ENSEIGNANT', poste: 'Ed.Mat' },
  };

  it('génère un PDF valide (en-tête %PDF) pour une fiche individuelle', async () => {
    const buffer = await service.genererFichePdf(tenant, fiche);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('génère un PDF multi-pages (une page par fiche) pour un lot', async () => {
    const buffer = await service.genererLotPdf(tenant, [fiche, { ...fiche, id: 'fiche_2', user: { ...fiche.user, lastName: 'Mbala' } }]);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    // Un PDF multi-pages référence plusieurs objets /Page — au moins 2 ici.
    const nbPages = (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(nbPages).toBe(2);
  });
});
