import { cacheManager } from "./db.js";

// Fetcher offline-aware per SWR
export async function offlineFetcher(key) {
  try {
    // Se siamo online, carica dai server action
    if (navigator.onLine) {
      // Questo sarà sovrascritto da SWR per usare il vero fetcher
      console.log("[v0] Online - fetching fresh data");
      return null; // Lascia che SWR usi il vero fetcher
    } else {
      // Se siamo offline, torna i dati cachati
      console.log("[v0] Offline - loading from cache");

      if (key === "parties-data") {
        const [parties, users, macros] = await Promise.all([
          cacheManager.getPartiesFromCache(),
          cacheManager.getUsersFromCache(),
          cacheManager.getMacrosFromCache(),
        ]);

        if (parties && parties.length > 0) {
          console.log("[v0] Cache trovato - ritorno dati offline");
          return {
            parties: parties || [],
            users: users || [],
            macroCategories: macros || [],
          };
        } else {
          throw new Error("Nessun dato in cache");
        }
      }
      throw new Error("Chiave cache non supportata");
    }
  } catch (error) {
    console.error("[v0] Errore nel fetcher offline:", error);
    throw error;
  }
}

// Wrapper per SWR che combina online e offline
export function createOfflineAwareFetcher(onlineFetcher) {
  return async (key) => {
    try {
      if (navigator.onLine) {
        // Se online, usa il fetcher normale
        const data = await onlineFetcher();

        // Salva in cache
        if (key === "parties-data" && data) {
          try {
            await Promise.all([
              data.parties && cacheManager.cacheParties(data.parties),
              data.users && cacheManager.cacheUsers(data.users),
              data.macroCategories &&
                cacheManager.cacheMacros(data.macroCategories),
            ]);
            console.log("[v0] Dati sincronizzati in cache");
          } catch (cacheError) {
            console.error("[v0] Errore nel caching:", cacheError);
            // Non fallisci, ritorna i dati comunque
          }
        }

        return data;
      } else {
        // Se offline, usa la cache
        console.log("[v0] Modalità offline - usando cache");
        return offlineFetcher(key);
      }
    } catch (error) {
      // Se c'è un errore e siamo online, rilancia l'errore
      if (navigator.onLine) {
        throw error;
      }

      // Se offline, tenta di usare la cache di fallback
      console.log("[v0] Errore durante fetch, tentando fallback cache");
      try {
        return offlineFetcher(key);
      } catch (cacheError) {
        console.error("[v0] Nemmeno la cache disponibile:", cacheError);
        throw new Error(
          "Errore nel caricamento dei dati. Controlla la connessione."
        );
      }
    }
  };
}
