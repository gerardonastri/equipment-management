import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Material Manager - Gestione Materiale Feste",
  description:
    "Sistema di gestione materiale per agenzia feste con QR code e controlli multipli",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={inter.className}>
      <body className="min-h-screen bg-surface antialiased">{children}</body>
    </html>
  );
}
