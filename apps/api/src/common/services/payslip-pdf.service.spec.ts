import { inflateSync } from 'zlib';
import { PayslipPdfService, FichePaieAvecDetails } from './payslip-pdf.service';

// Décompresse les flux de contenu du PDF (FlateDecode) et vérifie qu'un texte
// y apparaît réellement — un simple header "%PDF" valide n'aurait pas suffi à
// détecter le bug où les montants étaient dessinés hors de la page visible
// (page A5 plus étroite qu'une marge droite pensée pour du A4).
function extraireTexteBrut(pdf: Buffer): string {
  const contenu = pdf.toString('latin1');
  const blocs: string[] = [];
  const regex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(contenu))) {
    try {
      blocs.push(inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'));
    } catch {
      // Pas un flux compressé (ex: police intégrée) — ignoré.
    }
  }
  const flux = blocs.join('\n');
  // pdfkit écrit le texte des opérateurs Tj/TJ en chaînes hexadécimales
  // (<4e4554...>) plutôt qu'en ASCII littéral entre parenthèses — chaque
  // paire d'octets correspond directement à un caractère WinAnsi/Latin-1.
  return flux.replace(/<([0-9a-fA-F]+)>/g, (_, hex: string) => Buffer.from(hex, 'hex').toString('latin1'));
}

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

  it('dessine réellement les montants dans les limites de la page (pas hors-cadre)', async () => {
    const buffer = await service.genererFichePdf(tenant, fiche);
    const texte = extraireTexteBrut(buffer);
    // Régression : sur une page A5, une marge droite calquée sur du A4
    // plaçait ces montants hors de la zone visible — le PDF restait valide
    // mais s'ouvrait avec des lignes vides. On vérifie que le texte des
    // montants (pas seulement les libellés) apparaît bien dans le contenu.
    expect(texte).toContain('246 635'); // salaire de base
    expect(texte).toContain('150 000'); // prime de transport
    expect(texte).toContain('43 605');  // déduction IPR
    expect(texte).toContain('NET');
  });

  it('génère un PDF multi-pages (une page par fiche) pour un lot', async () => {
    const buffer = await service.genererLotPdf(tenant, [fiche, { ...fiche, id: 'fiche_2', user: { ...fiche.user, lastName: 'Mbala' } }]);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    // Un PDF multi-pages référence plusieurs objets /Page — au moins 2 ici.
    const nbPages = (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(nbPages).toBe(2);
  });
});
