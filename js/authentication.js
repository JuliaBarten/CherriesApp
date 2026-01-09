// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries


// ================== IMPORTS ==================
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";



function getFakeEmailFromUsername(username) {
  return `${username}@mail.com`;
}

async function register() {
  const usernameInput = document.getElementById("regUsername");
  const passwordInput = document.getElementById("regPassword");

  // Niet op deze pagina → niets doen
  if (!usernameInput || !passwordInput) {
    return;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  const email = getFakeEmailFromUsername(username);

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("Gebruikersnaam bestaat al");
    return;
  }

  if (!cred?.user) return;

  await setDoc(doc(db, "users", cred.user.uid), {
    username,
    email,
    profileCompleted: false,
    materialsOwned: [],
    createdAt: new Date()
  });

  window.location.href = "profiel-change.html";
}


// ================== LOGIN MET USERNAME ==================
async function login() {
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  const message = document.getElementById("message");

  //  Niet op loginpagina
  if (!usernameInput || !passwordInput) {
    return;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    message.innerText = "Vul gebruikersnaam en wachtwoord in";
    return;
  }

  try {
    const email = getFakeEmailFromUsername(username);
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "inspiration.html";
  } catch {
    message.innerText = "Combinatie gebruikers-wachtwoord is onjuist";
  }
}



// ================== BUTTONS ==================
// const registerBtn = document.getElementById("registerBtn");
// if (registerBtn) {
//   registerBtn.addEventListener("click", register);
// }

// const loginBtn = document.getElementById("loginBtn");
// if (loginBtn) {
//   loginBtn.addEventListener("click", login);
// }

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    register();
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    login();
  });
}
