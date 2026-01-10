import { auth, db } from "./firebase-init.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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

// menu active state
const current = window.location.pathname.split("/").pop();
document.querySelectorAll("footer a").forEach(link => {
  if (link.getAttribute("href") === current) {
    link.classList.add("active");
  }
});

/* ================= make knop pop-up ===========================*/
document.querySelector('a[href="make.html"]')
  .addEventListener("click", (e) => {
    e.preventDefault();
    new bootstrap.Modal(
      document.getElementById("makeChoiceModal")
    ).show();
  });
  
  document.getElementById("newMakeBtn").onclick = () => {
  window.location.href = "make-upload.html";
};

document.getElementById("draftsBtn").onclick = () => {
  window.location.href = "make-drafts.html";
};


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
