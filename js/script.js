

//  ------------------------ menu ------------------------------
const current = window.location.pathname.split("/").pop();
document.querySelectorAll('footer a').forEach(link => {
  if (link.getAttribute('href') === current) {
    link.classList.add('active');
  }
});


// --------------------------- fotowall -----------------------
const items = document.querySelectorAll(".item");


//https://dev.to/okonkwomandy/the-easiest-way-to-build-the-pinterest-layout-without-using-a-framework-3i0g0
import { auth, db } from "./firebase-init.js";
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const grid = document.getElementById("tutorialGrid");

// ------------------------  filteren op tools  ------------------------
async function getToolNames(materialIds) {
  const tools = [];

  for (const id of materialIds) {
    const matDoc = await getDoc(doc(db, "Materialen", id));
    if (matDoc.exists() && matDoc.data().category === "tool") {
      tools.push(matDoc.data().name);
    }
  }
  return tools;
}


// -------------------------  favorieten  --------------------------
async function toggleFavorite(tutorialId, isFavorite) {
  const user = auth.currentUser;
  if (!user) {
    alert("Log in om favorieten te gebruiken");
    return;
  }

  const favRef = doc(db, "users", user.uid, "favorites", tutorialId);

  if (isFavorite) {
    await deleteDoc(favRef);
  } else {
    await setDoc(favRef, { createdAt: new Date() });
  }
}

// ------------------------------  make  ---------------------------
const mainImageInput = document.getElementById("mainImage");
const uploadBtn = document.querySelector(".upload-btn");

if (mainImageInput && uploadBtn) {
mainImageInput.addEventListener("change", function() {
  const file = this.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      uploadBtn.style.backgroundImage = `url(${e.target.result})`;
      uploadBtn.style.backgroundSize = "cover";
      uploadBtn.style.border = "none";
      uploadBtn.querySelector(".plus-icon").style.display = "none";
      uploadBtn.querySelector("span").style.display = "none";
    }
    reader.readAsDataURL(file);
  }
});
}

const btn = document.getElementById("change");

if (btn) {
  btn.addEventListener("click", () => {
    // code
  });
}

// ------------------- FAVORIETEN PAGINA --------------------------
const favGrid = document.getElementById("favoritesGrid");

async function loadFavorites() {
  const user = auth.currentUser;
  if (!user) return;

  const favSnapshot = await getDocs(
    collection(db, "users", user.uid, "favorites")
  );

  for (const fav of favSnapshot.docs) {
    const tutorialDoc = await getDoc(
      doc(db, "tutorials", fav.id)
    );

    if (tutorialDoc.exists()) {
      const t = tutorialDoc.data();

      const card = document.createElement("div");
      card.className = "tutorial-card";

      card.innerHTML = `
        <img src="${t.mainImageUrl}">
        <div class="overlay">
          ⏱ ${t.duration} | ⭐ ${t.level}
        </div>
      `;

      favGrid.appendChild(card);
    }
  }
}

loadFavorites();

/* -----------------  GEBRUIKER OPHALEN  ------------------------ */

let userLevel = null;
let userMaterials = [];

async function loadUserData() {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    userLevel = userDoc.data().level;
    userMaterials = userDoc.data().materialsOwned || [];
  }

  loadMaterialsForFilter(userMaterials);
}

await loadUserData();


/* ------------------POP UP INCOMPLEET [PROFIEL ---------------------*/
import { requireProfile } from "./guard.js";
// FILTER BUTTON
const applyFiltersBtn = document.getElementById("applyFilters");
if (applyFiltersBtn) {
  applyFiltersBtn.addEventListener("click", async () => {
    const check = await requireProfile(["materialsOwned"]);
    if (!check.ok) {
      showProfileModal("Vul eerst je materialen in om te filteren");
      return;
    }
    applyFilters();
  });
}

// MAKE BUTTON
const makeBtn = document.getElementById("makeBtn");
if (makeBtn) {
  makeBtn.addEventListener("click", async () => {
    const check = await requireProfile(["level", "materialsOwned"]);
    if (!check.ok) {
      showProfileModal("Vul eerst je niveau en materialen in om een tutorial te maken");
      return;
    }
    window.location.href = "make.html";
  });
}

// FUNCTIE VOOR POP-UP
function showProfileModal(message) {
  const modalEl = document.getElementById("profileRequiredModal");
  if (!modalEl) return;

  modalEl.querySelector("p").innerText = message;
  new bootstrap.Modal(modalEl).show();
}

// aato volgorde tutorials
import { query, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const q = query(
  collection(db, "tutorials"),
  orderBy("createdAt", "desc")
);

const snapshot = await getDocs(q);


/* ------------------- MATERIALEN IN FILTER -----------------------*/

function loadMaterialsForFilter(materials) {
  const container = document.getElementById("filterMaterials");
  container.innerHTML = "";

  materials.forEach(id => {
    const div = document.createElement("div");
    div.className = "form-check";
    div.innerHTML = `
      <input class="form-check-input" type="checkbox" value="${id}" checked>
      <label class="form-check-label">${id}</label>
    `;
    container.appendChild(div);
  });
}

/* --------------------- FILTER FUNCTIE --------------------------- */

function matchesFilters(tutorial) {
  const filterGarment = document.getElementById("filterGarment");
  const filterLevel = document.getElementById("filterLevel");

  //  --------- Kledingtype
  if (filterGarment.value && tutorial.garmentType !== filterGarment.value) {
    return false;
  }

  // --------- Niveaufilter
  if (filterLevel.value && userLevel !== null) {
    if (filterLevel.value === "myLevelOnly" && tutorial.level !== userLevel) {
      return false;
    }
    if (filterLevel.value === "myLevelOrLower" && tutorial.level > userLevel) {
      return false;
    }
    // ---- "Alle niveaus" hoeft geen check
  }

  // -------------Materialen
  const selectedMaterials = Array.from(
    document.querySelectorAll("#filterMaterials input:checked")
  ).map(cb => cb.value);

  if (!tutorial.materials.every(m => selectedMaterials.includes(m))) {
    return false;
  }

  return true;
}


// -------------- SORTEREN

function sortTutorials(tutorials) {
  const sortSelect = document.getElementById("sortSelect");
  const sortValue = sortSelect.value;

  return tutorials.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;

    if (sortValue === "new") {
      return bTime - aTime;
    }
    if (sortValue === "old") {
      return aTime - bTime;
    }
    if (sortValue === "timeAsc") {
      return (a.durationMinutes || 0) - (b.durationMinutes || 0);
    }
    if (sortValue === "timeDesc") {
      return (b.durationMinutes || 0) - (a.durationMinutes || 0);
    }
    return 0;
  });
}


//-------------------- MATERIALEN ALGEMEEN ----------------------
