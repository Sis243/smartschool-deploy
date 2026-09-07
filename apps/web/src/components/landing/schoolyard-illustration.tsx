// Illustration plate animée (SVG + CSS) d'une cour d'école avec des enfants
// qui jouent — pas un "dessin animé" au sens propre (ça demanderait un vrai
// travail d'illustration/vidéo), mais une scène vivante en style flat design,
// courant sur les sites SaaS modernes.
export function SchoolyardIllustration() {
  return (
    <div className="relative w-full max-w-3xl mx-auto aspect-[16/7] overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-sky-900/40 via-slate-900 to-slate-950">
      <svg viewBox="0 0 800 350" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>{`
            @keyframes ss-drift-1 { from { transform: translateX(-60px); } to { transform: translateX(860px); } }
            @keyframes ss-drift-2 { from { transform: translateX(-100px); } to { transform: translateX(900px); } }
            @keyframes ss-swing { 0%, 100% { transform: rotate(-18deg); } 50% { transform: rotate(18deg); } }
            @keyframes ss-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-34px); } }
            @keyframes ss-ball-shadow { 0%, 100% { transform: scaleX(1); opacity: .35; } 50% { transform: scaleX(0.6); opacity: .15; } }
            @keyframes ss-run { 0% { transform: translateX(0); } 100% { transform: translateX(430px); } }
            @keyframes ss-legs { 0%, 100% { transform: rotate(18deg); } 50% { transform: rotate(-18deg); } }
            @keyframes ss-sun-pulse { 0%, 100% { opacity: .9; } 50% { opacity: 1; } }
            .ss-cloud-1 { animation: ss-drift-1 46s linear infinite; }
            .ss-cloud-2 { animation: ss-drift-2 60s linear infinite; animation-delay: -20s; }
            .ss-swing-group { transform-origin: 400px 78px; animation: ss-swing 2.6s ease-in-out infinite; }
            .ss-ball-group { animation: ss-bounce 1.1s ease-in-out infinite; }
            .ss-ball-shadow { animation: ss-ball-shadow 1.1s ease-in-out infinite; transform-origin: center; }
            .ss-runner { animation: ss-run 9s ease-in-out infinite alternate; }
            .ss-leg-front { transform-origin: 0px -18px; animation: ss-legs 0.5s ease-in-out infinite; }
            .ss-leg-back { transform-origin: 0px -18px; animation: ss-legs 0.5s ease-in-out infinite reverse; }
            .ss-sun { animation: ss-sun-pulse 4s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* Ciel + soleil */}
        <circle className="ss-sun" cx="700" cy="60" r="34" fill="#fbbf24" opacity="0.9" />

        {/* Nuages */}
        <g className="ss-cloud-1" fill="#e2e8f0" opacity="0.12">
          <ellipse cx="120" cy="70" rx="46" ry="18" />
          <ellipse cx="155" cy="62" rx="30" ry="14" />
        </g>
        <g className="ss-cloud-2" fill="#e2e8f0" opacity="0.09">
          <ellipse cx="500" cy="40" rx="38" ry="15" />
          <ellipse cx="530" cy="34" rx="24" ry="11" />
        </g>

        {/* École en arrière-plan */}
        <g opacity="0.5">
          <rect x="40" y="140" width="160" height="90" rx="4" fill="#1e293b" />
          <rect x="60" y="160" width="24" height="28" rx="2" fill="#334155" />
          <rect x="96" y="160" width="24" height="28" rx="2" fill="#334155" />
          <rect x="132" y="160" width="24" height="28" rx="2" fill="#334155" />
          <rect x="105" y="198" width="30" height="32" fill="#334155" />
          <polygon points="30,140 120,100 210,140" fill="#0f172a" />
        </g>

        {/* Sol */}
        <rect x="0" y="280" width="800" height="70" fill="#14532d" opacity="0.35" />
        <rect x="0" y="278" width="800" height="4" fill="#166534" opacity="0.5" />

        {/* Arbres */}
        <g opacity="0.7">
          <rect x="655" y="230" width="8" height="40" fill="#78350f" />
          <circle cx="659" cy="215" r="28" fill="#166534" />
          <rect x="30" y="245" width="7" height="34" fill="#78350f" />
          <circle cx="33" cy="232" r="22" fill="#15803d" />
        </g>

        {/* Balançoire avec enfant */}
        <g transform="translate(400,60)">
          <line x1="-70" y1="0" x2="70" y2="0" stroke="#475569" strokeWidth="6" />
          <line x1="-70" y1="0" x2="-70" y2="110" stroke="#475569" strokeWidth="6" />
          <line x1="70" y1="0" x2="70" y2="110" stroke="#475569" strokeWidth="6" />
          <g className="ss-swing-group">
            <line x1="0" y1="0" x2="-14" y2="90" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="0" y1="0" x2="14" y2="90" stroke="#94a3b8" strokeWidth="2.5" />
            <rect x="-20" y="88" width="40" height="8" rx="3" fill="#78350f" />
            {/* enfant assis */}
            <circle cx="0" cy="66" r="13" fill="#f4a261" />
            <path d="M -12 78 Q 0 100 12 78 L 12 92 Q 0 104 -12 92 Z" fill="#3b82f6" />
            <circle cx="-4" cy="63" r="2" fill="#1e293b" />
            <circle cx="4" cy="63" r="2" fill="#1e293b" />
            <path d="M -4 70 Q 0 73 4 70" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* Enfant qui court */}
        <g className="ss-runner" transform="translate(140,255)">
          <g className="ss-leg-back"><rect x="-3" y="-18" width="6" height="20" rx="3" fill="#334155" /></g>
          <g className="ss-leg-front"><rect x="-3" y="-18" width="6" height="20" rx="3" fill="#1e293b" /></g>
          <path d="M -9 -46 Q 0 -60 9 -46 L 9 -20 Q 0 -14 -9 -20 Z" fill="#ef4444" />
          <circle cx="0" cy="-56" r="10" fill="#e0ac69" />
          <rect x="-13" y="-42" width="8" height="4" rx="2" fill="#ef4444" transform="rotate(-30 -13 -42)" />
          <rect x="5" y="-42" width="8" height="4" rx="2" fill="#ef4444" transform="rotate(30 13 -42)" />
        </g>

        {/* Enfant qui joue au ballon */}
        <g transform="translate(600,300)">
          <ellipse className="ss-ball-shadow" cx="20" cy="4" rx="14" ry="4" fill="#000" />
          <g className="ss-ball-group">
            <circle cx="0" cy="-60" r="9" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
          </g>
          <path d="M -9 -46 Q 0 -58 9 -46 L 9 -20 Q 0 -14 -9 -20 Z" fill="#22c55e" />
          <circle cx="0" cy="-54" r="10" fill="#8d5524" />
          <rect x="-5" y="-20" width="5" height="18" rx="2" fill="#334155" />
          <rect x="2" y="-20" width="5" height="18" rx="2" fill="#1e293b" />
        </g>
      </svg>
    </div>
  );
}
