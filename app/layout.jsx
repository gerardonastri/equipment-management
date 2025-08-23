import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Movida Manager - Gestione Materiale Feste",
  description: "Sistema di gestione materiale",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={inter.className}>
      <body className="min-h-screen bg-surface antialiased">{children}</body>
    </html>
  );
}
