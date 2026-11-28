import Dashboard from "@/components/Dashboard";
import Proof from "@/components/Proof";
import Survey from "@/components/Survey";

export default function Home() {
  return (
    <main className="page">
      <nav className="sitenav" aria-label="Navigasi halaman">
        <b>SPK Smartphone</b>
        <a href="#mulai">Mulai</a>
        <a href="#alternatif">1 Alternatif</a>
        <a href="#bobot">2 Bobot</a>
        <a href="#prediksi">3 Prediksi</a>
        <a href="#hasil">4 Hasil</a>
        <a href="#kuesioner">Kuesioner</a>
        <a href="#bukti">Bukti</a>
      </nav>
      <header className="head">
        <h1>Segmen dulu, baru peringkat.</h1>
        <p>
          Harga Budget, Mid-range, dan Flagship saling menumpuk, jadi harga saja tidak bisa menentukan segmen. Random Forest menebak segmen dari spesifikasi, bobot kriteria disusun lewat matriks perbandingan AHP (bisa kamu isi sendiri), lalu TOPSIS memeringkat alternatif.
        </p>
      </header>
      <Dashboard />
      <Survey />
      <Proof />
      <footer className="foot">Asyraf Pramudya Azhar AB dan Reefat Rabani Izzan. 663 ponsel dari 21 merek (NanoReview). Bobot AHP dari sintesis literatur, bukan survei responden.</footer>
    </main>
  );
}
