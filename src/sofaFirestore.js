import { db } from "./firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";

const COLLECTION = "sofaRows";
const META_DOC = "meta";
const CHUNK_PREFIX = "chunk_";

const CHUNK_SIZE = 500;

/* =========================
   INIT
========================= */
export const initSofaFirestore = async () => {
  const ref = doc(db, COLLECTION, META_DOC);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      chunks: 0,
      updatedAt: Date.now(),
    });
  }
};

/* =========================
   SAVE (CHUNKED BATCH)
========================= */
export const saveSofaRows = async (rows) => {
  if (!Array.isArray(rows)) return;

  const chunks = [];

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    chunks.push(rows.slice(i, i + CHUNK_SIZE));
  }

  const batch = writeBatch(db);

  // meta info
  const metaRef = doc(db, COLLECTION, META_DOC);
  batch.set(metaRef, {
    chunks: chunks.length,
    updatedAt: Date.now(),
  });

  // data chunks
  chunks.forEach((chunk, index) => {
    const ref = doc(db, COLLECTION, CHUNK_PREFIX + index);

    batch.set(ref, {
      index,
      data: chunk,
    });
  });

  await batch.commit();
};

/* =========================
   LOAD (MERGE CHUNKS)
========================= */
export const loadSofaRows = async () => {
  const metaRef = doc(db, COLLECTION, META_DOC);
  const metaSnap = await getDoc(metaRef);

  if (!metaSnap.exists()) return [];

  const chunksCount = metaSnap.data().chunks || 0;

  const result = [];

  for (let i = 0; i < chunksCount; i++) {
    const ref = doc(db, COLLECTION, CHUNK_PREFIX + i);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data().data || [];
      result.push(...data);
    }
  }

  return result;
};

/* =========================
   CLEAR ALL
========================= */
export const clearSofaRows = async () => {
  const ref = doc(db, COLLECTION, META_DOC);

  await setDoc(ref, {
    chunks: 0,
    updatedAt: Date.now(),
  });
};
