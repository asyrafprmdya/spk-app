"use client";

import { useEffect, useRef, useState } from "react";
import PriceMap from "./PriceMap";
import { ahp, phones } from "@/lib/data";
import { analyze, CR_LIMIT, EQUAL, PAIRS, SAATY, TEMPLATES } from "@/lib/ahp";
import { predictAlt, rankPool } from "@/lib/multi";
import type { UserAlt } from "@/lib/multi";
import { validateInput } from "@/lib/recommend";
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

type Vals = Record<string, string>;
const SEGS: Segment[] = ["Budget", "Mid-range", "Flagship"];
const COLOR: Record<Segment, string> = { Budget: "var(--budget)", "Mid-range": "var(--mid)", Flagship: "var(--flag)" };
const LET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const blank = (): Vals => Object.fromEntries(FIELDS.map((f) => [f.k, ""]));
const f = (n: number, d = 2) => n.toFixed(d).replace(".", ",");
const pct = (n: number, d = 0) => f(n * 100, d) + "%";
const toInput = (v: Vals) => Object.fromEntries(FIELDS.map((fl) => [fl.k, v[fl.k].trim() === "" ? null : Number(v[fl.k])])) as unknown as PhoneInput;
const goto = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

const PRED_STEPS = [
  { text: "Menyiapkan vektor fitur & imputasi median...", pct: 32 },
  { text: "Menjalankan 150 pohon keputusan Random Forest...", pct: 74 },
  { text: "Menghitung bobot AHP & peringkat TOPSIS...", pct: 100 },
];

function fromPhone(p: (typeof phones)[number], name: string): UserAlt {
  const rec = p as unknown as Record<string, number | null>;
  const input = Object.fromEntries(FIELDS.map((fl) => [fl.k, rec[fl.k] ?? null])) as unknown as PhoneInput;
  return { uid: `t${p.id}`, name, srcId: p.id, input };
}

function templateAlts(): UserAlt[] {
  const seen = new Set<string>();
  const out: UserAlt[] = [];
  for (const p of phones) {
    if (p.segment === "Mid-range" && p.price !== null && p.price >= 280 && p.price <= 420 && !seen.has(p.brand)) {
      seen.add(p.brand);
      out.push(fromPhone(p, `Kandidat ${LET[out.length]} (${p.brand})`));
      if (out.length === 3) break;
    }
  }
  return out;
}

const COLS = ["nama", ...FIELDS.map((x) => x.k)];

