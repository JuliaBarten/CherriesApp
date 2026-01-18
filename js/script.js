import { auth, db } from "./firebase-init.js";
import { doc, getDoc} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const avatar = snap.data().avatar;
  const navbarAvatar = document.getElementById("navbarAvatar");

  if (navbarAvatar && avatar) {
    navbarAvatar.src = avatar;
  }
});

function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}
window.addEventListener('resize', setAppHeight);
setAppHeight();


/* ==================== make button pop up ==================*/
const makeNavBtn = document.getElementById("makeNavBtn");
const makeMenu = document.getElementById("makeMenu");
const newProjectBtn = document.getElementById("newProjectBtn");
const draftsBtn = document.getElementById("draftsBtn");

function closeMakeMenu() {
  makeMenu?.classList.remove("show");
}

if (makeNavBtn && makeMenu) {
  makeNavBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation(); 
    makeMenu.classList.toggle("show");
  });

  newProjectBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMakeMenu();
    window.location.href = "make-upload.html";
  });

  draftsBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMakeMenu();
    window.location.href = "make-drafts.html";
  });

  document.addEventListener("click", (e) => {
    const clickedInsideMenu = e.target.closest("#makeMenu");
    const clickedMakeBtn = e.target.closest("#makeNavBtn");
    if (!clickedInsideMenu && !clickedMakeBtn) {
      closeMakeMenu();
    }
  });
}

/* ==================== POP UP INCOMPLEET [PROFIEL} ==================*/
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

// FUNCTIE VOOR POP-UP
function showProfileModal(message) {
  const modalEl = document.getElementById("profileRequiredModal");
  if (!modalEl) return;

  modalEl.querySelector("p").innerText = message;
  new bootstrap.Modal(modalEl).show();
}
