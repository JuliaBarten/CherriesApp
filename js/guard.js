// guard.js

import { auth, db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const currentPage = window.location.pathname.split("/").pop();

// wacht tot de gebruiker bekend is
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // alleen redirecten als de gebruiker echt niet ingelogd is
    // voeg hier eventueel een test-gebruiker in
    console.log("Geen gebruiker ingelogd, redirect naar aanmelden");
    // window.location.href = "aanmelden.html";
    return;
  }

  // Check profiel alleen als we niet op aanpassen.html zijn
  if (currentPage !== "aanpassen.html") {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && !snap.data().profileCompleted) {
      console.log("Profiel niet compleet, redirect naar aanpassen.html");
      window.location.href = "aanpassen.html";
    } else {
      console.log("Gebruiker ingelogd en profiel compleet, pagina blijft");
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
