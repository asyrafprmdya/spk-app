"use client";

import { useEffect, useState } from "react";

const Q = [
  "Saya merasa akan sering menggunakan sistem ini.",
  "Saya merasa sistem ini terlalu rumit.",
  "Saya merasa sistem ini mudah digunakan.",
  "Saya membutuhkan bantuan orang teknis agar dapat menggunakan sistem ini.",
  "Saya merasa fitur-fitur pada sistem ini terintegrasi dengan baik.",
  "Saya merasa ada terlalu banyak ketidakkonsistenan pada sistem ini.",
  "Saya merasa kebanyakan orang akan cepat belajar menggunakan sistem ini.",
  "Saya merasa sistem ini sangat membingungkan.",
  "Saya merasa sangat percaya diri menggunakan sistem ini.",
  "Saya perlu belajar banyak hal sebelum dapat menggunakan sistem ini.",
];
const KEY = "spk-sus-responses";
type Resp = { name: string; a: number[]; s: number };
const sus = (a: number[]) => a.reduce((s, x, i) => s + (i % 2 === 0 ? x - 1 : 5 - x), 0) * 2.5;
const f1 = (n: number) => n.toFixed(1).replace(".", ",");
const grade = (s: number) => (s >= 80.3 ? "sangat baik" : s >= 68 ? "di atas rata-rata (bisa diterima)" : s >= 51 ? "di bawah rata-rata" : "buruk");

export default function Survey() {
  const [a, setA] = useState<number[]>(Array(10).fill(0));
  const [name, setName] = useState("");
  const [list, setList] = useState<Resp[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setList(JSON.parse(raw));
    } catch {}
  }, []);
  const save = (l: Resp[]) => {
    setList(l);
    try {
      localStorage.setItem(KEY, JSON.stringify(l));
    } catch {}
  };
  const done = a.every((x) => x > 0);
  const avg = list.length ? list.reduce((s, r) => s + r.s, 0) / list.length : 0;
  return (
    <section className="step" id="kuesioner">
      <h2><span>4</span>Kuesioner kegunaan (SUS)</h2>
      <p className="hint">Setelah mencoba sistem, isi 10 pernyataan ini. 1 = sangat tidak setuju, 5 = sangat setuju. Jawaban tersimpan di browser ini saja.</p>
      <div className="fld" style={{ gridTemplateColumns: "1fr", maxWidth: 360 }}>
        <label htmlFor="rn">Nama responden (boleh dikosongkan)</label>
        <input id="rn" type="text" className="txt" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="scroll">
        <table className="tbl sus">
          <thead><tr><th>No</th><th>Pernyataan</th>{[1, 2, 3, 4, 5].map((n) => <th key={n}>{n}</th>)}</tr></thead>
          <tbody>
            {Q.map((q, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td className="q">{q}</td>
                {[1, 2, 3, 4, 5].map((n) => (
                  <td key={n}><input type="radio" name={`q${i}`} aria-label={`Pernyataan ${i + 1} nilai ${n}`} checked={a[i] === n} onChange={() => setA(a.map((x, k) => (k === i ? n : x)))} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="presets" style={{ marginTop: 14 }}>
        <button className="solid" disabled={!done} onClick={() => { save([...list, { name: name.trim() || `Responden ${list.length + 1}`, a, s: sus(a) }]); setA(Array(10).fill(0)); setName(""); }}>Simpan jawaban</button>
        <span className="hint" style={{ margin: "6px 0 0" }}>{done ? `Skor SUS jawabanmu: ${f1(sus(a))}` : `${a.filter((x) => x > 0).length} dari 10 terjawab`}</span>
      </div>
      <h3 style={{ marginTop: 26 }}>Rekap responden ({list.length})</h3>
      {list.length === 0 ? (
        <p className="hint">Belum ada jawaban tersimpan.</p>
      ) : (
        <>
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>No</th><th>Nama</th>{Q.map((_, i) => <th key={i}>P{i + 1}</th>)}<th>Skor SUS</th></tr></thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={i}><td>{i + 1}</td><td>{r.name}</td>{r.a.map((x, k) => <td key={k}>{x}</td>)}<td><b>{f1(r.s)}</b></td></tr>
                ))}
                <tr><td></td><td><b>Rata-rata</b></td><td colSpan={10}></td><td><b>{f1(avg)}</b></td></tr>
              </tbody>
            </table>
          </div>
          <p className="sentence" style={{ fontSize: 20, marginTop: 12 }}>Rata-rata SUS {f1(avg)}: {grade(avg)}.</p>
          <div className="presets"><button onClick={() => save([])}>Hapus semua jawaban</button></div>
        </>
      )}
    </section>
  );
}
