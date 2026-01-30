// make-upload.js
import { auth, db, storage } from "./firebase-init.js";
import { createModal } from "./vanilla-modal.js"; // ✅ nieuw
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ====================== STATE ====================== */
let draftId = null;
let selectedLevel = 1;
let stepsData = [];
let editingStepIndex = null;
let currentStepTempImageFile = null;

/* ====================== HELPERS ====================== */
function typeSafeText(v) { return (v ?? "").toString(); }
function showError(err) {
  console.error(err);
  alert(typeSafeText(err?.message || err));
}
function revokeIfObjectUrl(url) {
  if (url && typeof url === "string" && url.startsWith("blob:")) {
    try { URL.revokeObjectURL(url); } catch {}
  }
}
function getSelectedMaterials() {
  return Array.from(
    document.querySelectorAll("#materialenContainer .material-blok.selected")
  ).map(el => el.dataset.materialId);
}
function stepsForDb() {
  return stepsData.map(s => ({
    text: s.text || "",
    imageUrl: s.imageUrl || null
  }));
}

/* ====================== STORAGE UPLOADS ====================== */
async function uploadMainImage(uid, tutorialId, file) {
  const mainRef = ref(storage, `users/${uid}/tutorials/${tutorialId}/main.jpg`);
  await uploadBytes(mainRef, file);
  return await getDownloadURL(mainRef);
}
async function uploadStepImage(uid, tutorialId, index, file) {
  const stepRef = ref(storage, `users/${uid}/tutorials/${tutorialId}/steps/step_${index + 1}.jpg`);
  await uploadBytes(stepRef, file);
  return await getDownloadURL(stepRef);
}

/* ====================== DOM ====================== */
const tutorialForm = document.getElementById("tutorialForm");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const mainImageInput = document.getElementById("mainImage");
const mainImagePreview = document.getElementById("mainImagePreview");
const titleInput = document.getElementById("titel");
const categorySelect = document.getElementById("tutorialCategory");
const durationInput = document.getElementById("duration-input");
const materialenContainer = document.getElementById("materialenContainer");
const addStepBtn = document.getElementById("addStepBtn");
const saveStepBtn = document.getElementById("saveStepBtn");
const stepModalEl = document.getElementById("stepModal");
const stepNumberPreview = document.getElementById("stepNumberPreview");
const stepImageInput = document.getElementById("stepImage");
const stepImagePreview = document.getElementById("stepImagePreview");
const stepText = document.getElementById("stepText");
const stepsOverview = document.getElementById("stepsOverview");

/* ====================== LEVEL ====================== */
function updateHearts(level) {
  document.querySelectorAll(".niveau-icon").forEach(icon => {
    const iconLevel = Number(icon.dataset.level);
    icon.src = iconLevel <= level ? "images/icons/heart3.png" : "images/icons/heart4.png";
  });
  selectedLevel = level;
}
document.querySelectorAll(".niveau-icon").forEach(icon => {
  icon.addEventListener("click", () => updateHearts(Number(icon.dataset.level)));
});
updateHearts(1);

/* ====================== MATERIALS ====================== */
async function loadMaterials() {
  try {
    const snap = await getDocs(collection(db, "Materialen"));
    if (!materialenContainer) return;

    materialenContainer.innerHTML = "";
    snap.forEach(docSnap => {
      const div = document.createElement("div");
      div.className = "material-blok";
      div.textContent = docSnap.data().Materiaal || docSnap.data().naam || docSnap.id;
      div.dataset.materialId = docSnap.id;

      div.addEventListener("click", () => div.classList.toggle("selected"));
      materialenContainer.appendChild(div);
    });
  } catch (e) {
    showError(e);
  }
}

/* ====================== MAIN IMAGE PREVIEW ====================== */
mainImagePreview?.addEventListener("click", () => mainImageInput?.click());
mainImageInput?.addEventListener("change", () => {
  const file = mainImageInput.files?.[0];
  if (!file) return;
  mainImagePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Hoofdfoto preview">`;
});

/* ====================== STEPS (MODAL) ====================== */
const modal = document.getElementById("addStepModal");
const openBtn = document.getElementById("addStepBtn");
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

modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});


function renderStepsOverview() {
  if (!stepsOverview) return;
  stepsOverview.innerHTML = "";

  stepsData.forEach((s, idx) => {
    const stepBar = document.createElement("div");
    stepBar.className = "item-bar";

    const preview = s.imagePreviewUrl || s.imageUrl || null;

    stepBar.innerHTML = `
      <div class="tutorial-thumb">
        ${preview
          ? `<img src="${preview}" alt="stap">`
          : `<img src="images/icons/make1.png" alt="stap">`
        }
      </div>
      <div class="item-info">
        <div class="friend-top">
          <div class="friend-username">Stap ${idx + 1}</div>
        </div>
          <div class="friend-status">${typeSafeText(s.text).slice(0, 40)}${typeSafeText(s.text).length > 40 ? "…" : ""}</div>
      </div>
    `;

    stepBar.addEventListener("click", () => openStepModal(idx));
    stepsOverview.appendChild(stepBar);
  });
}

