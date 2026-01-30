const modal = document.getElementById("addStepModal");
const openBtn = document.getElementById("openAddStepModal"); // jouw "Stap toevoegen" knop
const closeBtn = document.getElementById("closeAddStepModal");
const cancelBtn = document.getElementById("cancelAddStep");

function openModal() {
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  modal.setAttribute("aria-hidden", "true");
}

openBtn?.addEventListener("click", openModal);
closeBtn?.addEventListener("click", closeModal);
cancelBtn?.addEventListener("click", closeModal);

// klik buiten de kaart sluit ook
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// escape sluit ook
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});
