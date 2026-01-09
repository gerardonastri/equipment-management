"use client";

import { useEffect, useState, use } from "react"; // Importa 'use'
import { Wifi, CheckCircle, AlertTriangle } from "lucide-react";

export default function NfcRelayPage({ params }) {
  // --- FIX PER NEXT.JS 15/16 ---
  // params è una Promise, dobbiamo usare 'use' per leggerla
  const resolvedParams = use(params);
  const id = resolvedParams.tagId;
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
    console.log("Broadcasting ID:", id); // Debug
    channel.postMessage({
      type: "TAG_SCANNED",
      itemId: id,
      timestamp: Date.now(),
    });

    setStatus("success");

    // 3. Chiusura automatica (tentativo)
    const timer = setTimeout(() => {
       // window.close(); // Scommenta se vuoi provare a chiudere
    }, 2000);

    return () => {
      channel.close();
      clearTimeout(timer);
    };
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
      {status === "success" && (
        <>
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Rilevato!</h1>
          <p className="text-green-400 font-mono text-xl mt-2 tracking-wider">{id}</p>
          <p className="text-zinc-500 text-sm mt-8">Puoi chiudere questa scheda.</p>
        </>
      )}

      {status === "scanning" && (
        <>
          <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
          <h1 className="text-2xl font-bold">Lettura Tag in corso...</h1>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Errore Parametri</h1>
          <p className="text-zinc-400 mt-2">ID non trovato nell'URL.</p>
        </>
      )}
    </div>
  );
}