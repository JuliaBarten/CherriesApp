import { auth, db } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let authChecked = false;

// ------------------------------ RENDER PROFIEL ------------------
async function loadProfile(user) {
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data() || {};

    document.getElementById("profileAvatar").src =
      data.avatar?.trim()
        ? data.avatar
        : "images/icons/avatar.png";

    document.getElementById("profileUsername").textContent =
      data.username?.trim()
        ? data.username
        : "Gebruiker";

    document.getElementById("avatarLevel").textContent =
      data.level || "1";

    const materialenContainer = document.getElementById("profileMaterials");
    materialenContainer.innerHTML = "";

    if (Array.isArray(data.materialsOwned) && data.materialsOwned.length > 0) {
      const materialenSnapshot = await getDocs(collection(db, "Materialen"));

      materialenSnapshot.forEach(docSnap => {
        if (data.materialsOwned.includes(docSnap.id)) {
          const div = document.createElement("div");
          div.className = "material-blok selected";
          div.textContent =
            docSnap.data().Materiaal ||
            docSnap.data().naam ||
            "Onbekend";
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

// ------------------------------ AUTH INIT ------------------
onAuthStateChanged(auth, async (user) => {
  if (authChecked) return; // voorkomt dubbele triggers
  authChecked = true;

  if (!user) {
    // 👇 kleine vertraging voorkomt mobile race-condition
    setTimeout(() => {
      if (!auth.currentUser) {
        window.location.href = "aanmelden.html";
      }
    }, 300);
  } else {
    await loadProfile(user);
  }
});
