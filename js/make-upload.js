// make-upload.js
import { auth, db, storage } from "./firebase-init.js";
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
  // ✅ altijd urls bewaren; files nooit naar Firestore
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
  stepNumberPreview.textContent = String(stepNumber);

  if (editIndex === null) {
    resetStepModal();
  } else {
    const s = stepsData[editIndex];
    currentStepTempImageFile = null;
    stepText.value = s?.text || "";
    const preview = s?.imagePreviewUrl || s?.imageUrl || null;
    stepImagePreview.innerHTML = preview
      ? `<img src="${preview}" alt="stap foto">`
      : `<span class="plus-icon">+</span>`;
  }

  stepModal.show();
}

function renderStepsOverview() {
  stepsOverview.innerHTML = "";

  stepsData.forEach((s, idx) => {
    const row = document.createElement("div");
    row.className = "item-bar";

    const preview = s.imagePreviewUrl || s.imageUrl || null;

    row.innerHTML = `
      <div class="friend-avatar">
        ${preview
          ? `<img src="${preview}" alt="stap">`
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
  stepImagePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="stap foto preview">`;
});

saveStepBtn?.addEventListener("click", () => {
  // cleanup oude blob preview url bij edit + nieuwe upload
  if (editingStepIndex !== null && currentStepTempImageFile) {
    const oldUrl = stepsData[editingStepIndex]?.imagePreviewUrl;
    revokeIfObjectUrl(oldUrl);
  }

  const text = stepText.value.trim();
  const prev = editingStepIndex !== null ? stepsData[editingStepIndex] : null;

  const imageFile = currentStepTempImageFile || prev?.imageFile || null;
  const imagePreviewUrl = currentStepTempImageFile
    ? URL.createObjectURL(currentStepTempImageFile)
    : (prev?.imagePreviewUrl || null);

  // ✅ behoud bestaande imageUrl als er geen nieuwe file gekozen is
  const imageUrl = prev?.imageUrl || null;

  const stepObj = { text, imageFile, imagePreviewUrl, imageUrl };

  if (editingStepIndex === null) stepsData.push(stepObj);
  else stepsData[editingStepIndex] = stepObj;

  renderStepsOverview();
  stepModal.hide();
  resetStepModal();
});

/* ====================== DRAFT: CREATE/UPDATE + UPLOAD FILES ====================== */
async function ensureDraftDoc({ showFeedback = true } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Je moet ingelogd zijn");

  const title = titleInput.value.trim();
  const category = categorySelect.value || "";
  const duration = durationInput.value || "00:00";
  const mainImageFile = mainImageInput.files?.[0] || null;

  // 1) maak doc als nodig
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

  // 2) haal bestaande data op (urls behouden)
  const snap = await getDoc(doc(db, "tutorials", draftId));
  const existing = snap.exists() ? snap.data() : {};
  let mainImageUrl = existing?.mainImageUrl || null;

  // 3) upload main als er een nieuwe gekozen is
  if (mainImageFile) {
    mainImageUrl = await uploadMainImage(user.uid, draftId, mainImageFile);
  }

  // 4) upload step images als er nieuwe files zijn, anders behoud url
  for (let i = 0; i < stepsData.length; i++) {
    const s = stepsData[i];

    if (s.imageFile) {
      const url = await uploadStepImage(user.uid, draftId, i, s.imageFile);
      stepsData[i] = {
        ...s,
        imageFile: null,        // ✅ na upload opruimen
        imageUrl: url,          // ✅ url bewaren
        imagePreviewUrl: url    // ✅ preview voortaan de echte url
      };
    } else {
      // behoud bestaande url uit geheugen of uit firestore
      const fallbackUrl = s.imageUrl || existing?.steps?.[i]?.imageUrl || null;
      stepsData[i] = { ...s, imageUrl: fallbackUrl };
    }
  }

  // 5) update doc
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

    const title = titleInput.value.trim();
    const category = categorySelect.value;
    const duration = durationInput.value;

    if (!title) return alert("Vul een titel in.");
    if (!category) return alert("Kies een categorie.");

    // ✅ zorgt dat doc bestaat + uploads gedaan + urls opgeslagen
    await ensureDraftDoc({ showFeedback: false });

    // ✅ check dat mainImageUrl nu echt bestaat
    const snap = await getDoc(doc(db, "tutorials", draftId));
    const t = snap.data();
    if (!t?.mainImageUrl) return alert("Upload een hoofdfoto!");

    await updateDoc(doc(db, "tutorials", draftId), {
      title,
      category,
      duration,
      level: selectedLevel,
      materials: getSelectedMaterials(),
      steps: t.steps || stepsForDb(), // zekerheid
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
