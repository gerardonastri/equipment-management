"use client";

import { SWRConfig } from "swr";
import { useEffect, useState } from "react";
import { IndexedDBCacheProvider } from "@/lib/cache/swr-cache-provider";

let cacheProvider = null;
let swRegistered = false;

function getCacheProvider() {
  if (!cacheProvider) {
    cacheProvider = new IndexedDBCacheProvider();
  }
  return cacheProvider;
}

export default function SWRProvider({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    if ("serviceWorker" in navigator && !swRegistered) {
      swRegistered = true;
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[v0] Service Worker registrato:", reg);
        })
        .catch((err) => {
          console.warn(
            "[v0] Errore registrazione SW (ignorato - usando comunque cache IndexedDB):",
            err.message
          );
        });
    }

    // Idrata il cache dal IndexedDB
    const provider = getCacheProvider();
    provider.hydrate().then(() => {
      setIsReady(true);
      console.log("[v0] SWRProvider pronto");
    });

    // Monitora lo stato online/offline
    const handleOnline = () => {
      console.log("[v0] Connessione ripristinata");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("[v0] Connessione persa - modalità offline");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inizializzazione...</p>
        </div>
      </div>
    );
  }

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000,
        focusThrottleInterval: 300000,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
      }}
    >
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 text-center py-2 z-50 font-medium">
          📡 Modalità offline - usando dati salvati
        </div>
      )}
      {children}
    </SWRConfig>
  );
}
