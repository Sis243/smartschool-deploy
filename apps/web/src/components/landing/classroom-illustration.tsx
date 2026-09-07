// Scène de salle de classe animée (SVG + CSS) : enseignant au tableau,
// élèves à leur pupitre, une main levée, une horloge qui tourne — un
// environnement structuré et scolaire plutôt qu'une simple récréation.
export function ClassroomIllustration() {
  return (
    <div className="relative w-full max-w-3xl mx-auto aspect-[16/9] overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-amber-50/5 via-slate-900 to-slate-950">
      <svg viewBox="0 0 800 450" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>{`
            @keyframes cl-write { 0% { stroke-dashoffset: 240; opacity: 0; } 8% { opacity: 1; } 55% { stroke-dashoffset: 0; opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; stroke-dashoffset: 0; } }
            @keyframes cl-chalk { 0% { transform: translate(70px, -6px); opacity: 0; } 8% { opacity: 1; } 55% { transform: translate(310px, -6px); opacity: 1; } 60% { opacity: 0; } 100% { opacity: 0; transform: translate(310px, -6px); } }
            @keyframes cl-arm { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(10deg); } }
            @keyframes cl-hand { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(-4deg); } }
            @keyframes cl-tick { to { transform: rotate(360deg); } }
            @keyframes cl-blink { 0%, 90%, 100% { opacity: 1; } 95% { opacity: 0.3; } }
            .cl-writing { stroke-dasharray: 240; animation: cl-write 6s ease-in-out infinite; }
            .cl-chalk { animation: cl-chalk 6s ease-in-out infinite; }
            .cl-arm { transform-origin: 4px 4px; animation: cl-arm 6s ease-in-out infinite; }
            .cl-hand-raised { transform-origin: 50% 100%; animation: cl-hand 1.8s ease-in-out infinite; }
            .cl-clock-hand { transform-origin: 0px 0px; animation: cl-tick 12s linear infinite; }
            .cl-eye { animation: cl-blink 5s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* Mur + sol */}
        <rect x="0" y="0" width="800" height="330" fill="#3f3226" opacity="0.55" />
        <rect x="0" y="330" width="800" height="120" fill="#5c4632" opacity="0.5" />
        <rect x="0" y="326" width="800" height="6" fill="#78350f" opacity="0.6" />

        {/* Fenêtre avec lumière du jour */}
        <g opacity="0.85">
          <rect x="620" y="40" width="130" height="150" rx="4" fill="#7dd3fc" opacity="0.25" />
          <rect x="620" y="40" width="130" height="150" rx="4" fill="none" stroke="#a16207" strokeWidth="6" />
          <line x1="685" y1="40" x2="685" y2="190" stroke="#a16207" strokeWidth="4" />
          <line x1="620" y1="115" x2="750" y2="115" stroke="#a16207" strokeWidth="4" />
        </g>

        {/* Horloge murale */}
        <g transform="translate(555,75)">
          <circle r="26" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
          <line x1="0" y1="0" x2="0" y2="-15" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" className="cl-clock-hand" />
          <line x1="0" y1="0" x2="12" y2="0" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" transform="rotate(90)" />
          <circle r="2" fill="#1e293b" />
        </g>

        {/* Tableau noir */}
        <rect x="60" y="45" width="400" height="170" rx="6" fill="#0f3d2e" stroke="#78350f" strokeWidth="10" />
        {/* Texte "écrit" au tableau, animé comme si on l'écrivait */}
        <path className="cl-writing" d="M 90 90 h 90 M 90 110 h 130 M 90 130 h 70 M 90 150 h 100" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85" />
        <text x="90" y="195" fill="#facc15" fontSize="20" fontFamily="sans-serif" fontWeight="700" opacity="0.9">SmartSchool ERP</text>

        {/* Enseignant devant le tableau */}
        <g transform="translate(500,235)">
          <circle cx="0" cy="-95" r="16" fill="#c68642" />
          <path d="M -22 -70 Q 0 -95 22 -70 L 22 -10 Q 0 5 -22 -10 Z" fill="#1d4ed8" />
          <rect x="-10" y="-8" width="8" height="34" rx="3" fill="#1e293b" />
          <rect x="2" y="-8" width="8" height="34" rx="3" fill="#0f172a" />
          {/* bras qui écrit, craie qui se déplace */}
          <g className="cl-arm">
            <rect x="0" y="-60" width="46" height="9" rx="4" fill="#c68642" />
          </g>
          <circle className="cl-chalk" cx="0" cy="-56" r="3" fill="#f8fafc" />
        </g>

        {/* Rangées de pupitres avec élèves */}
        {[
          { x: 110, main: false },
          { x: 240, main: true },
          { x: 370, main: false },
        ].map((eleve, i) => (
          <g key={i} transform={`translate(${eleve.x},340)`}>
            {/* pupitre */}
            <rect x="-38" y="10" width="76" height="8" rx="2" fill="#78350f" />
            <rect x="-30" y="18" width="6" height="28" fill="#5c4632" />
            <rect x="24" y="18" width="6" height="28" fill="#5c4632" />
            {/* élève assis */}
            <circle cx="0" cy="-28" r="15" fill="#e0ac69" />
            <circle className="cl-eye" cx="-5" cy="-30" r="1.6" fill="#1e293b" />
            <circle className="cl-eye" cx="5" cy="-30" r="1.6" fill="#1e293b" />
            <path d="M -3 -22 Q 0 -19 3 -22" stroke="#1e293b" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M -18 -10 Q 0 -26 18 -10 L 18 10 Q 0 18 -18 10 Z" fill={i === 1 ? '#f97316' : i === 0 ? '#22c55e' : '#a855f7'} />
            {eleve.main && (
              <g className="cl-hand-raised">
                <rect x="14" y="-24" width="7" height="26" rx="3" fill="#f97316" />
                <circle cx="17.5" cy="-26" r="5" fill="#e0ac69" />
              </g>
            )}
            {!eleve.main && (
              <>
                <rect x="-24" y="-8" width="7" height="18" rx="3" fill={i === 0 ? '#22c55e' : '#a855f7'} />
                <rect x="17" y="-8" width="7" height="18" rx="3" fill={i === 0 ? '#22c55e' : '#a855f7'} />
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
