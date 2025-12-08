import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBhL-GfqIUGrh8SGLeHPrMw4EE3905upEE",
    authDomain: "monopolibank-8b65a.firebaseapp.com",
    projectId: "monopolibank-8b65a",
    storageBucket: "monopolibank-8b65a.firebasestorage.app",
    messagingSenderId: "503826484304",
    appId: "1:503826484304:web:dc2fedeca52240d92ed555",
    measurementId: "G-PBWJ2F70NR"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
