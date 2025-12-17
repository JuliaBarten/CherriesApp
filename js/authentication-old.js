// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBFpfyYMfgAlyozywN27mkCM8NODcUntOA",
  authDomain: "cherrysapp-de82f.firebaseapp.com",
  projectId: "cherrysapp-de82f",
  storageBucket: "cherrysapp-de82f.firebasestorage.app",
  messagingSenderId: "662896896244",
  appId: "1:662896896244:web:4a7d8adf1364e3229c16a1",
  measurementId: "G-YLY36ZVKKV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);


//firebase initieren
function loginFunc() {

  let email = document.getElementById("persEmail").value;
  let wachtwoord = document.getElementById("persWachtwoord").value;
  createUserWithEmailAndPassword(auth, email, wachtwoord).then(() => console.log("jeej")).catch((e) => console.log(e))
  console.log (email);
};

document.getElementById("submitLogin").onclick = loginFunc
