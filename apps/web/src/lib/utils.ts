import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, fmt = 'dd MMM yyyy') {
  return format(new Date(date), fmt, { locale: fr });
}

export function formatMontant(montant: number, devise = 'FC') {
  return `${new Intl.NumberFormat('fr-CD').format(montant)} ${devise}`;
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getStatutColor(statut: string): string {
  const colors: Record<string, string> = {
    PAYE: 'text-green-700 bg-green-100',
    EN_ATTENTE: 'text-yellow-700 bg-yellow-100',
    PARTIEL: 'text-blue-700 bg-blue-100',
    ANNULE: 'text-red-700 bg-red-100',
    PRESENT: 'text-green-700 bg-green-100',
    ABSENT: 'text-red-700 bg-red-100',
    RETARD: 'text-yellow-700 bg-yellow-100',
    EXCUSE: 'text-gray-700 bg-gray-100',
  };
  return colors[statut] || 'text-gray-700 bg-gray-100';
}
