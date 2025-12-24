import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFpfyYMfgAlyozywN27mkCM8NODcUntOA",
  authDomain: "cherrysapp-de82f.firebaseapp.com",
  projectId: "cherrysapp-de82f",
  storageBucket: "cherrysapp-de82f.appspot.com",
  messagingSenderId: "662896896244",
  appId: "1:662896896244:web:4a7d8adf1364e3229c16a1"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