function downloadTemplate() {
  const ex = [
    ["Contoh A", 8, 256, 5000, 64, 395, 120, 250000, 300000, 320, 45, 16, 6.7],
    ["Contoh B", 12, 256, 5500, 50, 440, 144, 400000, 550000, 520, 67, 32, 6.8],
  ];
  const csv = [COLS.join(","), ...ex.map((r) => r.join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "template-alternatif.csv";
  a.click();
}

export default function Dashboard() {
  const cnt = useRef(0);
  const timers = useRef<number[]>([]);
  const [alts, setAlts] = useState<UserAlt[]>(templateAlts);
  const [form, setForm] = useState<{ name: string; vals: Vals; srcId: number | null }>({ name: "", vals: blank(), srcId: null });
  const [formErr, setFormErr] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [wmode, setWmode] = useState<"auto" | "custom">("auto");
  const [pairs, setPairs] = useState<number[]>(EQUAL);
  const [segMode, setSegMode] = useState<"auto" | Segment>("auto");
  const [note, setNote] = useState("");
  const [predicting, setPredicting] = useState<{ active: boolean; step: number; title: string }>({
    active: false,
    step: 0,
    title: "",
  });

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const runWithPrediction = (title: string, applyData: () => void) => {
    clearTimers();
    setPredicting({ active: true, step: 0, title });

    const t1 = window.setTimeout(() => {
      setPredicting({ active: true, step: 1, title });
    }, 450);

    const t2 = window.setTimeout(() => {
      setPredicting({ active: true, step: 2, title });
    }, 950);

    const t3 = window.setTimeout(() => {
      applyData();
      setPredicting({ active: false, step: 0, title: "" });
      goto("hasil");
    }, 1450);

    timers.current = [t1, t2, t3];
  };

  const brands = Array.from(new Set(phones.map((p) => p.brand))).sort();
  const preds = alts.map(predictAlt);
  const seg: Segment = segMode === "auto" ? (preds[0]?.segment ?? "Mid-range") : segMode;
  const an = analyze(pairs);
  const w = wmode === "auto" ? ahp.segments[seg].weights : an.weights;
  const rows = alts.length ? rankPool(alts, seg, w) : [];
  const top = rows.slice(0, 10);
  const mine = rows.filter((r) => r.uid && r.rank > 10);
  const topIds = top.filter((r) => r.key.startsWith("p")).map((r) => Number(r.key.slice(1)));
  const letter = (uid: string | null) => LET[alts.findIndex((a) => a.uid === uid)] ?? "?";

  const tryAdd = (name: string, vals: Vals, srcId: number | null) => {
    const input = toInput(vals);
    const v = validateInput(input);
    if (v.errors.length) return v.errors;
    setAlts((a) => [...a, { uid: `u${++cnt.current}`, name: name.trim() || `Alternatif ${a.length + 1}`, srcId, input }]);
    return [];
  };
  const setPair = (k: number, v: number) => {
    setPairs((p) => p.map((x, i) => (i === k ? v : x)));
    setWmode("custom");
  };
  const pickPhone = (id: number) => {
    const p = phones.find((x) => x.id === id);
    if (!p) return;
    const rec = p as unknown as Record<string, number | null>;
    setForm({ name: `${p.brand} ${p.ram}/${p.storage}`, srcId: p.id, vals: Object.fromEntries(FIELDS.map((fl) => [fl.k, rec[fl.k] === null || rec[fl.k] === undefined ? "" : String(rec[fl.k])])) });
    setFormErr([]);
  };
  const upload = (file: File | undefined) => {
    if (!file) return;
    file.text().then((t) => {
      const lines = t.split(/\r?\n/).filter((l) => l.trim());
      const head = lines[0].split(/[,;]/).map((x) => x.trim());
      let ok = 0;
      const bad: string[] = [];
      const next: UserAlt[] = [];
      lines.slice(1).forEach((ln, n) => {
        const c = ln.split(/[,;]/).map((x) => x.trim());
        const vals = blank();
        FIELDS.forEach((fl) => {
          const i = head.indexOf(fl.k);
          if (i >= 0) vals[fl.k] = c[i] ?? "";
        });
        const input = toInput(vals);
        if (validateInput(input).errors.length) bad.push(`baris ${n + 2}`);
        else {
          ok++;
          next.push({ uid: `u${++cnt.current}`, name: c[head.indexOf("nama")] || `Alternatif CSV ${n + 1}`, srcId: null, input });
        }
      });
      const msg = `${ok} alternatif dari CSV ditambahkan.${bad.length ? ` Dilewati karena tidak valid: ${bad.join(", ")}.` : ""}`;
      if (next.length > 0) {
        runWithPrediction(`Memprediksi ${next.length} kandidat dari CSV`, () => {
          setAlts((a) => [...a, ...next]);
          setNote(msg);
        });
      } else {
        setNote(msg);
      }
    });
  };
  const startTemplate = () => {
    runWithPrediction("Memprediksi 3 kandidat template", () => {
      setAlts(templateAlts());
      setWmode("auto");
      setSegMode("auto");
      setNote("");
    });
  };
  const startManual = () => {
    setAlts([]);
    setForm({ name: "", vals: blank(), srcId: null });
    setPairs(EQUAL);
    setWmode("custom");
    setSegMode("auto");
    setNote("");
    goto("alternatif");
  };
  const lbl = (v: number, a: string, b: string) => (v === 1 ? "Sama penting" : v > 1 ? `${a} ${v}x lebih penting` : `${b} ${Math.round(1 / v)}x lebih penting`);
  const crit = ahp.criteria;
  const mism = alts.map((a, i) => ({ a, i })).filter(({ i }) => preds[i].segment !== seg);
  const currentStep = PRED_STEPS[predicting.step] ?? PRED_STEPS[0];

  return (
    <>
      <style>{`
        @keyframes spkSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes spkPulseDot {
          0%, 100% { transform: scale(0.85); opacity: 0.45; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .pred-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: color-mix(in srgb, var(--ground) 84%, transparent);
          backdrop-filter: blur(4px);
        }
        .pred-card {
          width: 100%;
          max-width: 430px;
          padding: 24px 26px;
          background: var(--ground);
          border: 2px solid var(--ink);
          box-shadow: 6px 6px 0 var(--ink);
        }
        .pred-head {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
        }
        .pred-spinner {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          border: 3px solid color-mix(in srgb, var(--ink) 20%, transparent);
          border-top-color: var(--ink);
          border-radius: 50%;
          animation: spkSpin 0.75s linear infinite;
        }
        .pred-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          line-height: 1.25;
        }
        .pred-step {
          margin: 0 0 14px;
          font-size: 0.92rem;
          opacity: 0.85;
        }
        .pred-track {
          height: 10px;
          width: 100%;
          background: color-mix(in srgb, var(--ink) 12%, transparent);
          border: 1.5px solid var(--ink);
          overflow: hidden;
        }
        .pred-fill {
          height: 100%;
          background: var(--ink);
          transition: width 0.35s ease;
        }
        .pred-segs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .pred-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
          animation: spkPulseDot 1s ease-in-out infinite;
        }
      `}</style>

      {predicting.active && (
        <div className="pred-overlay" role="status" aria-live="polite">
          <div className="pred-card">
            <div className="pred-head">
              <span className="pred-spinner" aria-hidden="true" />
              <h3 className="pred-title">{predicting.title}</h3>
            </div>
            <p className="pred-step">{currentStep.text}</p>
            <div className="pred-track">
              <div className="pred-fill" style={{ width: `${currentStep.pct}%` }} />
            </div>
            <div className="pred-segs">
              <span className="pred-dot" style={{ background: "var(--budget)", animationDelay: "0s" }} />
              <span>Budget</span>
              <span className="pred-dot" style={{ background: "var(--mid)", animationDelay: "0.2s" }} />
              <span>Mid-range</span>
              <span className="pred-dot" style={{ background: "var(--flag)", animationDelay: "0.4s" }} />
              <span>Flagship</span>
            </div>
          </div>
        </div>
      )}

      <section className="start" id="mulai">
        <h2>Mulai dari mana?</h2>
        <p className="hint">Tiga langkah: isi alternatif ponsel, tentukan bobot kriteria lewat matriks perbandingan, lalu baca peringkatnya.</p>
        <div className="btnrow">
          <button className="big" disabled={predicting.active} onClick={startTemplate}>
            {predicting.active ? "Memprediksi segmen..." : "Pakai template"}
            <small>3 kandidat Mid-range dan bobot AHP segmen, langsung ada hasil</small>
          </button>
          <button className="big" disabled={predicting.active} onClick={startManual}>
            Isi sendiri
            <small>Daftar alternatif kosong, matriks bobot mulai dari sama penting</small>
          </button>
        </div>
      </section>

      <section className="step" id="alternatif">
        <h2><span>1</span>Alternatif ponsel</h2>
        <div className="cols">
          <div>
            <h3>Daftar alternatif ({alts.length})</h3>
            {alts.length === 0 && <p className="hint">Belum ada. Tambahkan lewat formulir, pilih dari dataset, atau unggah CSV.</p>}
            <ul className="alts">
              {alts.map((a, i) => (
                <li key={a.uid}>
                  <span className="badge">{LET[i]}</span>
                  <span className="an"><b>{a.name}</b><small>{a.input.ram}/{a.input.storage}, {a.input.battery} mAh, ${a.input.price}</small></span>
                  <span className="chipseg" style={{ background: COLOR[preds[i].segment] }}>{preds[i].segment} {pct(preds[i].probabilities[preds[i].segment])}</span>
                  <button className="x" aria-label={`Hapus ${a.name}`} onClick={() => setAlts((l) => l.filter((y) => y.uid !== a.uid))}>Hapus</button>
                </li>
              ))}
            </ul>
            <h3 style={{ marginTop: 22 }}>Template alternatif</h3>
            <p className="hint">Unduh CSV, isi di Excel atau Sheets, lalu unggah lagi. Nama kolom jangan diubah.</p>
            <div className="presets">
              <button onClick={downloadTemplate}>Unduh template CSV</button>
              <label className="filebtn">Unggah CSV<input type="file" accept=".csv,text/csv" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
            </div>
            {note && <p className="hint" role="status">{note}</p>}
            <p className="hint" style={{ marginBottom: 6 }}>Atau ambil spesifikasi dari dataset sebagai titik awal:</p>
            <div className="pick">
              <select aria-label="Merek" value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">Pilih merek</option>
                {brands.map((b) => <option key={b}>{b}</option>)}
              </select>
              <select aria-label="Model" disabled={!brand} value="" onChange={(e) => pickPhone(Number(e.target.value))}>
                <option value="">Pilih model</option>
                {phones.filter((p) => p.brand === brand && p.price !== null).map((p) => <option key={p.id} value={p.id}>{p.ram}/{p.storage}, {p.battery} mAh, ${Math.round(p.price as number)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <h3>Tambah alternatif baru</h3>
            <div className="fld" style={{ gridTemplateColumns: "1fr" }}>
              <label htmlFor="nm">Nama alternatif</label>
              <input id="nm" type="text" className="txt" placeholder="Misal: Ponsel incaran saya" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {FIELDS.map((fl) => (
              <div className="fld" key={fl.k}>
                <label htmlFor={`n_${fl.k}`}>{fl.l}<small>{fl.u}{fl.req ? "" : " (opsional)"}</small></label>
                <input type="range" aria-label={fl.l} min={fl.min} max={fl.max} step={fl.step} value={Number(form.vals[fl.k]) || fl.min} onChange={(e) => setForm({ ...form, vals: { ...form.vals, [fl.k]: e.target.value } })} />
                <input id={`n_${fl.k}`} type="number" step="any" value={form.vals[fl.k]} onChange={(e) => setForm({ ...form, vals: { ...form.vals, [fl.k]: e.target.value } })} />
              </div>
            ))}
            {formErr.map((e) => <p className="warn" key={e}>{e}</p>)}
            <div className="presets" style={{ marginTop: 12 }}>
              <button className="solid" onClick={() => { const e = tryAdd(form.name, form.vals, form.srcId); setFormErr(e); if (!e.length) setForm({ name: "", vals: blank(), srcId: null }); }}>Tambah ke daftar</button>
              <button onClick={() => { setForm({ name: "", vals: blank(), srcId: null }); setFormErr([]); }}>Kosongkan</button>
            </div>
          </div>
        </div>
      </section>

      <section className="step" id="bobot">
        <h2><span>2</span>Bobot kriteria</h2>
        <p className="hint">Bandingkan tingkat kepentingan tiap pasang kriteria dengan skala 1 sampai 9 (matriks prioritas AHP). Sistem menghitung bobotnya dan menguji konsistensi jawabanmu.</p>
        <div className="presets">
          <button aria-pressed={wmode === "auto"} onClick={() => setWmode("auto")}>Otomatis (AHP segmen {seg})</button>
          {TEMPLATES.map((t) => <button key={t.id} onClick={() => { setPairs(t.pairs); setWmode("custom"); }}>Template {t.id}</button>)}
          <button onClick={() => { setPairs(EQUAL); setWmode("custom"); }}>Isi sendiri dari nol</button>
        </div>
        <div className="cols">
          <div>
            {wmode === "custom" ? (
              <div className="pairs">
                {PAIRS.map(([i, j], k) => (
                  <div className="pr" key={k}>
                    <label htmlFor={`pr${k}`}>{crit[i].name} <small>vs</small> {crit[j].name}</label>
                    <select id={`pr${k}`} value={SAATY.indexOf(pairs[k])} onChange={(e) => setPair(k, SAATY[Number(e.target.value)])}>
                      {SAATY.map((s, x) => <option key={x} value={x}>{lbl(s, crit[i].name, crit[j].name)}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hint">Mode otomatis memakai bobot AHP yang sudah disusun untuk segmen {seg}. Pilih template atau isi sendiri untuk menyusun matriksmu.</p>
            )}
          </div>
          <div>
            <h3>Bobot hasil</h3>
            {crit.map((c, j) => (
              <div className="wb" key={c.code}>
                <span>{c.name}{c.type === "cost" ? " (cost)" : ""}</span>
                <span className="wt"><i style={{ width: `${(w[j] / 0.6) * 100}%` }} /></span>
                <b>{pct(w[j])}</b>
              </div>
            ))}
            {wmode === "custom" ? (
              <div className={an.consistent ? "cons ok" : "cons bad"} role="status">
                <b>{an.consistent ? "Konsisten" : "Belum konsisten"}: CR = {f(an.cr, 3)}</b>
                <span>λmax {f(an.lambdaMax, 3)}, CI {f(an.ci, 3)}, RI 1,32, batas CR {f(CR_LIMIT, 1)}</span>
                {!an.consistent && (
                  <span>
                    Jawaban paling bertentangan: {crit[an.worst.i].name} vs {crit[an.worst.j].name}. Saran: {lbl(an.worst.suggest, crit[an.worst.i].name, crit[an.worst.j].name)}.{" "}
                    <button className="lnk" onClick={() => setPair(an.worst.k, an.worst.suggest)}>Terapkan saran</button>
                  </span>
                )}
              </div>
            ) : (
              <div className="cons ok"><b>Bobot literatur: CR = {f(ahp.segments[seg].cr, 3)}</b><span>Sudah lolos uji konsistensi.</span></div>
            )}
          </div>
        </div>
      </section>

      <section className="step" id="hasil">
        <h2><span>3</span>Hasil peringkat</h2>
        <PriceMap phones={phones} marks={alts.map((a, i) => ({ price: a.input.price as number, label: LET[i] }))} segment={rows.length ? seg : null} top={topIds} />
        <div className="presets" style={{ marginTop: 14 }}>
          <span className="hint" style={{ margin: "6px 6px 0 0" }}>Segmen pembanding:</span>
          <button aria-pressed={segMode === "auto"} onClick={() => setSegMode("auto")}>Otomatis ({seg})</button>
          {SEGS.map((s) => <button key={s} aria-pressed={segMode === s} onClick={() => setSegMode(s)}>{s}</button>)}
        </div>
        {rows.length === 0 ? (
          <p className="sentence">Tambahkan minimal satu alternatif di langkah 1.</p>
        ) : (
          <div className="cols" style={{ marginTop: 10 }}>
            <div>
              <p className="sentence">Dibandingkan dengan {rows.length - alts.length} ponsel di segmen <b style={{ boxShadow: `inset 0 -0.38em 0 ${COLOR[seg]}` }}>{seg}</b>.</p>
              {wmode === "custom" && !an.consistent && <p className="warn">Bobotmu belum konsisten (CR {f(an.cr, 3)}). Peringkat tetap dihitung, tapi perbaiki matriks di langkah 2 dulu.</p>}
              {mism.map(({ a, i }) => <p className="warn" key={a.uid}>{LET[i]} ({a.name}) ditebak model sebagai {preds[i].segment}, tetapi dibandingkan di pool {seg}.</p>)}
              <table className="tbl">
                <thead><tr><th></th><th>Alternatif</th><th>Tebakan model</th><th>Urutan</th><th>V</th></tr></thead>
                <tbody>
                  {alts.map((a, i) => {
                    const r = rows.find((x) => x.uid === a.uid);
                    return (
                      <tr key={a.uid}>
                        <td><span className="badge">{LET[i]}</span></td>
                        <td><b>{a.name}</b></td>
                        <td>{preds[i].segment} {pct(preds[i].probabilities[preds[i].segment])}{preds[i].ambiguous ? " (tipis)" : ""}</td>
                        <td><b>{r?.rank}</b> dari {rows.length}</td>
                        <td>{f(r?.closeness ?? 0, 3)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <h3>Peringkat di {seg}</h3>
              <ol className="rank">
                {[...top, ...mine].map((r, i) => (
                  <li key={r.key} className={r.uid ? "rk me" : "rk"} style={r.uid && i >= top.length && i === top.length ? { marginTop: 14 } : undefined}>
                    <span className="n">{r.uid ? letter(r.uid) : r.rank}</span>
                    <span className="nm"><b>{r.name}</b><small>{r.uid ? `Urutan ${r.rank}. ` : ""}{r.sub}</small></span>
                    <span className="bar"><i style={{ width: `${r.closeness * 100}%` }} /></span>
                    <span className="v">{f(r.closeness, 3)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </section>
    </>
  );
}