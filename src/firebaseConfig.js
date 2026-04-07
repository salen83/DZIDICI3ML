import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Tvoja konfiguracija koju si dobio u Firebase-u
const firebaseConfig = {
  apiKey: "AIzaSyDEFrHi8JpNG3F4doMQXGC72p7MhecwB0g",
  authDomain: "sofascreendata.firebaseapp.com",
  projectId: "sofascreendata",
  storageBucket: "sofascreendata.firebasestorage.app",
  messagingSenderId: "906413191286",
  appId: "1:906413191286:web:2d08d6b4463fed88efef57",
  measurementId: "G-5KT4FQQJE4"
};

// Inicijalizacija Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // opcionalno
const db = getFirestore(app);

export { app, analytics, db };
