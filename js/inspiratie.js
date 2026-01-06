import { auth, db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* =================== STATE =================== */
let tutorialCache = null;
let favoriteCache = [];
let isLoading = false;

/* =================== HELPERS =================== */

// ❤️ Hartjes
function renderHearts(level = 0) {
  let html = "";
  for (let i = 0; i < level; i++) {
    html += `<img src="images/icons/heart1.png" class="tut-card-ic" alt="hart">`;
  }
  return html;
}

/* =================== FAVORIETEN =================== */

async function loadFavorites(userId) {
  const snap = await getDocs(
    collection(db, "users", userId, "favorites")
  );
  favoriteCache = snap.docs.map(d => d.id);
}

async function addFavorite(userId, tutorialId) {
  await setDoc(
    doc(db, "users", userId, "favorites", tutorialId),
    { createdAt: new Date() }
  );
  favoriteCache.push(tutorialId);
}

async function removeFavorite(userId, tutorialId) {
  await deleteDoc(
    doc(db, "users", userId, "favorites", tutorialId)
  );
  favoriteCache = favoriteCache.filter(id => id !== tutorialId);
}

/* =================== TUTORIALS =================== */
async function loadTutorials(user) {
  if (isLoading) return;
  isLoading = true;

  const grid = document.getElementById("tutorialGrid");
  if (!grid) return;

  // 🦴 Skeleton (optioneel maar sterk aangeraden)
  if (!tutorialCache) {
    grid.innerHTML = `
      <div class="tutorial-skeleton skeleton"></div>
      <div class="tutorial-skeleton skeleton"></div>
      <div class="tutorial-skeleton skeleton"></div>
    `;
  }

  // 1️⃣ tutorials ophalen (alleen eerste keer)
  if (!tutorialCache) {
    const snap = await getDocs(collection(db, "tutorials"));
    tutorialCache = snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  }

  // 2️⃣ favorieten ophalen
  await loadFavorites(user.uid);

  // 3️⃣ render
  renderTutorials(user);

  isLoading = false;
}
// Filter dropdown
const filterToggle = document.getElementById("filterToggle");
const filterDropdown = document.getElementById("filterDropdown");

if (filterToggle && filterDropdown) {
  filterToggle.addEventListener("click", () => {
    filterDropdown.classList.toggle("open");
  });
}
document.getElementById("applyFilters")?.addEventListener("click", () => {
  filterDropdown.classList.remove("open");
});


function renderTutorials(user) {
  const grid = document.getElementById("tutorialGrid");
  grid.innerHTML = "";

  for (const t of tutorialCache) {
    const isFavorite = favoriteCache.includes(t.id);

    const card = document.createElement("div");
    card.className = "tutorial-card";

    card.innerHTML = `
      <img src="${t.mainImageUrl}" alt="${t.title}" class="tutorial-image">

      <div class="favorite-btn">
        <img 
          src="images/icons/${isFavorite ? "fav_aan.png" : "fav_uit.png"}"
          alt="Favoriet"
        >
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
        await removeFavorite(user.uid, t.id);
        favIcon.src = "images/icons/fav_uit.png";
      } else {
        await addFavorite(user.uid, t.id);
        favIcon.src = "images/icons/fav_aan.png";
      }
    });

    // 👉 openen van tutorial
    card.addEventListener("click", () => {
      window.location.href = `make-project.html?id=${t.id}`;
    });

    grid.appendChild(card);
  }
}

/* =================== AUTH =================== */

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadTutorials(user);
});
