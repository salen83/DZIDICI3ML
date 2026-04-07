import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

// inicijalno kreiranje dokumenta ako ne postoji
export const initSofaRowsDoc = async () => {
  const docRef = doc(db, "sofaRows", "default");
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    await setDoc(docRef, { rows: [] });
  }
};

// čuvanje svih redova (prepisuje ceo niz u Firestore)
export const saveSofaRows = async (rows) => {
  const docRef = doc(db, "sofaRows", "default");
  await setDoc(docRef, { rows }); // merge nije potreban jer želimo sve redove
};

// učitavanje redova iz Firestore
export const loadSofaRows = async () => {
  const docRef = doc(db, "sofaRows", "default");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().rows || [];
  }
  return [];
};
