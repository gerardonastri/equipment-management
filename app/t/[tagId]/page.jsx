"use client";

import { useEffect, useState, use } from "react";
import { Wifi, CheckCircle, AlertTriangle, X } from "lucide-react";

export default function NfcRelayPage({ params }) {
  // --- FIX PER NEXT.JS 15/16 ---
  // params è una Promise, dobbiamo usare 'use' per leggerla
  const resolvedParams = use(params);
  const id = resolvedParams.tagId; // Assicurati che la cartella si chiami [tagId]
  // -----------------------------

  const [status, setStatus] = useState("scanning");

  useEffect(() => {
    if (!id) {
      setStatus("error");
      return;
    }

    // 1. Apriamo il canale
    const channel = new BroadcastChannel("nfc_scan_channel");

    // 2. Inviamo il messaggio
    console.log("Broadcasting ID:", id);
    channel.postMessage({
      type: "TAG_SCANNED",
      itemId: id,
      timestamp: Date.now(),
    });

    setStatus("success");

    // 3. Chiusura automatica (tentativo)
    // Funziona su alcuni browser, altri lo bloccano richiedendo azione utente
    const timer = setTimeout(() => {
      try {
        window.close();
      } catch (e) {
        console.log("Auto-close blocked");
      }
    }, 1500);

    return () => {
      channel.close();
      clearTimeout(timer);
    };
  }, [id]);

  // Funzione per chiudere manualmente (fallback)
  const handleManualClose = () => {
    try {
      window.close();
    } catch (e) {
      alert("Chiudi questa scheda manualmente.");
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center cursor-pointer"
      onClick={handleManualClose} // Toccando ovunque prova a chiudere
    >
      {status === "success" && (
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-[0_0_30px_rgba(34,197,94,0.6)]">
            <CheckCircle className="w-14 h-14 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Rilevato!</h1>
          <p className="text-green-400 font-mono text-xl mt-2 tracking-wider uppercase">
            {id.slice(0, 8)}...
          </p>

          <button 
            onClick={(e) => {
              e.stopPropagation(); // Evita doppio click
              handleManualClose();
            }}
            className="mt-10 flex items-center gap-2 px-8 py-4 bg-zinc-800 rounded-full text-lg font-semibold hover:bg-zinc-700 transition-all border border-zinc-700 active:scale-95"
          >
            <X size={24} />
            Chiudi Scheda
          </button>
          
          <p className="text-zinc-500 text-xs mt-6">
            Dati inviati. Se non si chiude, clicca il bottone.
          </p>
        </div>
      )}

      {status === "scanning" && (
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wifi className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Lettura Tag...</h1>
          <p className="text-zinc-400 mt-2">Attendere...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Errore Parametri</h1>
          <p className="text-zinc-400 mt-2">ID tag mancante nell'URL.</p>
        </div>
      )}
    </div>
  );
}