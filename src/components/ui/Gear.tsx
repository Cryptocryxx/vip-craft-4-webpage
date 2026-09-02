import type { SVGProps } from "react";

/** Erzeugt den Pfad eines Zahnrads (Zentrum 50/50 im 100er-ViewBox). */
export function gearPath(teeth: number, outer: number, inner: number, cx = 50, cy = 50): string {
  const step = (Math.PI * 2) / teeth;
  const tipHalf = step * 0.19;
  const baseHalf = step * 0.31;
  const points: string[] = [];

  for (let i = 0; i < teeth; i++) {
    const angle = i * step - Math.PI / 2;
    const corners: Array<[number, number]> = [
      [angle - baseHalf, inner],
      [angle - tipHalf, outer],
      [angle + tipHalf, outer],
      [angle + baseHalf, inner],
    ];
    for (const [a, r] of corners) {
      points.push(`${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
    }
  }

  return `M${points.join(" L")} Z`;
}

/** Kreis als Pfad (für evenodd-Löcher). */
export function ringPath(cx: number, cy: number, r: number): string {
  return `M${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} Z`;
}

type GearProps = SVGProps<SVGSVGElement> & {
  teeth?: number;
  /** Lochgröße relativ zum Innenradius (0–1) */
  hole?: number;
  /** Speichen anzeigen */
  spokes?: boolean;
};

/** Dekoratives Zahnrad – Farbe über `text-*` (currentColor), Rotation über `animate-gear-spin`. */
export function Gear({ teeth = 12, hole = 0.36, spokes = true, ...props }: GearProps) {
  const inner = 40;
  const holeRadius = inner * hole;
  const d = `${gearPath(teeth, 48, inner)} ${ringPath(50, 50, inner * 0.78)}`;

  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" {...props}>
      <path d={d} fillRule="evenodd" />
      {spokes && (
        <g stroke="currentColor" strokeWidth={7} strokeLinecap="round">
          <line x1="50" y1={50 - inner * 0.78} x2="50" y2={50 + inner * 0.78} />
          <line x1={50 - inner * 0.78} y1="50" x2={50 + inner * 0.78} y2="50" />
        </g>
      )}
      <circle cx="50" cy="50" r={holeRadius} />
    </svg>
  );
}
