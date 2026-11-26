"use client";

import { useState } from "react";
import PriceMap from "./PriceMap";
import { ahp, phones } from "@/lib/data";
import { InputError, recommend } from "@/lib/recommend";
import type { RecommendResult } from "@/lib/recommend";
import type { PhoneInput, Segment } from "@/lib/types";

const FIELDS = [
  { k: "ram", l: "RAM", u: "GB", min: 2, max: 16, step: 1, req: true },
  { k: "storage", l: "Penyimpanan", u: "GB", min: 16, max: 512, step: 16, req: true },
  { k: "battery", l: "Baterai", u: "mAh", min: 2800, max: 7000, step: 100, req: true },
  { k: "camera", l: "Kamera utama", u: "MP", min: 5, max: 200, step: 1, req: true },
  { k: "ppi", l: "PPI layar", u: "", min: 203, max: 643, step: 1, req: true },
  { k: "refreshRate", l: "Refresh rate", u: "Hz", min: 60, max: 165, step: 1, req: true },
  { k: "cpu", l: "Skor CPU", u: "", min: 33298, max: 538809, step: 1000, req: true },
  { k: "gpu", l: "Skor GPU", u: "", min: 6591, max: 979908, step: 1000, req: true },
  { k: "price", l: "Harga", u: "USD", min: 80, max: 2199, step: 5, req: true },
  { k: "charge", l: "Daya charging", u: "W", min: 5, max: 240, step: 5, req: false },
  { k: "frontCamera", l: "Kamera depan", u: "MP", min: 2, max: 60, step: 1, req: false },
  { k: "displaySize", l: "Ukuran layar", u: "inci", min: 5.1, max: 8.03, step: 0.01, req: false },
] as const;

const PRESETS = [
  { name: "Budget", id: 233 },
  { name: "Mid-range", id: 1 },
  { name: "Flagship", id: 15 },
  { name: "Kasus rawan salah", id: 552 },
];
const COLOR: Record<Segment, string> = { Budget: "var(--budget)", "Mid-range": "var(--mid)", Flagship: "var(--flag)" };
const SEGS: Segment[] = ["Budget", "Mid-range", "Flagship"];

const f = (n: number, d = 2) => n.toFixed(d).replace(".", ",");
const pct = (n: number, d = 0) => f(n * 100, d) + "%";

function fromPhone(id: number): Record<string, string> {
  const p = phones.find((x) => x.id === id) as unknown as Record<string, number | null>;
  return Object.fromEntries(FIELDS.map((fl) => [fl.k, p[fl.k] === null || p[fl.k] === undefined ? "" : String(p[fl.k])]));
}

type Custom = { seg: Segment; w: number[] } | null;

function run(vals: Record<string, string>, mode: "segment" | "single", custom: Custom) {
  const inp = Object.fromEntries(FIELDS.map((fl) => [fl.k, vals[fl.k].trim() === "" ? null : Number(vals[fl.k])])) as unknown as PhoneInput;
  const base = mode === "single" ? ahp.single.weights : undefined;
  try {
    let r = recommend(inp, { weights: custom?.w ?? base });
    if (custom && r.segment !== custom.seg) r = recommend(inp, { weights: base });
    return { r, errors: [] as string[], price: inp.price as number | null };
  } catch (e) {
    return { r: null as RecommendResult | null, errors: e instanceof InputError ? e.errors : ["Input tidak valid"], price: inp.price as number | null };
  }
}

