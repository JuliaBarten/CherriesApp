import { auth, db } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  // profiel avatar
  const profileAvatar = document.getElementById("profileAvatar");
  if (profileAvatar && data.avatar) {
    profileAvatar.src = data.avatar;
  }

  // navbar avatar
  const navbarAvatar = document.getElementById("navbarAvatar");
  if (navbarAvatar && data.avatar) {
    navbarAvatar.src = data.avatar;
  }

  // username
  const nameEl = document.getElementById("profileUsername");
  if (nameEl) nameEl.innerText = data.username;

  // niveau tonen
  const levelIcon = document.getElementById("avatarLevelIcon");
  if (levelIcon) {
    // standaard niveau = 1
    const level = data.level || 1;
    levelIcon.src = `images/icons/niveau_${level}.png`;
  }


  // materialen
  const materialsContainer = document.getElementById("profileMaterials");
  if (materialsContainer) {
    materialsContainer.innerHTML = ""; // eerst leegmaken
    const materialenSnapshot = await getDocs(collection(db, "Materialen")); // alle materialen ophalen
    materialenSnapshot.forEach(docSnap => {
      const m = docSnap.data();
      const materialName = m.Materiaal || m.naam || "Onbekend";

      const div = document.createElement("div");
      div.className = "material-blok";

      // Check of gebruiker dit materiaal bezit
      if (data.materialsOwned?.includes(docSnap.id)) {
        div.classList.add("selected");
      }

      div.innerText = materialName;
      materialsContainer.appendChild(div);
    });
  }
});
