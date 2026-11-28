import type { Phone, Segment } from "@/lib/types";

const LANES: Segment[] = ["Budget", "Mid-range", "Flagship"];
const FILL: Record<Segment, string> = { Budget: "var(--budget)", "Mid-range": "var(--mid)", Flagship: "var(--flag)" };
const lo = Math.log(70), hi = Math.log(2400);
const jit = (id: number) => ((id * 9301 + 49297) % 233280) / 233280;
const r2 = (n: number) => Math.round(n * 100) / 100;

type Props = { phones: Phone[]; marks: { price: number; label: string }[]; segment: Segment | null; top: number[] };

function Chart({ phones, marks, segment, top, compact }: Props & { compact: boolean }) {
  const W = compact ? 420 : 1200;
  const L = compact ? 14 : 150;
  const R = compact ? 14 : 24;
  const T = compact ? 46 : 52;
  const LH = compact ? 96 : 100;
  const dTop = compact ? 30 : 14;
  const dBot = compact ? 12 : 14;
  const H = T + LH * 3 + 40;
  const px = (p: number) => r2(L + ((Math.log(Math.min(2400, Math.max(70, p))) - lo) / (hi - lo)) * (W - L - R));
  const priced = phones.filter((p) => p.price !== null);
  const topSet = new Set(top);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={compact ? "map map-m" : "map map-d"} role="img" aria-label="Sebaran harga ponsel per segmen pada sumbu harga yang sama">
      {LANES.map((s, i) => {
        const ps = priced.filter((p) => p.segment === s);
        const mn = Math.min(...ps.map((p) => p.price as number));
        const mx = Math.max(...ps.map((p) => p.price as number));
        const y0 = T + i * LH;
        const on = segment === s;
        return (
          <g key={s} opacity={segment && !on ? 0.5 : 1}>
            <rect x={px(mn)} y={y0 + 4} width={r2(px(mx) - px(mn))} height={LH - 8} fill={FILL[s]} fillOpacity={0.16} stroke={on ? "var(--ink)" : "none"} strokeWidth={2.5} />
            <text x={compact ? L : 0} y={y0 + (compact ? 22 : 46)} className="lane">{s}</text>
            <text x={compact ? W - R : 0} y={y0 + (compact ? 22 : 68)} textAnchor={compact ? "end" : "start"} className="lanesub">${mn} sampai ${mx.toLocaleString("en-US")}</text>
            {ps.map((p) => (
              <circle key={p.id} cx={px(p.price as number)} cy={r2(y0 + dTop + jit(p.id) * (LH - dTop - dBot))} r={topSet.has(p.id) ? 6 : 3.2} fill={FILL[s]} fillOpacity={topSet.has(p.id) ? 1 : 0.7} stroke={topSet.has(p.id) ? "var(--ink)" : "none"} strokeWidth={2} />
            ))}
          </g>
        );
      })}
      {[100, 200, 500, 1000, 2000].map((t) => (
        <g key={t}>
          <line x1={px(t)} x2={px(t)} y1={T} y2={T + LH * 3 + 8} stroke="var(--ink)" strokeOpacity={0.18} />
          <text x={px(t)} y={T + LH * 3 + 28} textAnchor="middle" className="tick">${t.toLocaleString("en-US")}</text>
        </g>
      ))}
      {marks.map((m) => (
        <g key={m.label}>
          <line x1={px(m.price)} x2={px(m.price)} y1={T - 8} y2={T + LH * 3} stroke="var(--ink)" strokeWidth={3} />
          <rect x={r2(Math.max(2, Math.min(W - 26, px(m.price) - 12)))} y={6} width={24} height={26} fill="var(--ink)" />
          <text x={r2(Math.max(14, Math.min(W - 14, px(m.price))))} y={25} textAnchor="middle" className="flag">{m.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function PriceMap(props: Props) {
  return (
    <div className="mapwrap" id="peta">
      <Chart {...props} compact={false} />
      <Chart {...props} compact />
    </div>
  );
}
