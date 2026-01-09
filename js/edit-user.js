import { auth, db, storage } from "./firebase-init.js";
import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";


// ------------------ Profiel laden ------------------
async function loadProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();

  // Gebruikersnaam
  const usernameInput = document.getElementById("usernameInput");
  usernameInput.value = data.username || "";

  // Niveau
  updateHearts(data.level || 1);

  // Avatar
  const avatarPreview = document.getElementById("avatarPreview");
  if (data.avatar) {
    avatarPreview.src = data.avatar;
    avatarPreview.style.display = "block";
  }

  const avatarInput = document.getElementById("avatarInput");
  avatarInput?.addEventListener("change", () => {
    const file = avatarInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarPreview.src = e.target.result;
      avatarPreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  });

  // Materialen
  await loadMaterials(data);
}


let selectedLevel = 1; // standaard niveau

// ------------------ Sterren-niveau ------------------
function updateHearts(level) {
  const niveauIcons = document.querySelectorAll(".niveau-icon");
  niveauIcons.forEach(icon => {
    const iconLevel = parseInt(icon.dataset.level);
    icon.src = iconLevel <= level ? "images/icons/heart3.png" : "images/icons/heart4.png";
  });
  selectedLevel = level;
}

// Voeg klik-event toe aan sterren
document.querySelectorAll(".niveau-icon").forEach(icon => {
  icon.addEventListener("click", () => {
    const level = parseInt(icon.dataset.level);
    updateHearts(level);
  });
});

// ------------------ Materialen laden als blokken ------------------
async function loadMaterials(userData) {
  const materialenContainer = document.getElementById("makeMaterialenContainer");
  materialenContainer.innerHTML = "";

  const materialenSnapshot = await getDocs(collection(db, "Materialen"));
  materialenSnapshot.forEach(docSnap => {
    const m = docSnap.data();
    const materialName = m.Materiaal || m.naam || "Onbekend";

    const div = document.createElement("div");
    div.className = "material-blok";
    div.textContent = materialName;
    div.dataset.materialId = docSnap.id;

    // Geselecteerde materialen van userData aanvinken
    if (userData.materialsOwned?.includes(docSnap.id)) {
      div.classList.add("selected");
    }

    div.addEventListener("click", (e) => {
      if (e.target.classList.contains("material-blok")) {
        e.target.classList.toggle("selected");

        console.log("Klik:", div.textContent, div.classList.contains("selected"));
      }
    });


    materialenContainer.appendChild(div);
  });
}



// ------------------ Profiel opslaan ------------------
async function saveProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const username = document.getElementById("usernameInput").value.trim();
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const materialenContainer = document.getElementById("materialenContainer");

  // Geselecteerde materialen ophalen
  const selectedMaterials = Array.from(materialenContainer.querySelectorAll(".material-blok.selected"))
    .map(mblok => mblok.dataset.materialId);
  console.log("Geselecteerde materialen:", selectedMaterials);

  // Validatie
  if (!username) return alert("Vul je gebruikersnaam in!");
  if (!selectedMaterials.length) return alert("Selecteer minstens één materiaal!");
  if (!selectedLevel) return alert("Selecteer een niveau!");
  if (!avatarInput.files[0] && !avatarPreview.src) return alert("Upload een avatar!");

  // Avatar uploaden indien nieuw bestand
  let avatarUrl = avatarPreview.src;
  if (avatarInput.files[0]) {
    const storageRef = ref(storage, `avatars/${user.uid}`);
    await uploadBytes(storageRef, avatarInput.files[0]);
    avatarUrl = await getDownloadURL(storageRef);
  }

  // Update Firestore
  await updateDoc(doc(db, "users", user.uid), {
    username,
    level: selectedLevel,
    materialsOwned: selectedMaterials,
    avatar: avatarUrl,
    profileCompleted: true
  });


  alert("Profiel succesvol bijgewerkt!");
  window.location.href = "profiel.html";
}


// ------------------ Auth state ------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  await loadProfile(user);

  const saveBtn = document.getElementById("saveProfile");
  if (saveBtn) saveBtn.addEventListener("click", saveProfile);
});
