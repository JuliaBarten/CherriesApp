export function createModal(modalEl) {
  let lastFocus = null;

  function open() {
    if (!modalEl) return;
    lastFocus = document.activeElement;

    modalEl.classList.remove("hidden");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    // focus naar eerste focusable element (of close)
    const focusable = modalEl.querySelector("button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])");
    (focusable || modalEl).focus?.();
  }

  function close() {
    if (!modalEl) return;

    modalEl.classList.add("hidden");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    // focus terug naar waar je was
    lastFocus?.focus?.();
  }

  // sluit bij klik op overlay
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) close();
  });

  // sluit bij klik op knoppen met data-vmodal-close
  modalEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-vmodal-close]");
    if (btn) close();
  });

  // sluit met ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalEl.classList.contains("hidden")) {
      close();
    }
  });

  return { open, close };
}
