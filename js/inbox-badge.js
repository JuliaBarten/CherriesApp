// js/inbox-badge.js
import { auth, db } from "./firebase-init.js";
import {
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

function setBadge(count) {
  const badge = document.getElementById("inboxBadge");
  if (!badge) return;

  if (count > 0) {
    badge.textContent = String(count);
    badge.classList.remove("hidden");
  } else {
    badge.textContent = "";
    badge.classList.add("hidden");
  }
}

let unsub = null;

onAuthStateChanged(auth, (user) => {
  // badge leeg als uitgelogd
  if (!user) {
    if (unsub) unsub();
    unsub = null;
    setBadge(0);
    return;
  }

  // voorkom dubbele listeners als script per ongeluk 2x geladen wordt
  if (unsub) unsub();

  const q = query(
    collection(db, "users", user.uid, "inbox"),
    where("archived", "==", false),
    where("read", "==", false)
  );

  unsub = onSnapshot(q, (snap) => {
    setBadge(snap.size);
  }, (err) => {
    console.error("inbox badge listener error:", err);
    // fallback: badge uit
    setBadge(0);
  });
});
