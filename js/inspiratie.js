import { auth, db } from "./firebase-init.js";
import {collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where, serverTimestamp} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* =================== STATE =================== */
let tutorialCache = null;
let favoriteCache = [];
let allMaterials = [];
let userMaterials = [];
let materialMode = "all";
let activeSort = "new";

/* =================== HELPERS =================== */
const filterToggle = document.getElementById("filterToggle");
const filterDropdown = document.getElementById("filterDropdown");
const applyFiltersBtn = document.getElementById("applyFilters");

filterToggle?.addEventListener("click", () => {
  filterDropdown?.classList.toggle("open");
});

applyFiltersBtn?.addEventListener("click", () => {
  filterDropdown?.classList.remove("open");
});

function renderHearts(level = 0) {
  let html = "";
  for (let i = 0; i < (level || 0); i++) {
    html += `<img src="images/icons/heart3.png" class="tut-card-ic" alt="hart">`;
  }
  return html;
}

function safeSeconds(ts) {
  return ts?.seconds || 0;
}

/* =================== FAVORIETEN =================== */
async function loadFavorites(userId) {
  const snap = await getDocs(collection(db, "users", userId, "favorites"));
  favoriteCache = snap.docs.map(d => d.id);
}

async function addFavorite(userId, tutorialId) {
  await setDoc(doc(db, "users", userId, "favorites", tutorialId), {
    createdAt: serverTimestamp?.() || new Date()
  });
  if (!favoriteCache.includes(tutorialId)) favoriteCache.push(tutorialId);
}

async function removeFavorite(userId, tutorialId) {
  await deleteDoc(doc(db, "users", userId, "favorites", tutorialId));
  favoriteCache = favoriteCache.filter(id => id !== tutorialId);
}

/* =================== TUTORIALS =================== */
function renderSingleTutorial(t) {
  const grid = document.getElementById("tutorialGrid");
  if (!grid) return;
  if (t.draft === true) return;

  const isFavorite = favoriteCache.includes(t.id);
  const card = document.createElement("div");
  card.className = "tutorial-card";

  card.innerHTML = `
    <img src="${t.mainImageUrl || ""}" alt="${t.title || "tutorial"}" class="tutorial-image">
    <div class="favorite-btn">
      <img src="images/icons/${isFavorite ? "fav_aan.png" : "fav_uit.png"}" alt="Favoriet">
    </div>
    <div class="overlay-make">
      <div class="overlay-row hearts-row">
        ${renderHearts(t.level)}
      </div>
      <div class="overlay-row time-row">
        <span>${t.duration || ""}</span>
        <img src="images/icons/tijd_klok.png" alt="klok">
      </div>
    </div>
  `;

  const favIcon = card.querySelector(".favorite-btn img");
  favIcon?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    if (favoriteCache.includes(t.id)) {
      await removeFavorite(uid, t.id);
      favIcon.src = "images/icons/fav_uit.png";
    } else {
      await addFavorite(uid, t.id);
      favIcon.src = "images/icons/fav_aan.png";
    }
  });

  card.addEventListener("click", () => {
    window.location.href = `make-project.html?id=${t.id}`;
  });

  grid.appendChild(card);
}

function renderTutorialsFiltered() {
  const grid = document.getElementById("tutorialGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!tutorialCache) return;

  let tutorialsToRender = tutorialCache;
  if (materialMode === "mine") {
    tutorialsToRender = tutorialsToRender.filter(t =>
      t.materials?.some(m => userMaterials.includes(m))
    );
  }

  tutorialsToRender.sort((a, b) => {
    switch (activeSort) {
      case "old":
        return safeSeconds(a.createdAt) - safeSeconds(b.createdAt);
      case "timeAsc":
        return (a.duration || "").localeCompare(b.duration || "");
      case "timeDesc":
        return (b.duration || "").localeCompare(a.duration || "");
      default:
        return safeSeconds(b.createdAt) - safeSeconds(a.createdAt);
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
  console.log("AUTH UID:", user?.uid);

  const userRef = doc(db, "users", user.uid);
  console.log("USER DOC PATH:", userRef.path);

  const snap = await getDoc(userRef);
  console.log("USER DOC EXISTS:", snap.exists());

  if (!snap.exists()) {
    userMaterials = [];
    return;
  }

  userMaterials = snap.data()?.materialsOwned || [];
}

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

const sortSelect = document.getElementById("sortSelect");
sortSelect?.addEventListener("change", () => {
  activeSort = sortSelect.value;
  renderTutorialsFiltered();
});

/* =================== INIT AUTH =================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  console.log("INIT: signed in", user.uid);

  try {
    console.log("INIT: loadUserMaterials...");
    await loadUserMaterials(user);
    console.log("INIT: loadUserMaterials OK");
  } catch (e) {
    console.error("INIT: loadUserMaterials FAILED", e);
    return;
  }

  try {
    console.log("INIT: loadAllMaterials...");
    await loadAllMaterials();
    console.log("INIT: loadAllMaterials OK");
  } catch (e) {
    console.error("INIT: loadAllMaterials FAILED", e);
    return;
  }

  try {
    console.log("INIT: loadFavorites...");
    await loadFavorites(user.uid);
    console.log("INIT: loadFavorites OK");
  } catch (e) {
    console.error("INIT: loadFavorites FAILED", e);
    return;
  }

  materialMode = "all";
  activeSort = "new";
  setupMaterialFilters();

  try {
    if (!tutorialCache) {
      console.log("INIT: load tutorials...");
      const q = query(collection(db, "tutorials"), where("draft", "==", false));
      const snap = await getDocs(q);
      tutorialCache = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      console.log("INIT: tutorials OK", tutorialCache.length);
    }
  } catch (e) {
    console.error("INIT: load tutorials FAILED", e);
    return;
  }

  renderTutorialsFiltered();
});

