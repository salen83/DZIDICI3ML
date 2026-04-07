import { db } from './firebaseConfig';
import { collection, setDoc, doc, getDocs } from 'firebase/firestore';

const sofaCollection = collection(db, 'sofaRows');

// Snimi sve mečeve
export const saveSofaRows = async (rows) => {
  try {
    for (let row of rows) {
      const rowDoc = doc(sofaCollection, String(row.rb));
      await setDoc(rowDoc, row);
    }
  } catch (err) {
    console.error('Firebase save error:', err);
  }
};

// Učitaj sve mečeve
export const loadSofaRows = async () => {
  try {
    const snapshot = await getDocs(sofaCollection);
    const rows = snapshot.docs.map(doc => doc.data());
    rows.sort((a,b) => a.rb - b.rb);
    return rows;
  } catch (err) {
    console.error('Firebase load error:', err);
    return [];
  }
};
