// lib/cache/swr-cache-provider.js
import { cacheManager } from "./db.js";

export class IndexedDBCacheProvider {
  constructor() {
    this.memoryCache = new Map();
    this.isHydrated = false;
  }

  async hydrate() {
    try {
      console.log("🔄 Inizio idratazione da IndexedDB...");
      const [parties, users, macros] = await Promise.all([
        cacheManager.getPartiesFromCache(),
        cacheManager.getUsersFromCache(),
        cacheManager.getMacrosFromCache(),
      ]);

      if (parties && parties.length > 0) {
        const cachedData = {
          parties: parties,
          users: users || [],
          macroCategories: macros || [],
        };

        this.memoryCache.set("parties-data", cachedData);
        this.isHydrated = true;

        console.log(
          `✅ Idratazione RIUSCITA: ${parties.length} feste, ${
            users?.length || 0
          } utenti, ${macros?.length || 0} macro categorie.`
        );
        return true;
      } else {
        console.log("ℹ️ Nessun dato trovato in IndexedDB.");
        this.isHydrated = true;
      }
    } catch (error) {
      console.error("❌ Errore idratazione:", error);
      this.isHydrated = true; // Consideriamo comunque idratato anche se fallisce
    }
    return false;
  }

  set(key, value) {
    // Aggiorna la memoria (così l'UI si aggiorna)
    this.memoryCache.set(key, value);

    // Intercetta il salvataggio su disco
    if (key === "parties-data" && value) {
      this.saveToDisk(value);
    }
  }

  async saveToDisk(value) {
    try {
      const promises = [];
      if (value.parties?.length > 0)
        promises.push(cacheManager.cacheParties(value.parties));
      if (value.users?.length > 0)
        promises.push(cacheManager.cacheUsers(value.users));
      if (value.macroCategories?.length > 0)
        promises.push(cacheManager.cacheMacros(value.macroCategories));

      await Promise.all(promises);
      console.log("💾 Dati sincronizzati su IndexedDB.");
    } catch (err) {
      console.error("❌ Errore salvataggio IDB:", err);
    }
  }

  get(key) {
    return this.memoryCache.get(key);
  }

  delete(key) {
    this.memoryCache.delete(key);
  }

  keys() {
    return this.memoryCache.keys();
  }

  // ✅ NUOVO: Metodo per verificare se abbiamo dati in cache
  has(key) {
    return this.memoryCache.has(key);
  }
}
