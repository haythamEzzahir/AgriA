import React from 'react';

const LOCATIONS = [
  { top: '45%', left: '48%', label: 'Marrakech-Safi' },
  { top: '36%', left: '54%', label: 'Fes-Meknes' },
  { top: '39%', left: '45%', label: 'Casablanca' },
  { top: '57%', left: '39%', label: 'Souss-Massa' },
  { top: '28%', left: '50%', label: 'Tanger-Tetouan' },
  { top: '62%', left: '50%', label: 'Draa-Tafilalet' },
  { top: '42%', left: '58%', label: 'Beni Mellal' },
  { top: '37%', left: '66%', label: 'Oriental' },
];

export default function GlobeMap() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-950">
      <div className="absolute inset-6 rounded-full border border-emerald-300/20 bg-[radial-gradient(circle_at_35%_30%,#6ee7b7_0%,#059669_20%,#064e3b_42%,#020617_72%)] shadow-2xl shadow-emerald-900/40">
        <div className="absolute inset-[13%] rounded-full border border-white/10" />
        <div className="absolute inset-[24%] rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" />
        <div className="absolute inset-0 rounded-full bg-[linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.18)_46%,transparent_58%)]" />
      </div>

      {LOCATIONS.map((location) => (
        <span
          key={location.label}
          title={location.label}
          className="absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(190,242,100,0.85)]"
          style={{ top: location.top, left: location.left }}
        />
      ))}

      <div className="absolute bottom-5 left-5 rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-emerald-100 backdrop-blur">
        Morocco farm network
      </div>
    </div>
  );
}
