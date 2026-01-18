// make-upload.js
import { auth, db, storage } from "./firebase-init.js";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ====================== STATE ====================== */
let draftId = null;
let selectedLevel = 1;

// In-memory steps: { text, imageFile, imagePreviewUrl, imageUrl? }
let stepsData = [];
let editingStepIndex = null;
let currentStepTempImageFile = null;

/* ====================== HELPERS ====================== */
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

function typeSafeText(v) {
  return (v ?? "").toString();
}

function showError(err) {
  console.error(err);
  alert(typeSafeText(err?.message || err));
}

/* ====================== POPUP ====================== */
window.showPopup = function ({ imageSrc, text, buttonText, buttonAction }) {
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  overlay.style.cssText = `
    position: fixed;
    top:0; left:0; width:100%; height:100%;
    background: var(--popupbg);
    display:flex; justify-content:center; align-items:center;
    z-index:1000;
  `;

  const block = document.createElement("div");
  block.className = "popup-block";
  block.style.cssText = `position: relative; display: inline-block; text-align: center;`;

  const img = document.createElement("img");
  img.src = imageSrc;
  img.style.cssText = `display:block; width: 300px; border-radius: 12px;`;
  block.appendChild(img);

  const p = document.createElement("p");
  p.textContent = text;
  p.style.cssText = `
    position: absolute;
    top: 20%;
    width: 100%;
    color: var(--ipvwit);
    font-weight: bold;
    pointer-events: none;
  `;
  block.appendChild(p);

  const btn = document.createElement("button");
  btn.textContent = buttonText;
  btn.style.cssText = `
    position: absolute;
    bottom: 15%;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    border: none;
    background: var(--licht);
    color: var(--ipvwit);
    border-radius: 8px;
    cursor: pointer;
  `;
  btn.addEventListener("click", () => {
    overlay.remove();
    if (typeof buttonAction === "function") buttonAction();
  });
  block.appendChild(btn);

  overlay.appendChild(block);
  document.body.appendChild(overlay);
};

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

      div.addEventListener("click", () => {
        div.classList.toggle("selected");
      });

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
const stepModal = stepModalEl ? new bootstrap.Modal(stepModalEl) : null;

function resetStepModal() {
  currentStepTempImageFile = null;
  if (stepImageInput) stepImageInput.value = "";
  if (stepText) stepText.value = "";
  if (stepImagePreview) stepImagePreview.innerHTML = `<span class="plus-icon">+</span>`;
  editingStepIndex = null;
}

function openStepModal(editIndex = null) {
  if (!stepModal) return;

  editingStepIndex = editIndex;
  const stepNumber = editIndex === null ? (stepsData.length + 1) : (editIndex + 1);
  if (stepNumberPreview) stepNumberPreview.textContent = String(stepNumber);

  if (editIndex === null) {
    resetStepModal();
  } else {
    const s = stepsData[editIndex];
    currentStepTempImageFile = null;
    if (stepText) stepText.value = s?.text || "";
    if (stepImagePreview) {
      stepImagePreview.innerHTML = s?.imagePreviewUrl
        ? `<img src="${s.imagePreviewUrl}" alt="stap foto">`
        : `<span class="plus-icon">+</span>`;
    }
  }

  stepModal.show();
}

