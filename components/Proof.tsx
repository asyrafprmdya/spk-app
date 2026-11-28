import evaluation from "@/data/evaluation.json";
import { ahp, modelParams, phones } from "@/lib/data";
import type { Segment } from "@/lib/types";

const SEGS: Segment[] = ["Budget", "Mid-range", "Flagship"];
const COLOR: Record<Segment, string> = { Budget: "var(--budget)", "Mid-range": "var(--mid)", Flagship: "var(--flag)" };
const f = (n: number, d = 3) => n.toFixed(d).replace(".", ",");
const name = (id: number) => {
  const p = phones.find((x) => x.id === id);
  return p ? `${p.brand} ${p.ram}/${p.storage}, $${Math.round(p.price ?? 0)}` : "-";
};

export default function Proof() {
  const c = evaluation.classification;
  const vs = evaluation.segmentVsSingle.perSegment as Record<Segment, { n: number; spearman: number; top10Overlap: number; top1Segment: number; top1Single: number }>;
  const sens = Math.min(...Object.values(evaluation.sensitivity.perSegment).flatMap((l) => l.map((x) => x.spearman)));
  return (
    <section className="proof" id="bukti">
      <h2>Seberapa bisa dipercaya</h2>
      <div className="pgrid">
        <div>
          <h3>Salah tebak selalu ke tetangga terdekat</h3>
          <p className="hint">Random Forest, data uji 133 ponsel: akurasi {f(c.accuracy * 100, 1)}%, F1 macro {f(c.macro.f1 * 100, 1)}%. Baris adalah segmen sebenarnya, kolom adalah tebakan.</p>
          <div className="cm">
            <span />
            {c.labels.map((l) => <span className="ch" key={l}>{l}</span>)}
            {c.confusionMatrix.map((row, i) => {
              const sum = row.reduce((a, b) => a + b, 0);
              return [
                <span className="ch r" key={`h${i}`}>{c.labels[i]}</span>,
                ...row.map((x, j) => (
                  <b key={`${i}${j}`} style={{ background: `color-mix(in srgb, ${i === j ? COLOR[c.labels[i] as Segment] : "var(--ink)"} ${Math.round(8 + (x / sum) * 70)}%, var(--ground))` }}>{x}</b>
                )),
              ];
            })}
          </div>
          <h3 style={{ marginTop: 26 }}>Adu model (macro-F1 validasi silang, data latih)</h3>
          {Object.entries(c.cvByModel).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div className="wb" key={k}><span>{k}</span><span className="wt"><i style={{ width: `${v * 100}%` }} /></span><b>{f(v * 100, 1)}</b></div>
          ))}
        </div>
        <div>
          <h3>Bobot tiap segmen jauh dari bobot rata-rata</h3>
          <p className="hint">Titik berwarna adalah segmen, cincin hitam adalah bobot tunggal. Skala 0 sampai 45%.</p>
          {ahp.criteria.map((cr, j) => (
            <div className="wrow" key={cr.code}>
              <b>{cr.name}</b>
              <div className="wtrack">
                {SEGS.map((s) => <i key={s} style={{ left: `${(ahp.segments[s].weights[j] / 0.45) * 100}%`, background: COLOR[s] }} title={`${s} ${f(ahp.segments[s].weights[j] * 100, 1)}%`} />)}
                <i className="ring" style={{ left: `${(ahp.single.weights[j] / 0.45) * 100}%` }} title="Tunggal" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <table>
        <thead><tr><th>Segmen</th><th>Alternatif</th><th>Spearman</th><th>Top-10 sama</th><th>Juara bobot segmen</th><th>Juara bobot tunggal</th></tr></thead>
        <tbody>
          {SEGS.map((s) => (
            <tr key={s}>
              <td><b>{s}</b></td><td>{vs[s].n}</td><td><b>{f(vs[s].spearman)}</b></td><td><b>{Math.round(vs[s].top10Overlap * 100)}%</b></td><td>{name(vs[s].top1Segment)}</td><td>{name(vs[s].top1Single)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="notes">
        <p><b>Budget paling terpengaruh bobot.</b> Korelasinya dengan bobot tunggal cuma {f(vs.Budget.spearman)}, karena harga berbobot 42,9% di sini dan 17,2% di bobot tunggal.</p>
<p><b>Mid-range paling rawan.</b> Recall {f(c.perClass["Mid-range"].recall * 100, 1)}%, salah tebaknya menyebar ke Budget dan Flagship.</p>
        <p><b>Fitur paling berpengaruh.</b> {Object.entries(c.importances).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${modelParams.featureLabels[k] ?? k} (${f(v * 100, 1)}%)`).join(", ")} menurut importansi Random Forest.</p>
        <p><b>Sensitivitas.</b> Mengubah bobot ±10% tidak mengganti juara segmen (Spearman minimal {f(sens, 4)}).</p>
      </div>
    </section>
  );
}
