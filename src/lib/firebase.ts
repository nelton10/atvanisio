import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDfQYDmOHqb6YspPDmHS_mXPILPsSC9tAM",
  authDomain: "nelton-costa.firebaseapp.com",
  projectId: "nelton-costa",
  storageBucket: "nelton-costa.firebasestorage.app",
  messagingSenderId: "644251918687",
  appId: "1:644251918687:web:4afc7387ca5d421687d6ea",
  measurementId: "G-0FLEFMPQ77"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
