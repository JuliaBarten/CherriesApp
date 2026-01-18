import { auth, db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const tutorialId = params.get("id");
let stepIndex = Number(params.get("step") ?? 0); // 0-based

const titleEl = document.getElementById("followTitle");
const metaEl = document.getElementById("stepMeta");
const imgWrap = document.getElementById("stepImageWrap");
const textWrap = document.getElementById("stepTextWrap");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pauseBtn = document.getElementById("pauseBtn");

let tutorial = null;
let uid = null;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function saveProgress({ completed = false } = {}) {
  if (!uid) return; // niet ingelogd = geen progress opslaan

  const progRef = doc(db, "users", uid, "progress", tutorialId);
  await setDoc(progRef, {
    tutorialId,
    stepIndex,
    completed,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function render() {
  const steps = tutorial?.steps || [];
  if (!steps.length) {
    metaEl.textContent = "";
    imgWrap.innerHTML = "";
    textWrap.innerHTML = "<p>Deze make heeft nog geen stappen.</p>";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  stepIndex = clamp(stepIndex, 0, steps.length - 1);

  const s = steps[stepIndex];
  titleEl.textContent = tutorial.title || "Make";

  metaEl.textContent = `Stap ${stepIndex + 1} van ${steps.length}`;

  imgWrap.innerHTML = s.imageUrl
    ? `<img src="${s.imageUrl}" alt="Stap ${stepIndex + 1}" style="width:100%; border-radius: var(--borderknop);">`
    : `<div class="step-image-placeholder">Geen foto</div>`;

  textWrap.innerHTML = `<p>${s.text || ""}</p>`;

  prevBtn.disabled = stepIndex === 0;

  // Laatste stap? Maak knop “Afronden”
  if (stepIndex === steps.length - 1) {
    nextBtn.textContent = "Afronden";
  } else {
    nextBtn.textContent = "Volgende";
  }
}

async function loadTutorial() {
  const tutRef = doc(db, "tutorials", tutorialId);
  const snap = await getDoc(tutRef);
  if (!snap.exists()) {
    alert("Tutorial niet gevonden");
    return;
  }
  tutorial = snap.data();
  render();
}

prevBtn?.addEventListener("click", async () => {
  stepIndex -= 1;
  render();
  await saveProgress();
});

nextBtn?.addEventListener("click", async () => {
  const steps = tutorial?.steps || [];
  const last = steps.length - 1;

  if (stepIndex >= last) {
    await saveProgress({ completed: true });
    window.location.href = `make-project.html?id=${tutorialId}`;
    return;
  }

  stepIndex += 1;
  render();
  await saveProgress();
});

pauseBtn?.addEventListener("click", async () => {
  await saveProgress();
  window.location.href = `make-project.html?id=${tutorialId}`;
});

onAuthStateChanged(auth, async (user) => {
  uid = user?.uid || null;
  await loadTutorial();

  // Als user ingelogd is: als er progress bestaat, gebruik die als stepIndex
  if (uid) {
    const progRef = doc(db, "users", uid, "progress", tutorialId);
    const progSnap = await getDoc(progRef);
    if (progSnap.exists() && progSnap.data()?.completed !== true) {
      const saved = Number(progSnap.data()?.stepIndex ?? stepIndex);
      stepIndex = saved;
      render();
    } else {
      // init progress doc (optioneel)
      await saveProgress();
    }
  }
});
