import { auth, db } from "./firebase-init.js";
import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const AVATARS = [
  "images/avatar/premade/pm_2.png",
  "images/avatar/premade/pm_3.png",
  "images/avatar/premade/pm_5.png",
  "images/avatar/premade/pm_1.png",
  "images/avatar/premade/pm_6.png",
  "images/avatar/premade/pm_7.png",
  "images/avatar/premade/pm_4.png",
];

let selectedAvatarIndex = 0;
let selectedAvatar = AVATARS[0];
let selectedLevel = 1;

// DOM
const currentAvatarImg = document.getElementById("currentAvatar");
const prevBtn = document.getElementById("prevAvatar");
const nextBtn = document.getElementById("nextAvatar");
const saveBtn = document.getElementById("saveProfile");

function updateAvatarPreview() {
  if (!currentAvatarImg) return;
  currentAvatarImg.src = AVATARS[selectedAvatarIndex];
  selectedAvatar = AVATARS[selectedAvatarIndex];
}

// Carousel controls
prevBtn?.addEventListener("click", () => {
  selectedAvatarIndex = (selectedAvatarIndex - 1 + AVATARS.length) % AVATARS.length;
  updateAvatarPreview();
});

nextBtn?.addEventListener("click", () => {
  selectedAvatarIndex = (selectedAvatarIndex + 1) % AVATARS.length;
  updateAvatarPreview();
});

// Hearts / level
function updateHearts(level) {
  const icons = document.querySelectorAll(".niveau-icon");
  icons.forEach((icon) => {
    const iconLevel = Number(icon.dataset.level);
    icon.src = iconLevel <= level ? "images/icons/heart3.png" : "images/icons/heart4.png";
  });
  selectedLevel = level;
}

document.querySelectorAll(".niveau-icon").forEach((icon) => {
  icon.addEventListener("click", () => {
    const level = Number(icon.dataset.level);
    updateHearts(level);
  });
});

// Materialen
async function loadMaterials(userData) {
  const container = document.getElementById("materialenContainer");
  if (!container) {
    console.warn("materialenContainer niet gevonden");
    return;
  }

  container.innerHTML = "";
  const materialenSnapshot = await getDocs(collection(db, "Materialen"));

  materialenSnapshot.forEach((docSnap) => {
    const m = docSnap.data();
    const name = m.Materiaal || m.naam || "Onbekend";

    const div = document.createElement("div");
    div.className = "material-blok";
    div.textContent = name;
    div.dataset.materialId = docSnap.id;

    if (userData.materialsOwned?.includes(docSnap.id)) {
      div.classList.add("selected");
    }

    div.addEventListener("click", () => div.classList.toggle("selected"));
    container.appendChild(div);
  });
}

// Profiel laden
async function loadProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  // username
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) usernameInput.value = data.username || "";

  // level
  updateHearts(Number(data.level || 1));

  // avatar (kies juiste index)
  if (data.avatar) {
    const idx = AVATARS.findIndex((src) => src === data.avatar);
    selectedAvatarIndex = idx !== -1 ? idx : 0;
  } else {
    selectedAvatarIndex = 0;
  }
  updateAvatarPreview();

  // materialen
  await loadMaterials(data);
}

// Opslaan
async function saveProfile(user) {
  const username = document.getElementById("usernameInput")?.value?.trim() || "";
  const container = document.getElementById("materialenContainer");

  const selectedMaterials = container
    ? Array.from(container.querySelectorAll(".material-blok.selected")).map((el) => el.dataset.materialId)
    : [];

  if (!username) return alert("Vul je gebruikersnaam in!");
  if (!selectedLevel) return alert("Selecteer een niveau!");
  if (!selectedAvatar) return alert("Kies een avatar!");

  await updateDoc(doc(db, "users", user.uid), {
    username,
    username_lower: username.toLowerCase(),
    level: Number(selectedLevel),
    materialsOwned: selectedMaterials,
    avatar: selectedAvatar,
    profileCompleted: true,
  });

  window.location.href = "profile.html";
}

// Auth gate + init
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"; // of login.html
    return;
  }

  await loadProfile(user);

  saveBtn?.addEventListener("click", () => saveProfile(user));
});
