// menu active state
const current = window.location.pathname.split("/").pop();
document.querySelectorAll("footer a").forEach(link => {
  if (link.getAttribute("href") === current) {
    link.classList.add("active");
  }
});

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

// FUNCTIE VOOR POP-UP
function showProfileModal(message) {
  const modalEl = document.getElementById("profileRequiredModal");
  if (!modalEl) return;

  modalEl.querySelector("p").innerText = message;
  new bootstrap.Modal(modalEl).show();
}
