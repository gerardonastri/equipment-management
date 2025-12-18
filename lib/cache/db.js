// lib/cache/db.js

function wrapIDBRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const DB_NAME = "supabase-cache";
const DB_VERSION = 2; // <--- INCREMENTA LA VERSIONE SE AGGIUNGI STORE!
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore

class CacheManager {
  constructor() {
    this.db = null;
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store Feste
        if (!db.objectStoreNames.contains("parties")) {
          db.createObjectStore("parties", { keyPath: "id" });
        }

        // Store Utenti (NUOVO)
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "id" });
        }

        // Store Macro Categorie / Inventory (NUOVO)
        if (!db.objectStoreNames.contains("inventory_macros")) {
          db.createObjectStore("inventory_macros", { keyPath: "id" });
        }

        // Store per i dettagli materiali delle feste (per il modale)
        if (!db.objectStoreNames.contains("party_materials_details")) {
          // Qui useremo party_id come chiave
          db.createObjectStore("party_materials_details", {
            keyPath: "partyId",
          });
        }

        // Metadata
        if (!db.objectStoreNames.contains("cache_metadata")) {
          db.createObjectStore("cache_metadata", { keyPath: "key" });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async init() {
    if (!this.db) this.db = await this.openDB();
    return this.db;
  }

  // --- METODI GENERICI DI SALVATAGGIO ---

  async saveItems(storeName, items) {
    if (!items || items.length === 0) return;
    const db = await this.init();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    await Promise.all(items.map((item) => wrapIDBRequest(store.put(item))));
    return wrapIDBRequest(tx);
  }

  async getItems(storeName) {
    const db = await this.init();
    return wrapIDBRequest(
      db.transaction(storeName, "readonly").objectStore(storeName).getAll()
    );
  }

  // --- METODI SPECIFICI (Wrapper) ---

  // 1. Feste
  async cacheParties(parties) {
    return this.saveItems("parties", parties);
  }
  async getPartiesFromCache() {
    return this.getItems("parties");
  }

  // 2. Utenti
  async cacheUsers(users) {
    return this.saveItems("users", users);
  }
  async getUsersFromCache() {
    return this.getItems("users");
  }

  // 3. Macro Categorie
  async cacheMacros(macros) {
    return this.saveItems("inventory_macros", macros);
  }
  async getMacrosFromCache() {
    return this.getItems("inventory_macros");
  }

  // 4. Dettaglio Materiali (per modale)
  async cachePartyMaterials(partyId, data) {
    const db = await this.init();
    const tx = db.transaction("party_materials_details", "readwrite");
    // Salviamo un oggetto con ID della festa e i dati completi
    const record = { partyId, data, timestamp: Date.now() };
    return wrapIDBRequest(
      tx.objectStore("party_materials_details").put(record)
    );
  }

  async getPartyMaterialsFromCache(partyId) {
    const db = await this.init();
    const record = await wrapIDBRequest(
      db
        .transaction("party_materials_details", "readonly")
        .objectStore("party_materials_details")
        .get(partyId)
    );
    return record ? record.data : null;
  }
}

export const cacheManager = new CacheManager();
