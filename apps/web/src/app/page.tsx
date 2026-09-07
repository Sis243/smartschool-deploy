import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap, Users, BookOpen, DollarSign, UserCog, MessageSquare, Bus, Library,
  Brain, Heart, ScanFace, ShieldCheck, Smartphone, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SchoolyardIllustration } from '@/components/landing/schoolyard-illustration';

// Pas d'auto-inscription publique : chaque établissement est créé par la
// super administration après contact commercial (voir /super-admin).
const WHATSAPP_CONTACT = 'https://wa.me/243979710633';

export const metadata: Metadata = {
  title: 'SmartSchool ERP — Plateforme de gestion scolaire',
  description: "Gestion complète d'établissements scolaires : élèves, finances, notes, présences par reconnaissance faciale, portail parent et module spécialisé pour enfants à besoins particuliers.",
};

const MODULES = [
  { icon: Users, title: 'Élèves & inscriptions', desc: "Dossiers élèves, inscription en ligne, dossier médical, historique complet." },
  { icon: BookOpen, title: 'Académique & notes', desc: 'Classes, matières, horaires, bulletins et rapports de classe automatisés.' },
  { icon: ScanFace, title: 'Présence par reconnaissance faciale', desc: "Pointage automatique à l'arrivée, sans carte ni badge, avec notification immédiate au parent." },
  { icon: DollarSign, title: 'Finances', desc: 'Facturation, paiements, preuves de paiement des parents, tableau de bord financier.' },
  { icon: UserCog, title: 'Ressources humaines', desc: 'Personnel, présences, rôles et permissions par fonction.' },
  { icon: MessageSquare, title: 'Communication', desc: 'SMS, e-mail et WhatsApp vers les parents et le personnel, en un clic.' },
  { icon: Bus, title: 'Transport scolaire', desc: 'Gestion de la flotte de bus, itinéraires et abonnements des élèves.' },
  { icon: Library, title: 'Bibliothèque', desc: 'Catalogue, emprunts et retours avec pénalités automatiques.' },
  { icon: Brain, title: 'Module spécialisé', desc: "Suivi comportemental, thérapies (orthophonie, psychomotricité, ABA) et routines visuelles pour les enfants autistes, trisomiques ou à besoins particuliers." },
  { icon: Heart, title: 'Maternelle', desc: 'Suivi journalier adapté aux tout-petits : repas, sieste, activités.' },
  { icon: Smartphone, title: 'Portail parent (application mobile)', desc: "Application installable sur le téléphone : factures, notifications et suivi de la scolarité en temps réel." },
  { icon: ShieldCheck, title: 'Sécurité par rôle', desc: 'Chaque membre du personnel voit uniquement ce qui le concerne — données cloisonnées par établissement.' },
];

const PUBLICS = [
  { titre: 'Écoles classiques', desc: 'Maternelle, primaire, secondaire, technique — un seul outil pour toute la gestion administrative.' },
  { titre: 'Écoles spécialisées', desc: "Structures accueillant des enfants autistes, trisomiques ou en situation de handicap : suivi thérapeutique et comportemental dédié." },
  { titre: 'Réseaux multi-établissements', desc: "Chaque école dispose de son propre espace, totalement indépendant, sous une même plateforme." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <header className="border-b border-slate-800/80 sticky top-0 z-20 bg-slate-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">SmartSchool ERP</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">Se connecter</Link>
            <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-500">
              <Link href={WHATSAPP_CONTACT} target="_blank" rel="noopener noreferrer">Nous contacter</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Plateforme multi-établissements
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          La gestion scolaire, <span className="text-blue-500">complète et centralisée</span>
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          Élèves, notes, finances, présences, communication avec les parents — tout ce dont votre établissement
          a besoin, dans une seule plateforme pensée aussi pour les écoles accueillant des enfants à besoins particuliers.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-500 gap-2 text-base h-12 px-8">
            <Link href={WHATSAPP_CONTACT} target="_blank" rel="noopener noreferrer">Nous contacter sur WhatsApp<ArrowRight className="w-4 h-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 h-12 px-8 text-base">
            <Link href="/login">J'ai déjà un compte</Link>
          </Button>
        </div>

        <div className="mt-14">
          <SchoolyardIllustration />
        </div>
      </section>

      {/* Publics cibles */}
      <section className="border-t border-slate-800/80 bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">Conçu pour tous les établissements</h2>
          <p className="text-slate-400 text-center mt-2 max-w-xl mx-auto">
            Que votre école soit classique ou spécialisée, chaque module s'adapte à vos besoins.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
            {PUBLICS.map((p) => (
              <Card key={p.titre} className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-2">{p.titre}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">Tous les modules dont vous avez besoin</h2>
        <p className="text-slate-400 text-center mt-2 max-w-xl mx-auto">
          Une seule connexion, toute la gestion de votre école.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {MODULES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-6">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Prêt à digitaliser votre établissement ?</h2>
          <p className="text-slate-400 mt-3">Contactez-nous pour démarrer — nous configurons votre école pour vous.</p>
          <Button asChild size="lg" className="mt-8 bg-blue-600 hover:bg-blue-500 gap-2 text-base h-12 px-8">
            <Link href={WHATSAPP_CONTACT} target="_blank" rel="noopener noreferrer">Nous contacter sur WhatsApp<ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <GraduationCap className="w-4 h-4" />
            SmartSchool ERP
          </div>
          <p className="text-xs text-slate-500 text-center">
            © 2026 SmartSchool ERP — Créé par Smart IT Solution
          </p>
        </div>
      </footer>
    </div>
  );
}
