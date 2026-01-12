import { auth, db } from "./firebase-init.js";
import { doc, getDoc, updateDoc } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ================= URL PARAM ================= */
const params = new URLSearchParams(window.location.search);
const profileUid = params.get("uid");

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const uidToLoad = profileUid || user.uid;
  const isOwnProfile = uidToLoad === user.uid;

  await loadProfile(uidToLoad);

  // 👇 Alleen eigen profiel mag bewerken
  if (!isOwnProfile) {
    document.body.classList.add("viewing-other-profile");
    document.getElementById("editProfileBtn")?.remove();
    document.getElementById("saveProfile")?.remove();
    return;
  }

  // 👇 Alleen hier opslaan toestaan
  document
    .getElementById("saveProfile")
    ?.addEventListener("click", async () => {
      const niveau = document.getElementById("niveauSelect").value;

      await updateDoc(doc(db, "users", user.uid), {
        level: Number(niveau),
        profileCompleted: true
      });

      window.location.href = "index.html";
    });
});

/* ================= LOAD PROFILE ================= */
// async function loadProfile(uid) {
//   const snap = await getDoc(doc(db, "users", uid));
//   if (!snap.exists()) return;

//   const data = snap.data();

//   document.getElementById("profileUsername").textContent =
//     data.username || "Gebruiker";

//   document.getElementById("profileAvatar").src =
//     data.avatar || "images/avatar/default.png";

//   document.getElementById("profileLevel").src =
//     `images/icons/niveau_${data.level || 1}.png`;
// }

async function loadProfile(uidToLoad, currentUid) {
  const snap = await getDoc(doc(db, "users", uidToLoad));
  if (!snap.exists()) return;

  const data = snap.data();

  const usernameEl = document.getElementById("profileUsername");
  const avatarEl = document.getElementById("profileAvatar");
  const levelEl = document.getElementById("profileLevel");

  if (usernameEl) usernameEl.textContent = data.username;
  if (avatarEl) avatarEl.src = data.avatar || "images/avatar/default.png";
  if (levelEl) {
    levelEl.src = `images/icons/niveau_${data.level || 1}.png`;
  }

  if (uidToLoad !== currentUid) {
    document.body.classList.add("viewing-other-profile");
    document.getElementById("editProfileBtn")?.remove();
  }
}
