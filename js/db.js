// db.js - layer di accesso a IndexedDB per Mangje!
// Tutti i dati restano in locale sul dispositivo, nessun account, nessun server.

const DB_NAME = 'mangje-db';
const DB_VERSION = 1;

const STORES = {
  profiles: 'profiles',       // profili giornata (Allenamento, Off, ...)
  foods: 'foods',             // database alimenti personale
  composites: 'composites',   // pasti fissi (es. colazione classica)
  days: 'days',                // una entry per data, con lista voci consumate
  habits: 'habits',            // regole di buone abitudini
  weights: 'weights',          // storico peso corporeo
  settings: 'settings'         // impostazioni app (tema, ecc.)
};

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORES.profiles)) {
        db.createObjectStore(STORES.profiles, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.foods)) {
        const s = db.createObjectStore(STORES.foods, { keyPath: 'id' });
        s.createIndex('barcode', 'barcode', { unique: false });
        s.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.composites)) {
        db.createObjectStore(STORES.composites, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.days)) {
        db.createObjectStore(STORES.days, { keyPath: 'date' }); // date = 'YYYY-MM-DD'
      }
      if (!db.objectStoreNames.contains(STORES.habits)) {
        db.createObjectStore(STORES.habits, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.weights)) {
        db.createObjectStore(STORES.weights, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' });
      }
    };

    req.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

const DB = {
  async getAll(storeName) {
    const store = await tx(storeName);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async get(storeName, key) {
    const store = await tx(storeName);
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async put(storeName, value) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(value);
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(storeName, key) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async clear(storeName) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async findByBarcode(barcode) {
    const all = await this.getAll(STORES.foods);
    return all.find(f => f.barcode === barcode) || null;
  },

  async exportAll() {
    const data = {};
    for (const key of Object.keys(STORES)) {
      data[key] = await this.getAll(STORES[key]);
    }
    data._exportedAt = new Date().toISOString();
    data._version = DB_VERSION;
    return data;
  },

  async importAll(data) {
    for (const key of Object.keys(STORES)) {
      if (!Array.isArray(data[key])) continue;
      await this.clear(STORES[key]);
      const store = await tx(STORES[key], 'readwrite');
      for (const item of data[key]) {
        store.put(item);
      }
    }
  }
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