function Fader({ v, label, code, cost, onSet }: { v: number; label: string; code: string; cost: boolean; onSet: (s: number) => void }) {
  const from = (e: React.PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    onSet(Math.min(0.95, Math.max(0, ((e.clientX - b.left) / b.width) * 0.6)));
  };
  return (
    <div className="fd">
      <span className="fdn">{label}<small>{code}{cost ? " cost" : ""}</small></span>
      <span className="fdp">{pct(v)}</span>
      <div
        className="slot"
        role="slider"
        tabIndex={0}
        aria-label={`Bobot ${label}`}
        aria-valuemin={0}
        aria-valuemax={95}
        aria-valuenow={Math.round(v * 100)}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); from(e); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) from(e); }}
        onKeyDown={(e) => {
          const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.01 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.01 : 0;
          if (d) { e.preventDefault(); onSet(Math.min(0.95, Math.max(0, v + d))); }
        }}
      >
        <i style={{ width: `${Math.min(100, (v / 0.6) * 100)}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [vals, setVals] = useState<Record<string, string>>(() => fromPhone(1));
  const [preset, setPreset] = useState(1);
  const [mode, setMode] = useState<"segment" | "single">("segment");
  const [custom, setCustom] = useState<Custom>(null);
  const { r, errors, price } = run(vals, mode, custom);

  const setWeight = (j: number, s: number) => {
    if (!r) return;
    const w = r.weights;
    const o = 1 - w[j];
    setCustom({ seg: r.segment, w: w.map((x, k) => (k === j ? s : o > 1e-9 ? (x * (1 - s)) / o : (1 - s) / (w.length - 1))) });
  };
  const me = r?.ranking.find((x) => x.isInput);
  const top = r ? r.ranking.slice(0, 10) : [];
  const shown = me && me.rank > 10 ? [...top, me] : top;
  const topIds = top.filter((x) => x.id !== null).map((x) => x.id as number);

  return (
    <>
      <PriceMap phones={phones} price={price} segment={r?.segment ?? null} top={topIds} />
      <section className="verdict" aria-live="polite">
        {r ? (
          <>
            <p className="sentence">
              Ditebak <b style={{ boxShadow: `inset 0 -0.38em 0 ${COLOR[r.segment]}` }}>{r.segment}</b>, dan menempati urutan <b>{me?.rank}</b> dari {r.alternativeCount} ponsel di segmen itu.
            </p>
            <div className="probbar" aria-hidden="true">
              {SEGS.map((s) => <i key={s} style={{ width: `${r.probabilities[s] * 100}%`, background: COLOR[s] }} />)}
            </div>
            <p className="probtxt">{SEGS.map((s) => `${s} ${pct(r.probabilities[s], 1)}`).join("   ")}</p>
            {r.warnings.map((w) => <p className="warn" key={w}>{w}</p>)}
          </>
        ) : (
          <>
            <p className="sentence">Spesifikasinya belum lengkap.</p>
            {errors.map((e) => <p className="warn" key={e}>{e}</p>)}
          </>
        )}
      </section>

      <div className="work">
        <section aria-label="Spesifikasi" id="spek">
          <h2>Spesifikasi</h2>
          <div className="presets">
            {PRESETS.map((p) => (
              <button key={p.id} aria-pressed={preset === p.id} onClick={() => { setVals(fromPhone(p.id)); setPreset(p.id); setCustom(null); }}>{p.name}</button>
            ))}
          </div>
          {FIELDS.map((fl) => (
            <div className="fld" key={fl.k}>
              <label htmlFor={`n_${fl.k}`}>{fl.l}<small>{fl.u}{fl.req ? "" : " (opsional)"}</small></label>
              <input type="range" aria-label={fl.l} min={fl.min} max={fl.max} step={fl.step} value={Number(vals[fl.k]) || fl.min} onChange={(e) => { setVals({ ...vals, [fl.k]: e.target.value }); setPreset(0); }} />
              <input id={`n_${fl.k}`} type="number" step="any" value={vals[fl.k]} onChange={(e) => { setVals({ ...vals, [fl.k]: e.target.value }); setPreset(0); }} />
            </div>
          ))}
        </section>

        <section aria-label="Peringkat" id="peringkat">
          <h2>{r ? `Peringkat di ${r.segment}` : "Peringkat"}</h2>
          <ol className="rank">
            {shown.map((x, i) => {
              const gap = me && me.rank > 10 && i === 10;
              const ph = x.isInput ? null : phones.find((p) => p.id === x.id);
              return (
                <li key={x.isInput ? "me" : x.id} className={x.isInput ? "rk me" : "rk"} style={gap ? { marginTop: 18 } : undefined}>
                  <span className="n">{x.rank}</span>
                  <span className="nm">
                    <b>{x.isInput ? "Ponsel kamu" : ph?.brand + " " + ph?.ram + "/" + ph?.storage}</b>
                    <small>{ph ? `${ph.battery} mAh, ${ph.camera} MP, $${Math.round(ph.price ?? 0)}` : `${vals.ram}/${vals.storage}, ${vals.battery} mAh, $${vals.price}`}</small>
                  </span>
                  <span className="bar"><i style={{ width: `${x.closeness * 100}%` }} /></span>
                  <span className="v">{f(x.closeness, 3)}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-label="Bobot" id="bobot">
          <h2>Bobot kriteria</h2>
          <p className="hint">Geser batang. Bobot lain ikut menyesuaikan sampai total 100%.</p>
          <div className="presets">
            <button aria-pressed={mode === "segment"} onClick={() => { setMode("segment"); setCustom(null); }}>Bobot segmen</button>
            <button aria-pressed={mode === "single"} onClick={() => { setMode("single"); setCustom(null); }}>Bobot tunggal</button>
            <button onClick={() => setCustom(null)}>Reset</button>
          </div>
          {r && r.criteria.map((c, j) => <Fader key={c.code} v={r.weights[j]} label={c.name} code={c.code} cost={c.type === "cost"} onSet={(s) => setWeight(j, s)} />)}
          {r && (
            <p className="hint">
              {custom && custom.seg === r.segment ? "Bobot sudah diubah, jadi uji konsistensi AHP tidak berlaku." : mode === "single" ? "Rata-rata bobot tiga segmen." : `CR ${f(ahp.segments[r.segment].cr, 4)}, matriks AHP konsisten.`}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
