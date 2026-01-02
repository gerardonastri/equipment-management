import { Inter } from "next/font/google";
import "./globals.css";
import SWRProvider from "@/components/swr-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Movida Manager - Gestione Materiale Feste",
  description: "Sistema di gestione materiale",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Movida manager",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={inter.className}>
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#0f172a" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      <body className="min-h-screen bg-surface antialiased">
        <SWRProvider>{children}</SWRProvider>
        {children}
      </body>
    </html>
  );
}
