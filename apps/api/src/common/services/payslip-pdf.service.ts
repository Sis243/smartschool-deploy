import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export interface FichePaieAvecDetails {
  id: string;
  periode: string; // "AAAA-MM"
  salaireBase: number;
  joursAbsence: number | null;
  joursMaladie: number | null;
  statut: string;
  lignes: { type: string; libelle: string; montant: number }[];
  user: { firstName: string; lastName: string; role: string; poste: string | null };
}

interface TenantInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
}

const formatMontant = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

@Injectable()
export class PayslipPdfService {
  // Dessine une fiche de paie sur une page du document déjà ouvert — permet
  // d'enchaîner plusieurs fiches dans un seul PDF (export "total" par période).
  private dessinerFiche(doc: PDFKit.PDFDocument, tenant: TenantInfo, fiche: FichePaieAvecDetails) {
    const [annee, moisNum] = fiche.periode.split('-');
    const mois = MOIS_FR[Number(moisNum) - 1] ?? fiche.periode;
    const primes = fiche.lignes.filter((l) => l.type === 'PRIME');
    const deductions = fiche.lignes.filter((l) => l.type === 'DEDUCTION');
    const totalPrimes = primes.reduce((s, l) => s + l.montant, 0);
    const totalDeductions = deductions.reduce((s, l) => s + l.montant, 0);
    const brut = fiche.salaireBase + totalPrimes;
    const net = brut - totalDeductions;

    const left = 50;
    const right = 545;
    let y = 50;

    doc.fontSize(16).font('Helvetica-Bold').text(tenant.name, left, y, { align: 'center', width: right - left });
    y += 22;
    if (tenant.address) {
      doc.fontSize(9).font('Helvetica').text(tenant.address, left, y, { align: 'center', width: right - left });
      y += 14;
    }
    doc.fontSize(13).font('Helvetica-Bold').text('FICHE DE PAIE', left, y, { align: 'center', width: right - left });
    y += 24;

    doc.moveTo(left, y).lineTo(right, y).stroke();
    y += 10;

    doc.fontSize(10).font('Helvetica');
    const infoLigne = (label: string, valeur: string, x: number) => {
      doc.font('Helvetica-Bold').text(`${label} :`, x, y, { continued: true }).font('Helvetica').text(` ${valeur}`);
    };
    infoLigne('Nom', fiche.user.lastName, left);
    infoLigne('Prénom', fiche.user.firstName, left + 250);
    y += 16;
    infoLigne('Fonction', fiche.user.poste || fiche.user.role, left);
    infoLigne('Mois', `${mois} ${annee}`, left + 250);
    y += 20;

    doc.moveTo(left, y).lineTo(right, y).stroke();
    y += 12;

    const ligneMontant = (label: string, montant: number, opts: { bold?: boolean } = {}) => {
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
      doc.text(label, left, y);
      doc.text(formatMontant(montant), left, y, { align: 'right', width: right - left });
      y += 16;
    };

    ligneMontant('Salaire de base', fiche.salaireBase);
    for (const p of primes) ligneMontant(p.libelle, p.montant);
    doc.moveTo(left, y).lineTo(right, y).stroke();
    y += 6;
    ligneMontant('Salaire Brut', brut, { bold: true });
    y += 6;

    if (deductions.length > 0) {
      doc.font('Helvetica-Bold').fontSize(9).text('RETENUES', left, y);
      y += 14;
      for (const d of deductions) ligneMontant(d.libelle, d.montant);
    }

    if (fiche.joursAbsence || fiche.joursMaladie) {
      doc.font('Helvetica-Bold').fontSize(9).text('ABSENCES', left, y);
      y += 14;
      if (fiche.joursAbsence) { doc.font('Helvetica').fontSize(10).text('Absence', left, y); doc.text(`${fiche.joursAbsence} jour(s)`, left, y, { align: 'right', width: right - left }); y += 16; }
      if (fiche.joursMaladie) { doc.font('Helvetica').fontSize(10).text('Maladie', left, y); doc.text(`${fiche.joursMaladie} jour(s)`, left, y, { align: 'right', width: right - left }); y += 16; }
    }

    doc.moveTo(left, y).lineTo(right, y).stroke();
    y += 8;
    doc.rect(left, y, right - left, 24).fillAndStroke('#f0f0f0', '#000000');
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text('NET À PAYER', left + 8, y + 6);
    doc.text(`${formatMontant(net)} FC`, left, y + 6, { align: 'right', width: right - left - 8 });
    y += 40;

    doc.fontSize(9).font('Helvetica').fillColor('#000000');
    doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, left, y);
    doc.text('Signature', right - 120, y, { width: 120, align: 'center' });
  }

  genererFichePdf(tenant: TenantInfo, fiche: FichePaieAvecDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      this.dessinerFiche(doc, tenant, fiche);
      doc.end();
    });
  }

  // Export "total" : une page par fiche, dans le même document — pour
  // imprimer/archiver la paie de tout le personnel d'une période en un clic.
  genererLotPdf(tenant: TenantInfo, fiches: FichePaieAvecDetails[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 0, autoFirstPage: false });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      for (const fiche of fiches) {
        doc.addPage();
        this.dessinerFiche(doc, tenant, fiche);
      }
      doc.end();
    });
  }
}
