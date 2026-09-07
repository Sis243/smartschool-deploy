'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, DollarSign,
  UserCog, MessageSquare, Bus, Library, Heart, Brain, ClipboardList, Settings, ChevronLeft, ChevronRight, BarChart2,
} from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/eleves', label: 'Élèves', icon: Users },
  { href: '/academique', label: 'Académique', icon: GraduationCap },
  { href: '/notes', label: 'Notes & Bulletins', icon: BookOpen },
  // Modules entièrement réservés à certains rôles côté API — masqués aux
  // autres pour éviter une page dont chaque appel échoue en 403.
  { href: '/finances', label: 'Finances', icon: DollarSign, requires: 'canVoirFinances' as const },
  { href: '/rh', label: 'Ressources Humaines', icon: UserCog },
  { href: '/communication', label: 'Communication', icon: MessageSquare },
  { href: '/transport', label: 'Transport', icon: Bus },
  { href: '/bibliotheque', label: 'Bibliothèque', icon: Library },
  { href: '/maternelle', label: 'Maternelle', icon: Heart },
  { href: '/autisme', label: 'Module Autisme', icon: Brain, requires: 'canVoirAutisme' as const },
  { href: '/inscriptions', label: 'Inscriptions', icon: ClipboardList, requires: 'canVoirInscriptions' as const },
  { href: '/rapports', label: 'Rapports & Exports', icon: BarChart2, requires: 'canVoirFinances' as const },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const permissions = usePermissions();
  const visibleItems = navItems.filter((item) => !item.requires || permissions[item.requires]);

  return (
    <aside
      className={cn(
        'flex flex-col bg-slate-900 text-slate-100 transition-all duration-300 relative shrink-0',
        collapsed ? 'w-[60px]' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-4', collapsed ? 'justify-center' : '')}>
        <div className="flex-shrink-0 w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight text-white">SmartSchool</p>
            <p className="text-slate-400 text-xs">ERP SaaS</p>
          </div>
        )}
      </div>

      <Separator className="bg-slate-700/60" />

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-hide space-y-0.5 px-2">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const link = (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={href} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      <Separator className="bg-slate-700/60" />

      {/* Footer */}
      <div className={cn('p-3 text-xs text-slate-600', collapsed ? 'text-center' : '')}>
        {!collapsed && 'Smart IT Solution © 2026'}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center hover:bg-slate-600 border border-slate-600 text-slate-300 shadow-md z-10"
        aria-label={collapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
