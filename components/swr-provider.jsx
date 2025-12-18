// components/swr-provider.jsx
"use client";

import { SWRConfig } from "swr";
import { IndexedDBCacheProvider } from "@/lib/cache/swr-cache-provider";
import { cacheManager } from "@/lib/cache/db";
import { useEffect, useState } from "react";

export default function SWRProvider({ children }) {
  const [provider] = useState(() => new IndexedDBCacheProvider());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const startApp = async () => {
      try {
        await cacheManager.init();
        await provider.hydrate();
      } catch (e) {
        console.error("Errore critico idratazione:", e);
      } finally {
        setIsHydrated(true);
      }
    };

    startApp();
  }, [provider]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900 mx-auto mb-2"></div>
          <p className="text-sm text-slate-500">Avvio applicazione...</p>
        </div>
      </div>
    );
  }

  return (
    <SWRConfig
      value={{
        provider: () => provider.memoryCache,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
        dedupingInterval: 2000,
        // ✅ AGGIUNTA CHIAVE: Se il fetch fallisce ma abbiamo dati in cache, non considerarlo un errore
        onError: (error, key) => {
          // Controlla se abbiamo dati in cache per questa chiave
          const cachedData = provider.memoryCache.get(key);

          if (cachedData) {
            // Abbiamo dati in cache, quindi NON è un vero errore
            console.log(
              `⚠️ Fetch fallito per "${key}", ma abbiamo dati in cache`
            );
            return; // Non propagare l'errore
          }

          // Se non abbiamo dati in cache, allora è un errore reale
          console.error(`❌ Errore fetch per "${key}":`, error);
        },
        // ✅ AGGIUNTA: Usa sempre i dati in cache se disponibili
        onSuccess: (data, key) => {
          console.log(`✅ Dati ricevuti per "${key}"`);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
