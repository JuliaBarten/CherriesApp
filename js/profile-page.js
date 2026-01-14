import { auth, db } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const profileUid = params.get("uid"); // kan null zijn

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // 1) Navbar avatar altijd van ingelogde user
  await loadNavbarAvatar(user.uid);

  // 2) Bepaal welk profiel je wil bekijken
  const uidToLoad = profileUid || user.uid;
  const isOwnProfile = uidToLoad === user.uid;

  // 3) Laad profieldata voor uidToLoad
  await loadProfile(uidToLoad);

  // 4) Verberg edit-knop als je iemand anders bekijkt
  if (!isOwnProfile) {
    document.body.classList.add("viewing-other-profile");
    document.getElementById("editProfileBtn")?.remove();
  }
});

async function loadNavbarAvatar(currentUid) {
  const snap = await getDoc(doc(db, "users", currentUid));
  if (!snap.exists()) return;

  const data = snap.data();
  const navbarAvatar = document.getElementById("navbarAvatar");
  if (navbarAvatar) {
    navbarAvatar.src = data.avatar || "images/avatar/default.png";
  }
}

async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const data = snap.data();

  // username
  const nameEl = document.getElementById("profileUsername");
  if (nameEl) nameEl.textContent = data.username || "Gebruiker";

  // avatar
  const avatarEl = document.getElementById("profileAvatar");
  if (avatarEl) avatarEl.src = data.avatar || "images/avatar/default.png";

  // level icoon (jouw HTML gebruikt avatarLevelIcon)
  const levelEl = document.getElementById("avatarLevelIcon");
  if (levelEl) {
    const level = data.level || 1;
    levelEl.src = `images/icons/niveau_${level}.png`;
  }

  // materialen tonen (alleen de geselecteerde als 'selected')
  const container = document.getElementById("profileMaterials");
  if (container) {
    container.innerHTML = "";

    const materialenSnap = await getDocs(collection(db, "Materialen"));
    materialenSnap.forEach((mDoc) => {
      const m = mDoc.data();
      const materialName = m.Materiaal || m.naam || "Onbekend";

      const div = document.createElement("div");
      div.className = "material-blok";
      div.textContent = materialName;

      if (data.materialsOwned?.includes(mDoc.id)) {
        div.classList.add("selected");
      }

      container.appendChild(div);
    });
  }
}
