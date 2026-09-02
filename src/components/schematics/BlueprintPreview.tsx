import { gearPath, ringPath } from "@/components/ui/Gear";
import { hashString, mulberry32 } from "@/lib/utils";

const W = 400;
const H = 225;

/**
 * Generierte Blaupausen-Vorschau als Platzhalter für fehlende Screenshots.
 * Deterministisch pro `seed`, damit jede Schematic ihr eigenes "Bild" behält.
 */
export function BlueprintPreview({ seed, label, className }: { seed: string; label?: string; className?: string }) {
  const rnd = mulberry32(hashString(seed));
  const id = `bp-${hashString(seed).toString(36)}`;

  // Gehäuse / Rahmen
  const boxes = Array.from({ length: 2 + Math.floor(rnd() * 3) }, () => {
    const w = 60 + rnd() * 120;
    const h = 40 + rnd() * 90;
    return { x: 30 + rnd() * (W - 60 - w), y: 25 + rnd() * (H - 60 - h), w, h };
  });

  // Zahnräder
  const gears = Array.from({ length: 2 + Math.floor(rnd() * 3) }, () => {
    const r = 14 + rnd() * 22;
    return {
      cx: 40 + rnd() * (W - 80),
      cy: 35 + rnd() * (H - 70),
      r,
      teeth: 8 + Math.floor(rnd() * 8),
      rot: rnd() * 360,
    };
  });

  // Wellen zwischen Zahnrädern
  const shafts = gears.slice(1).map((g, i) => ({ x1: gears[i].cx, y1: gears[i].cy, x2: g.cx, y2: g.cy }));

  const dims = { x: boxes[0].x, y: boxes[0].y + boxes[0].h + 12, w: boxes[0].w };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={label ?? "Blaupause"}>
      <defs>
        <pattern id={`${id}-grid`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke="rgba(124,230,246,0.10)" strokeWidth="0.5" />
        </pattern>
        <pattern id={`${id}-grid-lg`} width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0H0V50" fill="none" stroke="rgba(124,230,246,0.18)" strokeWidth="0.8" />
        </pattern>
        <radialGradient id={`${id}-vignette`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0" stopColor="#0d3540" />
          <stop offset="1" stopColor="#061c23" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#${id}-vignette)`} />
      <rect width={W} height={H} fill={`url(#${id}-grid)`} />
      <rect width={W} height={H} fill={`url(#${id}-grid-lg)`} />

      {/* Rahmen */}
      <rect x="8" y="8" width={W - 16} height={H - 16} fill="none" stroke="rgba(124,230,246,0.35)" strokeWidth="1" strokeDasharray="6 4" />

      {boxes.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="rgba(61,211,234,0.06)" stroke="#7ce6f6" strokeWidth="1.2" />
          <rect x={b.x + 6} y={b.y + 6} width={b.w - 12} height={b.h - 12} fill="none" stroke="rgba(124,230,246,0.4)" strokeWidth="0.6" strokeDasharray="3 3" />
        </g>
      ))}

      {shafts.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#d9a83f" strokeWidth="2.5" strokeOpacity="0.7" strokeLinecap="round" />
      ))}

      {gears.map((g, i) => (
        <g key={i} transform={`translate(${g.cx} ${g.cy}) rotate(${g.rot}) scale(${g.r / 48})`}>
          <path
            d={`${gearPath(g.teeth, 48, 40, 0, 0)} ${ringPath(0, 0, 14)}`}
            fill="rgba(217,168,63,0.18)"
            stroke="#e6c15f"
            strokeWidth={1.4 * (48 / g.r)}
            fillRule="evenodd"
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* Bemaßung */}
      <g stroke="#7ce6f6" strokeWidth="0.8" fill="#7ce6f6" fontFamily="ui-monospace, monospace" fontSize="8">
        <line x1={dims.x} y1={dims.y} x2={dims.x + dims.w} y2={dims.y} />
        <line x1={dims.x} y1={dims.y - 4} x2={dims.x} y2={dims.y + 4} />
        <line x1={dims.x + dims.w} y1={dims.y - 4} x2={dims.x + dims.w} y2={dims.y + 4} />
        <text x={dims.x + dims.w / 2} y={dims.y + 11} textAnchor="middle" stroke="none">
          {Math.round(dims.w / 10)} m
        </text>
      </g>

      {/* Titelblock */}
      <g fontFamily="ui-monospace, monospace" fill="#b3f1fb">
        <rect x={W - 118} y={H - 34} width="110" height="26" fill="rgba(6,34,43,0.85)" stroke="rgba(124,230,246,0.5)" strokeWidth="0.8" />
        <text x={W - 112} y={H - 23} fontSize="6.5" fillOpacity="0.7">
          VIP CRAFT 4 · SCHEMATIC
        </text>
        <text x={W - 112} y={H - 13} fontSize="7.5" fontWeight="bold">
          #{hashString(seed).toString(16).slice(0, 6).toUpperCase()}
        </text>
      </g>
    </svg>
  );
}
