import { auth, db } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ------------------------------ RENDER PROFIEL ------------------

async function loadProfile(user) {
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data() || {};

    // --- Avatar ---
    const profileAvatar = document.getElementById("profileAvatar");
    profileAvatar.src = data.avatar && data.avatar.trim() !== ""
      ? data.avatar
      : "images/icons/avatar.png"; // fallback als geen avatar

    // --- Username ---
    const profileUsername = document.getElementById("profileUsername");
    profileUsername.textContent = data.username && data.username.trim() !== ""
      ? data.username
      : "Gebruiker";

    // --- Niveau ---
    const avatarLevel = document.getElementById("avatarLevel");
    avatarLevel.textContent = data.level || "1";

    // --- Materialen ---
    const materialenContainer = document.getElementById("profileMaterials");
    materialenContainer.innerHTML = "";

    if (data.materialsOwned && Array.isArray(data.materialsOwned) && data.materialsOwned.length > 0) {
      const materialenSnapshot = await getDocs(collection(db, "Materialen"));

      materialenSnapshot.forEach(docSnap => {
        const m = docSnap.data();
        if (data.materialsOwned.includes(docSnap.id)) {
          const div = document.createElement("div");
          div.className = "material-blok selected";
          div.textContent = m.Materiaal || m.naam || "Onbekend";
          materialenContainer.appendChild(div);
        }
      });
    } else {
      materialenContainer.innerHTML = "<p>Geen materialen toegevoegd</p>";
    }

  } catch (error) {
    console.error("Fout bij laden profiel:", error);
  }
}

// ------------------------------ INIT AUTH ------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "aanmelden.html";
  } else {
    await loadProfile(user);
  }
});
