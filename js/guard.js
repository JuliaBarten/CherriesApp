
import { auth, db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const currentPage = window.location.pathname.split("/").pop();
const allowAnonymous = [
  "index.html",
  "aanmelden.html",
  "login.html"
];

// // wacht tot de gebruiker bekend is
// onAuthStateChanged(auth, async (user) => {
//   if (allowAnonymous.includes(currentPage)) {
//     return;
//   }

//   if (!user) {
//     console.log("Geen gebruiker ingelogd, redirect naar index");
//     window.location.href = "index.html";
//     return;
//   }

//   // Check profiel alleen als we niet op aanpassen.html zijn
//   if (currentPage !== "aanpassen.html") {
//     const snap = await getDoc(doc(db, "users", user.uid));
//     if (snap.exists() && !snap.data().profileCompleted) {
//       console.log("Profiel niet compleet, redirect naar aanpassen.html");
//       window.location.href = "aanpassen.html";
//     } else {
//       console.log("Gebruiker ingelogd en profiel compleet, pagina blijft");
//     }
//   }
// });

let authChecked = false;

onAuthStateChanged(auth, async (user) => {
  if (authChecked) return;
  authChecked = true;

  if (allowAnonymous.includes(currentPage)) return;

  if (!user) {
    console.log("Niet ingelogd → redirect");
    window.location.replace("index.html");
    return;
  }

  if (currentPage !== "aanpassen.html") {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && !snap.data().profileCompleted) {
      window.location.replace("aanpassen.html");
    }
  }
});



// Profiel check functie blijft hetzelfde
export async function requireProfile(fields = []) {
  const user = auth.currentUser;
  if (!user) return { ok: false, reason: "notLoggedIn" };

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return { ok: false, reason: "noProfile" };

  const data = snap.data();
  for (const field of fields) {
    if (!data[field] || (Array.isArray(data[field]) && data[field].length === 0)) {
      return { ok: false, reason: "missing", field };
    }
  }

  return { ok: true, data };
}