function renderStepsOverview() {
  if (!stepsOverview) return;
  stepsOverview.innerHTML = "";

  stepsData.forEach((s, idx) => {
    const row = document.createElement("div");
    row.className = "item-bar";

    row.innerHTML = `
      <div class="friend-avatar">
        ${s.imagePreviewUrl
          ? `<img src="${s.imagePreviewUrl}" alt="stap">`
          : `<img src="images/icons/make1.png" alt="stap">`
        }
      </div>
      <div class="friend-info">
        <div class="friend-top">
          <div class="friend-username">Stap ${idx + 1}</div>
        </div>
        <div class="friend-actions">
          <div class="friend-status">${typeSafeText(s.text).slice(0, 40)}${typeSafeText(s.text).length > 40 ? "…" : ""}</div>
        </div>
      </div>
    `;

    row.addEventListener("click", () => openStepModal(idx));
    stepsOverview.appendChild(row);
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
  // revoke oude preview als we vervangen
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

  const stepObj = {
    text,
    imageFile,
    imagePreviewUrl,
    imageUrl: prev?.imageUrl || null // als we al geupload hadden bij draft, behouden
  };

  if (editingStepIndex === null) stepsData.push(stepObj);
  else stepsData[editingStepIndex] = stepObj;

  renderStepsOverview();
  stepModal?.hide();
  resetStepModal();
});

/* ====================== ENSURE DOC ====================== */
async function ensureDraftDocExists({ title, category, duration, user }) {
  if (draftId) return draftId;

  const refDoc = doc(collection(db, "tutorials"));

  await setDoc(refDoc, {
    title: title || "Nieuw project",
    authorId: user.uid,
    draft: true,
    createdAt: serverTimestamp(),
    lastEditedAt: serverTimestamp(),
    level: selectedLevel,
    materials: getSelectedMaterials(),
    category: category || "",
    duration: duration || "00:00",
    steps: [] // vullen we later
  });

  draftId = refDoc.id;
  return draftId;
}

/* ====================== UPLOAD HELPERS ====================== */
// Upload main image (als gekozen) en return URL (of null)
async function uploadMainIfPresent() {
  const mainImageFile = mainImageInput?.files?.[0];
  if (!mainImageFile) return null;

  const mainRef = ref(storage, `tutorials/${draftId}/main.jpg`);
  await uploadBytes(mainRef, mainImageFile);
  return await getDownloadURL(mainRef);
}

// Upload step images (alleen als er een imageFile is) en return clean steps array
async function uploadStepsAndBuildDbSteps() {
  const out = [];

  for (let i = 0; i < stepsData.length; i++) {
    const s = stepsData[i];

    let imageUrl = s.imageUrl || null;

    // Upload alleen als er een lokale file is (nieuw/gewijzigd)
    if (s.imageFile) {
      const stepRef = ref(storage, `tutorials/${draftId}/steps/step_${i + 1}.jpg`);
      await uploadBytes(stepRef, s.imageFile);
      imageUrl = await getDownloadURL(stepRef);

      // file hoeft niet meer in memory na upload
      stepsData[i].imageUrl = imageUrl;
      stepsData[i].imageFile = null;
    }

    out.push({
      text: s.text || "",
      imageUrl
    });
  }

  return out;
}

/* ====================== DRAFT SAVE (uploads images too) ====================== */
async function saveDraft({ showFeedback = true } = {}) {
  try {
    const user = auth.currentUser;
    if (!user) return alert("Je moet ingelogd zijn");

    const title = titleInput?.value?.trim() || "";
    const category = categorySelect?.value || "";
    const duration = durationInput?.value || "00:00";

    // 1) zorg dat draft doc bestaat
    await ensureDraftDocExists({ title, category, duration, user });

    // 2) upload images (main + step) en bouw steps array
    const [mainImageUrl, stepsForDb] = await Promise.all([
      uploadMainIfPresent(),
      uploadStepsAndBuildDbSteps()
    ]);

    // 3) update draft doc
    const updatePayload = {
      title: title || "Nieuw project",
      level: selectedLevel,
      materials: getSelectedMaterials(),
      category,
      duration,
      steps: stepsForDb,
      lastEditedAt: serverTimestamp()
    };

    if (mainImageUrl) updatePayload.mainImageUrl = mainImageUrl;

    await updateDoc(doc(db, "tutorials", draftId), updatePayload);

    if (showFeedback) {
      showPopup({
        imageSrc: "images/pop-ups/size-1.png",
        text: "Make opgeslagen in drafts!",
        buttonText: "OK!",
        buttonAction: () => {}
      });
    }
  } catch (e) {
    showError(e);
  }
}

saveDraftBtn?.addEventListener("click", async () => {
  await saveDraft();
});

/* ====================== PUBLISH (only on submit) ====================== */
tutorialForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const user = auth.currentUser;
    if (!user) return alert("Je moet ingelogd zijn");

    const title = titleInput?.value?.trim() || "";
    const category = categorySelect?.value || "";
    const duration = durationInput?.value || "00:00";
    const mainImageFile = mainImageInput?.files?.[0];

    if (!title) return alert("Vul een titel in.");
    if (!category) return alert("Kies een categorie.");
    if (!mainImageFile) return alert("Upload een hoofdfoto!");

    // 1) zorg dat doc bestaat (zonder popup)
    await ensureDraftDocExists({ title, category, duration, user });

    // 2) upload main (nu verplicht) + steps
    const mainRef = ref(storage, `tutorials/${draftId}/main.jpg`);
    await uploadBytes(mainRef, mainImageFile);
    const mainImageUrl = await getDownloadURL(mainRef);

    const stepsForDb = await uploadStepsAndBuildDbSteps();

    // 3) publish update
    await updateDoc(doc(db, "tutorials", draftId), {
      title,
      category,
      duration,
      level: selectedLevel,
      materials: getSelectedMaterials(),
      mainImageUrl,
      steps: stepsForDb,
      draft: false,
      publishedAt: serverTimestamp(),
      lastEditedAt: serverTimestamp()
    });

    window.location.href = `make-project.html?id=${draftId}`;
  } catch (e2) {
    showError(e2);
  }
});

/* ====================== AUTH ====================== */
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadMaterials();
});
