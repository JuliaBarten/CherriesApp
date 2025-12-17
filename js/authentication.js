// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries


// ================== IMPORTS ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, getAnalytics, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ================== FIREBASE CONFIG ==================
const firebaseConfig = {
  apiKey: "AIzaSyBFpfyYMfgAlyozywN27mkCM8NODcUntOA",
  authDomain: "cherrysapp-de82f.firebaseapp.com",
  projectId: "cherrysapp-de82f",
  storageBucket: "cherrysapp-de82f.appspot.com",
  messagingSenderId: "662896896244",
  appId: "1:662896896244:web:4a7d8adf1364e3229c16a1"
};

// ================== INIT ==================
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// ================== REGISTREREN ==================
async function register() {
  const username = document.getElementById("regUsername").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;

  // gekozen radio ophalen
  const niveau = document.querySelector(
    'input[name="niveau"]:checked'
  ).value;

  // Check unieke username
  const q = query(collection(db, "users"), where("username", "==", username));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    console.log("Gebruikersnaam bestaat al");
    return;
  }

  // Firebase Auth gebruiker
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Opslaan username
  await setDoc(doc(db, "users", cred.user.uid), {
    username,
    email,
    niveau
  });
  where("username", "==", username.toLowerCase())

  console.log(username);
}

// ================== LOGIN MET USERNAME ==================
async function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const message = document.getElementById("message");

  if (!username || !password) {
    message.innerText = "Vul gebruikersnaam en wachtwoord in";
    return;
  }

  try {
    //  zoek email bij username
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      message.innerText = "Gebruikersnaam bestaat niet";
      return;
    }

    const email = snapshot.docs[0].data().email;

    // login via Firebase Auth
    await signInWithEmailAndPassword(auth, email, password);

    message.innerText = "Inloggen gelukt!";
    // window.location.href = "dashboard.html";
  } catch (error) {
    message.innerText = "Onjuist wachtwoord";
  }
}


// ================== BUTTONS ==================
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", register);
}

const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", login);
}




// Aanpassen profiel

// niveau oud
import { getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const snap = await getDoc(doc(db, "users", user.uid));
const data = snap.data();

document.getElementById("niveauSelect").value = data.niveau;

//niveau nieuw

import { updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";


onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  document.getElementById("saveNiveau").addEventListener("click", async () => {
    const nieuwNiveau =
      document.getElementById("niveauSelect").value;

    await updateDoc(userRef, {
      niveau: nieuwNiveau
    });

    alert("Niveau bijgewerkt!");
  });
});