addStepBtn?.addEventListener("click", () => openStepModal(null));
stepImagePreview?.addEventListener("click", () => stepImageInput?.click());

stepImageInput?.addEventListener("change", () => {
  const file = stepImageInput.files?.[0];
  if (!file) return;
  currentStepTempImageFile = file;
  if (stepImagePreview) {
    stepImagePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="stap foto preview">`;
  }
});

saveStepBtn?.addEventListener("click", () => {
  if (editingStepIndex !== null && currentStepTempImageFile) {
    const oldUrl = stepsData[editingStepIndex]?.imagePreviewUrl;
    revokeIfObjectUrl(oldUrl);
  }

  const text = stepText?.value?.trim() || "";
  const prev = editingStepIndex !== null ? stepsData[editingStepIndex] : null;

  const imageFile = currentStepTempImageFile || prev?.imageFile || null;
  const imagePreviewUrl = currentStepTempImageFile
    ? URL.createObjectURL(currentStepTempImageFile)
    : (prev?.imagePreviewUrl || null);

  const imageUrl = prev?.imageUrl || null;

  const stepObj = { text, imageFile, imagePreviewUrl, imageUrl };

  if (editingStepIndex === null) stepsData.push(stepObj);
  else stepsData[editingStepIndex] = stepObj;

  renderStepsOverview();
  stepModal?.close(); // ✅ hide -> close
  resetStepModal();
});

/* ====================== DRAFT: CREATE/UPDATE + UPLOAD FILES ====================== */
async function ensureDraftDoc({ showFeedback = true } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Je moet ingelogd zijn");

  const title = titleInput?.value?.trim() || "";
  const category = categorySelect?.value || "";
  const duration = durationInput?.value || "00:00";
  const mainImageFile = mainImageInput?.files?.[0] || null;

  if (!draftId) {
    const refDoc = doc(collection(db, "tutorials"));
    draftId = refDoc.id;

    await setDoc(refDoc, {
      title: title || "Nieuw project",
      authorId: user.uid,
      draft: true,
      createdAt: serverTimestamp(),
      lastEditedAt: serverTimestamp(),
      level: selectedLevel,
      materials: getSelectedMaterials(),
      category,
      duration,
      mainImageUrl: null,
      steps: []
    });
  }

  const snap = await getDoc(doc(db, "tutorials", draftId));
  const existing = snap.exists() ? snap.data() : {};
  let mainImageUrl = existing?.mainImageUrl || null;

  if (mainImageFile) {
    mainImageUrl = await uploadMainImage(user.uid, draftId, mainImageFile);
  }

  for (let i = 0; i < stepsData.length; i++) {
    const s = stepsData[i];

    if (s.imageFile) {
      const url = await uploadStepImage(user.uid, draftId, i, s.imageFile);
      stepsData[i] = {
        ...s,
        imageFile: null,
        imageUrl: url,
        imagePreviewUrl: url
      };
    } else {
      const fallbackUrl = s.imageUrl || existing?.steps?.[i]?.imageUrl || null;
      stepsData[i] = { ...s, imageUrl: fallbackUrl };
    }
  }

  await updateDoc(doc(db, "tutorials", draftId), {
    title: title || "Nieuw project",
    level: selectedLevel,
    materials: getSelectedMaterials(),
    category,
    duration,
    mainImageUrl,
    steps: stepsForDb(),
    draft: true,
    lastEditedAt: serverTimestamp()
  });

  if (showFeedback && window.showPopup) {
    window.showPopup({
      imageSrc: "images/pop-ups/size-1.png",
      text: "Make opgeslagen in drafts!",
      buttonText: "OK!",
      buttonAction: () => {}
    });
  }
}

saveDraftBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    await ensureDraftDoc({ showFeedback: true });
    window.location.href = "make-drafts.html";
  } catch (e2) {
    showError(e2);
  }
});

/* ====================== PUBLISH (SUBMIT ONLY) ====================== */
tutorialForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const user = auth.currentUser;
    if (!user) return alert("Je moet ingelogd zijn");

    const title = titleInput?.value?.trim() || "";
    const category = categorySelect?.value || "";
    const duration = durationInput?.value || "";

    if (!title) return alert("Vul een titel in.");
    if (!category) return alert("Kies een categorie.");

    await ensureDraftDoc({ showFeedback: false });

    const snap = await getDoc(doc(db, "tutorials", draftId));
    const t = snap.data();
    if (!t?.mainImageUrl) return alert("Upload een hoofdfoto!");

    await updateDoc(doc(db, "tutorials", draftId), {
      title,
      category,
      duration,
      level: selectedLevel,
      materials: getSelectedMaterials(),
      steps: t.steps || stepsForDb(),
      mainImageUrl: t.mainImageUrl,
      draft: false,
      publishedAt: serverTimestamp(),
      lastEditedAt: serverTimestamp()
    });

    window.location.href = `make-project.html?id=${draftId}`;
  } catch (err) {
    showError(err);
  }
});

/* ====================== INIT AUTH ====================== */
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadMaterials();
});
