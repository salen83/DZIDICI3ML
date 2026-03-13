import React, { createContext, useContext, useState, useEffect } from "react";

// =========================
// IndexedDB helper funkcije
// =========================
const DB_NAME = 'SofaDB';
const STORE_NAME = 'sofaRows';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'rb', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveSofaRows = async (rows) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear(); // obriši prethodne
    rows.forEach(r => store.put(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadSofaRows = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// =========================
// SofaContext
// =========================
const SofaContext = createContext();

const defaultSofaRows = [
  { Liga: "Premier League", Domacin: "Chelsea", Gost: "Arsenal" },
  { Liga: "Premier League", Domacin: "Liverpool", Gost: "Man City" },
  { Liga: "La Liga", Domacin: "Barcelona", Gost: "Real Madrid" },
  { Liga: "Serie A", Domacin: "Juventus", Gost: "Inter" }
];

export const SofaProvider = ({ children }) => {
  const [sofaRows, setSofaRows] = useState(defaultSofaRows);

  // =========================
  // INIT: učitavanje iz IndexedDB
  // =========================
  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadSofaRows();
        if (loaded?.length) setSofaRows(loaded);
      } catch (err) {
        console.error("Ne mogu da učitam SofaRows iz IndexedDB:", err);
      }
    })();
  }, []);

  // =========================
  // Čuvanje u IndexedDB kad se sofaRows promeni
  // =========================
  useEffect(() => {
    (async () => {
      try {
        await saveSofaRows(sofaRows);
      } catch (err) {
        console.error("Ne mogu da sačuvam SofaRows u IndexedDB:", err);
      }
    })();
  }, [sofaRows]);

  return (
    <SofaContext.Provider value={{ sofaRows, setSofaRows }}>
      {children}
    </SofaContext.Provider>
  );
};

export const useSofa = () => {
  const context = useContext(SofaContext);
  if (!context) throw new Error("useSofa must be used inside SofaProvider");
  return context;
};
