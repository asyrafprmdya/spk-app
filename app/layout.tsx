import type { Metadata } from "next";
import { Syne, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["600", "800"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SPK Smartphone Berbasis Segmen: Random Forest, AHP, dan TOPSIS",
  description: "Random Forest menebak segmen, matriks AHP memberi bobot, TOPSIS memeringkat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${syne.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
