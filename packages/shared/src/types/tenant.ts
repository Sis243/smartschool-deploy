export type SchoolType = 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE' | 'TECHNIQUE' | 'SPECIALISE' | 'THERAPEUTIQUE';
export type SubscriptionPlan = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  schoolType: SchoolType;
  subscriptionPlan: SubscriptionPlan;
  subscriptionEnd?: Date;
  isActive: boolean;
  createdAt: Date;
}
