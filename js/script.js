

//  ------------------------ menu ------------------------------
const current = window.location.pathname.split("/").pop();
document.querySelectorAll('footer a').forEach(link => {
  if (link.getAttribute('href') === current) {
    link.classList.add('active');
  }
});


// --------------------------- fotowall -----------------------
const items = document.querySelectorAll(".item");


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
