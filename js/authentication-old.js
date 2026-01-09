// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries


// ================== IMPORTS ==================
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, setDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

//==================== wie is ingelogd===================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Ingelogd:", user.uid);
  } else {
    console.log("Niet ingelogd");
    window.location.href = "index.html";
  }
});

function getFakeEmailFromUsername(username) {
  return `${username}@mail.com`;
}

async function register() {
  const username = document.getElementById("regUsername").value;
  // const email = document.getElementById("regEmail").value;
  const email = getFakeEmailFromUsername(username);
  const password = document.getElementById("regPassword").value;

  // // unieke username check
  // const q = query(collection(db, "users"), where("username", "==", username));
  // const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    alert("Gebruikersnaam bestaat al");
    return;
  }

  // gebruiker aanmaken
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // 🔹 USER DOCUMENT AANMAKEN
  await setDoc(doc(db, "users", cred.user.uid), {
    username,
    email,
    level: null,
    materialsOwned: [],
    avatar: null,
    profileCompleted: false,
    createdAt: new Date()
  });

  // 🔹 ALLEEN HIER REDIRECT
  window.location.href = "profiel-change.html";
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

  // Verwijder mogelijke foutmelding van vorige poging.
  message.innerText = "";

  try {
    const email = getFakeEmailFromUsername(username);

    // login via Firebase Auth
    await signInWithEmailAndPassword(auth, email, password);

    message.innerText = "Inloggen gelukt!";
    window.location.href = "inspiration.html";
  } catch (error) {
    message.innerText = "Combinatie gebruikers-wachtwoord is onjuist";
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

