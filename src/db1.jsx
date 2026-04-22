import { supabase } from "./supabase";

export const DB_NAME = "Screen1DB";
export const STORE_NAME = "matches";

// -------------------------
// IndexedDB (fallback - ostaje za sada)
// -------------------------
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// -------------------------
// Supabase LOAD (primarni)
// -------------------------
export async function loadRows() {
  const { data, error } = await supabase
    .from("screen1_matches")
    .select("*")
    .order("rb", { ascending: true });

  if (error) {
    console.log("Supabase loadRows error:", error);
    return [];
  }

  return data || [];
}

// -------------------------
// SAVE (dual system: IndexedDB + Supabase)
// -------------------------
export async function saveRows(rows) {
  // IndexedDB backup
  const db = await openDB();

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  rows.forEach(r => store.add(r));

  // Supabase sync
  const { error: delError } = await supabase
    .from("screen1_matches")
    .delete()
    .gte("rb", 0);

  if (delError) {
    console.log("Supabase delete error:", delError);
  }

  const { error } = await supabase
    .from("screen1_matches")
    .insert(rows);

  if (error) {
    console.log("Supabase insert error:", error);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------
// CONFIRMED LEAGUES (IndexedDB za sada ostaje)
// -------------------------
export async function saveConfirmedLeagues(confirmedLeagues) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({ id: "confirmedLeagues", data: confirmedLeagues });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadConfirmedLeagues() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get("confirmedLeagues");

    request.onsuccess = () => resolve(request.result?.data || {});
    request.onerror = () => reject(request.error);
  });
}
