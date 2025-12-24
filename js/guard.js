// guard.js
import { auth, db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const currentPage = window.location.pathname.split("/").pop();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "aanmelden.html";
    return;
  }

  if (currentPage !== "aanpassen.html") {
    const snap = await getDoc(doc(db, "users", user.uid));

    // Alleen redirecten als profiel incompleet is
    if (snap.exists() && !snap.data().profileCompleted) {
      window.location.href = "aanpassen.html";
    }
  }
});


// Functie om te checken of profielvelden ingevuld zijn
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
