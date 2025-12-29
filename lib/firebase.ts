// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDGruqBeL4Zjknh8MZCo35mexLxuWgLqvE",
  authDomain: "stock-tracker-1911f.firebaseapp.com",
  projectId: "stock-tracker-1911f",
  storageBucket: "stock-tracker-1911f.firebasestorage.app",
  messagingSenderId: "528492406708",
  appId: "1:528492406708:web:aa5bf04f7659a630fbf4e1",
  measurementId: "G-KXBWN2SWCX",
  databaseURL: "https://stock-tracker-1911f-default-rtdb.firebaseio.com/",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getDatabase(app);
export const storage = getStorage(app);
