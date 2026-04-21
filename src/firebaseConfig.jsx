import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDEFrHi8JpNG3F4doMQXGC72p7MhecwB0g",
  authDomain: "sofascreendata.firebaseapp.com",
  projectId: "sofascreendata",
  storageBucket: "sofascreendata.firebasestorage.app",
  messagingSenderId: "906413191286",
  appId: "1:906413191286:web:2d08d6b4463fed88efef57",
  measurementId: "G-5KT4FQQJE4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
