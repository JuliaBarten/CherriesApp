import { auth, db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* =================== STATE =================== */
let tutorialCache = null;
let favoriteCache = [];
let allMaterials = [];
let userMaterials = [];
let materialMode = "all"; // "all" of "mine"
let activeSort = "new";   // default: nieuwste eerst
let isLoading = false;

/* =================== HELPERS =================== */
// Filter dropdown toggler
const filterToggle = document.getElementById("filterToggle");
const filterDropdown = document.getElementById("filterDropdown");
const applyFiltersBtn = document.getElementById("applyFilters");

filterToggle?.addEventListener("click", () => {
  filterDropdown.classList.toggle("open");
});

// Sluit dropdown als je op toepassen klikt
applyFiltersBtn?.addEventListener("click", () => {
  filterDropdown.classList.remove("open");
});

// Render hartjes
function renderHearts(level = 0) {
  let html = "";
  for (let i = 0; i < level; i++) {
    html += `<img src="images/icons/heart1.png" class="tut-card-ic" alt="hart">`;
  }
  return html;
}

/* =================== FAVORIETEN =================== */

async function loadFavorites(userId) {
  const snap = await getDocs(collection(db, "users", userId, "favorites"));
  favoriteCache = snap.docs.map(d => d.id);
}

async function addFavorite(userId, tutorialId) {
  await setDoc(doc(db, "users", userId, "favorites", tutorialId), { createdAt: new Date() });
  favoriteCache.push(tutorialId);
}

async function removeFavorite(userId, tutorialId) {
  await deleteDoc(doc(db, "users", userId, "favorites", tutorialId));
  favoriteCache = favoriteCache.filter(id => id !== tutorialId);
}

/* =================== TUTORIALS =================== */

// Render één tutorialkaart
function renderSingleTutorial(t) {
  const grid = document.getElementById("tutorialGrid");
  const isFavorite = favoriteCache.includes(t.id);

  const card = document.createElement("div");
  card.className = "tutorial-card";

  card.innerHTML = `
    <img src="${t.mainImageUrl}" alt="${t.title}" class="tutorial-image">
    <div class="favorite-btn">
      <img src="images/icons/${isFavorite ? "fav_aan.png" : "fav_uit.png"}" alt="Favoriet">
    </div>
    <div class="overlay">
      <div class="overlay-row hearts-row">
        ${renderHearts(t.level)}
      </div>
      <div class="overlay-row time-row">
        <span>${t.duration}</span>
        <img src="images/icons/tijd_klok.png" alt="klok">
      </div>
    </div>
  `;

  const favIcon = card.querySelector(".favorite-btn img");
  favIcon.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (favoriteCache.includes(t.id)) {
      await removeFavorite(auth.currentUser.uid, t.id);
      favIcon.src = "images/icons/fav_uit.png";
    } else {
      await addFavorite(auth.currentUser.uid, t.id);
      favIcon.src = "images/icons/fav_aan.png";
    }
  });

  card.addEventListener("click", () => {
    window.location.href = `make-project.html?id=${t.id}`;
  });

  grid.appendChild(card);
}

// Render alle tutorials gefilterd
function renderTutorialsFiltered() {
  const grid = document.getElementById("tutorialGrid");
  grid.innerHTML = "";

  if (!tutorialCache) return;

  // Filter tutorials op materialen
  let tutorialsToRender = tutorialCache.filter(t => {
    if (materialMode === "all") return true;
    return t.materials?.some(m => userMaterials.includes(m));
  });

  // Sorteer tutorials
  tutorialsToRender.sort((a, b) => {
    switch (activeSort) {
      case "old": return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      case "timeAsc": return (a.duration || 0) - (b.duration || 0);
      case "timeDesc": return (b.duration || 0) - (a.duration || 0);
      default: // nieuw -> oud
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    }
  });

  tutorialsToRender.forEach(renderSingleTutorial);
}

/* =================== MATERIALEN =================== */
async function loadAllMaterials() {
  const snap = await getDocs(collection(db, "Materialen"));
  allMaterials = snap.docs.map(docSnap => docSnap.data().Materiaal || docSnap.data().naam || docSnap.id);
}

async function loadUserMaterials(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  userMaterials = snap.data()?.materialsOwned || [];
}

// Render filter buttons
function setupMaterialFilters() {
  const btnAll = document.getElementById("materialsAll");
  const btnMine = document.getElementById("materialsMine");

  btnAll?.addEventListener("click", () => {
    materialMode = "all";
    btnAll.classList.add("active");
    btnMine.classList.remove("active");
    renderTutorialsFiltered();
  });

  btnMine?.addEventListener("click", () => {
    materialMode = "mine";
    btnMine.classList.add("active");
    btnAll.classList.remove("active");
    renderTutorialsFiltered();
  });
}


// Sorteer dropdown
const sortSelect = document.getElementById("sortSelect");
sortSelect?.addEventListener("change", () => {
  activeSort = sortSelect.value;
  renderTutorialsFiltered();
});

/* =================== INIT AUTH =================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // 1️⃣ data ophalen
  await Promise.all([
    loadUserMaterials(user),
    loadAllMaterials(),
    loadFavorites(user.uid)
  ]);

  // 2️⃣ defaults
  materialMode = "all";     // alle materialen
  activeSort = "new";       // nieuwste eerst

  // 3️⃣ UI hooks
  setupMaterialFilters();

  // 4️⃣ tutorials ophalen (1x)
  if (!tutorialCache) {
    const snap = await getDocs(collection(db, "tutorials"));
    tutorialCache = snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  }

  // 5️⃣ render
  renderTutorialsFiltered();
});
