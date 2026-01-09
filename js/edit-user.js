import { auth, db, storage } from "./firebase-init.js";
import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { renderAvatarPicker } from "./avatar-utils.js";

const AVATARS = [
  "images/avatar/premade/pm_1.png",
  "images/avatar/premade/pm_2.png",
  "images/avatar/premade/pm_3.png",
  "images/avatar/premade/pm_4.png",
  "images/avatar/premade/pm_5.png",
  "images/avatar/premade/pm_6.png"
];

let selectedAvatarIndex = 0; // Houdt bij welke avatar geselecteerd is
let selectedAvatar = AVATARS[selectedAvatarIndex];

const currentAvatarImg = document.getElementById("currentAvatar");
const prevBtn = document.getElementById("prevAvatar");
const nextBtn = document.getElementById("nextAvatar");

function updateAvatarPreview() {
  currentAvatarImg.src = AVATARS[selectedAvatarIndex];
  selectedAvatar = AVATARS[selectedAvatarIndex];
}

// Event listeners voor pijltjes
prevBtn.addEventListener("click", () => {
  selectedAvatarIndex = (selectedAvatarIndex - 1 + AVATARS.length) % AVATARS.length;
  updateAvatarPreview();
});

nextBtn.addEventListener("click", () => {
  selectedAvatarIndex = (selectedAvatarIndex + 1) % AVATARS.length;
  updateAvatarPreview();
});

// ------------------ Profiel laden ------------------
async function loadProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();

  // gebruikersnaam
  document.getElementById("usernameInput").value = data.username || "";

  // niveau
  updateHearts(data.level || 1);

  // avatar
  const avatarCarousel = document.getElementById("avatarCarousel");
  const avatarPreview = document.getElementById("avatarPreview");

  if (avatarCarousel && avatarPreview) {
    renderAvatarPicker(avatarCarousel, (avatar) => {
      selectedAvatar = avatar;
      avatarPreview.src = avatar;
    });

    // Zet huidige avatar
    if (data.avatar) {
      const index = AVATARS.findIndex(src => src === data.avatar);
      if (index >= 0) selectedAvatarIndex = index;
    }
    updateAvatarPreview();

  }

  // materialen
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
  const materialenContainer = document.getElementById("materialenContainer");
  if (!materialenContainer) {
    console.warn("materialenContainer niet gevonden");
    return;
  }

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

    console.log("Materials owned:", userData.materialsOwned);
    materialenContainer.appendChild(div);
  });
}



// ------------------ Profiel opslaan ------------------
async function saveProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const username = document.getElementById("usernameInput").value.trim();
  const materialenContainer = document.getElementById("materialenContainer");

  // Geselecteerde materialen ophalen
  const selectedMaterials = Array.from(materialenContainer.querySelectorAll(".material-blok.selected"))
    .map(mblok => mblok.dataset.materialId);

  console.log("Geselecteerde materialen:", selectedMaterials);

  // Validatie
  if (!username) return alert("Vul je gebruikersnaam in!");
  if (!selectedLevel) return alert("Selecteer een niveau!");
  if (!selectedAvatar) return alert("Kies een avatar!");

  // Update Firestore
  await updateDoc(doc(db, "users", user.uid), {
    username,
    level: selectedLevel,
    materialsOwned: selectedMaterials,
    avatar: selectedAvatar,
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
