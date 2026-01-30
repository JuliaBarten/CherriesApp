import { auth, db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* =================== STATE =================== */
let tutorialCache = null;
let favoriteCache = [];
let userMaterials = [];
let materialMode = "all";
let activeSort = "new";
let activeCategory = ""; // "" = alles
let activeLevel = "";    // "" = alle niveaus
let myLevel = 0;

/* =================== UI =================== */
const filterToggle = document.getElementById("filterToggle");
const filterDropdown = document.getElementById("filterDropdown");
const applyFiltersBtn = document.getElementById("applyFilters");
const sortSelect = document.getElementById("sortSelect");

filterToggle?.addEventListener("click", () => {
  filterDropdown?.classList.toggle("open");
});

applyFiltersBtn?.addEventListener("click", () => {
  readUiFilters();
  renderTutorialsFiltered();
  filterDropdown?.classList.remove("open");
});

sortSelect?.addEventListener("change", () => {
  activeSort = sortSelect.value;
  renderTutorialsFiltered();
});

/* =================== HELPERS =================== */
function safeSeconds(ts) {
  return ts?.seconds || 0;
}

function renderHearts(level = 0) {
  let html = "";
  for (let i = 0; i < level; i++) {
    html += `<img src="images/icons/heart3.png" class="tut-card-ic" alt="hart">`;
  }
  return html;
}

/* =================== FAVORIETEN =================== */
async function loadFavorites(uid) {
  const snap = await getDocs(collection(db, "users", uid, "favorites"));
  favoriteCache = snap.docs.map(d => d.id);
}

async function addFavorite(uid, tutorialId) {
  await setDoc(doc(db, "users", uid, "favorites", tutorialId), {
    createdAt: serverTimestamp()
  });
  if (!favoriteCache.includes(tutorialId)) favoriteCache.push(tutorialId);
}

async function removeFavorite(uid, tutorialId) {
  await deleteDoc(doc(db, "users", uid, "favorites", tutorialId));
  favoriteCache = favoriteCache.filter(id => id !== tutorialId);
}

/* =================== RENDER =================== */
function renderSingleTutorial(t) {
  const grid = document.getElementById("tutorialGrid");
  if (!grid || t.draft) return;

  const isFavorite = favoriteCache.includes(t.id);
  const card = document.createElement("div");
  card.className = "tutorial-card";

  card.innerHTML = `
    <img src="${t.mainImageUrl || ""}" class="tutorial-image">
    <div class="favorite-btn">
      <img src="images/icons/${isFavorite ? "fav_aan.png" : "fav_uit.png"}">
    </div>
    <div class="overlay-make">
      <div class="overlay-row hearts-row">${renderHearts(t.level)}</div>
      <div class="overlay-row time-row">
        <span>${t.duration || ""}</span>
        <img src="images/icons/tijd_klok.png">
      </div>
    </div>
  `;

  card.querySelector(".favorite-btn img")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    if (isFavorite) {
      await removeFavorite(uid, t.id);
      e.target.src = "images/icons/fav_uit.png";
    } else {
      await addFavorite(uid, t.id);
      e.target.src = "images/icons/fav_aan.png";
    }
  });

  card.addEventListener("click", () => {
    window.location.href = `make-project.html?id=${t.id}`;
  });

  grid.appendChild(card);
}

/* =================== FILTER LOGICA =================== */
function readUiFilters() {
  activeCategory = document.getElementById("categorySelect")?.value || "";
  activeLevel = document.getElementById("levelSelect")?.value || "";
}

function renderTutorialsFiltered() {
  const grid = document.getElementById("tutorialGrid");
  if (!grid || !tutorialCache) return;
  grid.innerHTML = "";

  let list = [...tutorialCache];

  // materialen
  if (materialMode === "mine") {
    list = list.filter(t => t.materials?.some(m => userMaterials.includes(m)));
  }

  // categorie
  if (activeCategory) {
    list = list.filter(t => t.category === activeCategory);
  }

  // niveau
  if (activeLevel === "myLevelOnly" && myLevel > 0) {
    list = list.filter(t => Number(t.level) === myLevel);
  }
  if (activeLevel === "myLevelOrLower" && myLevel > 0) {
    list = list.filter(t => Number(t.level) <= myLevel);
  }

  // sorteren
  list.sort((a, b) => {
    switch (activeSort) {
      case "old": return safeSeconds(a.createdAt) - safeSeconds(b.createdAt);
      case "timeAsc": return (a.duration || "").localeCompare(b.duration || "");
      case "timeDesc": return (b.duration || "").localeCompare(a.duration || "");
      default: return safeSeconds(b.createdAt) - safeSeconds(a.createdAt);
    }
  });

  list.forEach(renderSingleTutorial);
}

/* =================== MATERIAL FILTER =================== */
function setupMaterialFilters() {
  const btnAll = document.getElementById("materialsAll");
  const btnMine = document.getElementById("materialsMine");

  btnAll?.addEventListener("click", () => {
    materialMode = "all";
    btnAll.classList.add("active");
    btnMine?.classList.remove("active");
    renderTutorialsFiltered();
  });

  btnMine?.addEventListener("click", () => {
    materialMode = "mine";
    btnMine.classList.add("active");
    btnAll?.classList.remove("active");
    renderTutorialsFiltered();
  });
}

/* =================== INIT =================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (userSnap.exists()) {
    userMaterials = userSnap.data()?.materialsOwned || [];
    myLevel = Number(userSnap.data()?.level || 0);
  }

  await loadFavorites(user.uid);
  setupMaterialFilters();

  const snap = await getDocs(
    query(collection(db, "tutorials"), where("draft", "==", false))
  );

  tutorialCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTutorialsFiltered();
});
