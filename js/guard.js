
import { auth, db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const currentPage = window.location.pathname.split("/").pop();
const allowAnonymous = [
  "index.html",
  "aanmelden.html",
  "login.html"
];

const profileEditPages = [
  "aanpassen.html",
  "profiel-change.html",
  "avatarmaker.html"
];

onAuthStateChanged(auth, async (user) => {
  if (allowAnonymous.includes(currentPage)) return;

  if (!user) {
        console.log("Niet ingelogd → redirect");
    window.location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (
    snap.exists() &&
    !snap.data().profileCompleted &&
    !profileEditPages.includes(currentPage)
  ) {
    window.location.href = "profiel-change.html";
  }
});


export async function requireProfile(fields = []) {
  const user = auth.currentUser;
  if (!user) return { ok: false, reason: "notLoggedIn" };

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return { ok: false, reason: "noProfile" };

  const data = snap.data();

  for (const field of fields) {
    if (!(field in data)) {
      return { ok: false, reason: "missing", field };
    }

    // ⚠️ lege arrays zijn toegestaan
    if (Array.isArray(data[field])) continue;

    if (!data[field]) {
      return { ok: false, reason: "missing", field };
    }
  }

  return { ok: true, data };
}
