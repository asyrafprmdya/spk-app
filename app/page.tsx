import Dashboard from "@/components/Dashboard";
import Proof from "@/components/Proof";

export default function Home() {
  return (
    <main className="page">
      <nav className="sitenav" aria-label="Navigasi halaman">
        <b>SPK Smartphone</b>
        <a href="#peta">Peta</a>
        <a href="#spek">Spesifikasi</a>
        <a href="#peringkat">Peringkat</a>
        <a href="#bobot">Bobot</a>
        <a href="#bukti">Bukti</a>
      </nav>
      <header className="head">
        <h1>Segmen dulu, baru peringkat.</h1>
        <p>
          Harga Budget, Mid-range, dan Flagship saling menumpuk, jadi harga saja tidak bisa menentukan segmen. Model menebak segmen dari spesifikasi, lalu bobot AHP milik segmen itu dipakai TOPSIS untuk memeringkat.
        </p>
      </header>
      <Dashboard />
      <Proof />
      <footer className="foot">Asyraf Pramudya Azhar AB dan Reefat Rabani Izzan. 663 ponsel dari 21 merek (NanoReview). Bobot AHP dari sintesis literatur, bukan survei responden.</footer>
    </main>
  );
}
