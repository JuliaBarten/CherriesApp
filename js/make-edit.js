import { auth, db, storage } from "./firebase-init.js";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

const params = new URLSearchParams(window.location.search);
const tutorialId = params.get("id");

function $(id) { return document.getElementById(id); }
function safeText(v) { return (v ?? "").toString(); }

function showErr(e) {
  console.error(e);
  alert(e?.message || String(e));
}

function revokeIfObjectUrl(url) {
  if (url && typeof url === "string" && url.startsWith("blob:")) {
    try { URL.revokeObjectURL(url); } catch {}
  }
}

/* ====================== STATE ====================== */
let selectedLevel = 1;
let stepsData = [];
let editingStepIndex = null;
let currentStepTempImageFile = null;
let tutorialCache = null;
let currentStepPreviewUrl = null;
let currentMainPreviewUrl = null;

/* ====================== DOM ====================== */
const form = $("editForm");
const statusText = $("statusText");

const titleInput = $("titel");
const durationInput = $("duration-input");
const categorySelect = $("tutorialCategory");

const mainImageInput = $("mainImage");
const mainImagePreview = $("mainImagePreview");

const materialenContainer = $("materialenContainer");

const addStepBtn = $("addStepBtn");
const saveStepBtn = $("saveStepBtn");
const stepModalEl = $("stepModal");
const stepNumberPreview = $("stepNumberPreview");
const stepImageInput = $("stepImage");
const stepImagePreview = $("stepImagePreview");
const stepText = $("stepText");
const stepsOverview = $("stepsOverview");

const publishBtn = $("publishBtn");

console.log("DOM check:", {
  tutorialId,
  form: !!form,
  titleInput: !!titleInput,
  durationInput: !!durationInput,
  categorySelect: !!categorySelect,
  mainImageInput: !!mainImageInput,
  mainImagePreview: !!mainImagePreview,
  materialenContainer: !!materialenContainer,
  stepsOverview: !!stepsOverview,
  publishBtn: !!publishBtn,
  stepModalEl: !!stepModalEl,
  bootstrapModalAvailable: !!window.bootstrap?.Modal
});

/* ====================== LEVEL ====================== */
function updateHearts(level) {
  selectedLevel = level;
  document.querySelectorAll(".niveau-icon").forEach(icon => {
    const iconLevel = Number(icon.dataset.level);
    icon.src = iconLevel <= level ? "images/icons/heart3.png" : "images/icons/heart4.png";
  });
}
document.querySelectorAll(".niveau-icon").forEach(icon => {
  icon.addEventListener("click", () => updateHearts(Number(icon.dataset.level)));
});

/* ====================== MATERIALS ====================== */
async function loadAllMaterials() {
  const snap = await getDocs(collection(db, "Materialen"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderMaterials(allMaterials, selectedIds = []) {
  if (!materialenContainer) return;
  materialenContainer.innerHTML = "";

  allMaterials.forEach(m => {
    const name = m.Materiaal || m.naam || m.id;

    const div = document.createElement("div");
    div.className = "material-blok";
    div.dataset.materialId = m.id;
    div.innerText = name;

    if (selectedIds.includes(m.id)) div.classList.add("selected");
    div.addEventListener("click", () => div.classList.toggle("selected"));

    materialenContainer.appendChild(div);
  });
}

function renderMaterialsFallback(selectedIds = []) {
  // fallback: toon alleen IDs als "Materialen" collectie niet leesbaar is
  const fallback = selectedIds.map(id => ({ id, Materiaal: id }));
  renderMaterials(fallback, selectedIds);
}

function getSelectedMaterials() {
  return Array.from(document.querySelectorAll("#materialenContainer .material-blok.selected"))
    .map(el => el.dataset.materialId);
}

/* ====================== MAIN IMAGE PREVIEW ====================== */
function renderMainPreview(urlOrNull) {
  if (!mainImagePreview) return;
  if (urlOrNull) {
    mainImagePreview.innerHTML = `<img src="${urlOrNull}" alt="Hoofdfoto">`;
  } else {
    mainImagePreview.innerHTML = `<span class="plus-icon">+</span>`;
  }
}

mainImagePreview?.addEventListener("click", () => mainImageInput?.click());

mainImageInput?.addEventListener("change", () => {
  const file = mainImageInput.files?.[0];
  if (!file) return;

  if (currentMainPreviewUrl) revokeIfObjectUrl(currentMainPreviewUrl);
  currentMainPreviewUrl = URL.createObjectURL(file);
  renderMainPreview(currentMainPreviewUrl);
});

/* ====================== STEPS MODAL ====================== */
// ✅ maak bootstrap modal veilig; geen crash als bootstrap ontbreekt
const stepModal = (stepModalEl && window.bootstrap?.Modal)
  ? new bootstrap.Modal(stepModalEl)
  : null;

function resetStepModal() {
  currentStepTempImageFile = null;

  if (stepImageInput) stepImageInput.value = "";
  if (stepText) stepText.value = "";
  if (stepImagePreview) stepImagePreview.innerHTML = `<span class="plus-icon">+</span>`;
  editingStepIndex = null;

  if (currentStepPreviewUrl) {
    revokeIfObjectUrl(currentStepPreviewUrl);
    currentStepPreviewUrl = null;
  }
}

function openStepModal(editIndex = null) {
  // Fallback: als je geen bootstrap modal hebt, bewerk alleen tekst via prompt
  if (!stepModal) {
    const idx = editIndex ?? stepsData.length;
    const prevText = stepsData[idx]?.text || "";
    const newText = window.prompt("Bewerk stap tekst:", prevText);
    if (newText === null) return;

    if (idx === stepsData.length) {
      stepsData.push({ text: newText, imageFile: null, imagePreviewUrl: null, existingUrl: null });
    } else {
      stepsData[idx].text = newText;
    }
    renderStepsOverview();
    return;
  }

  if (!stepNumberPreview) return;

  editingStepIndex = editIndex;
  const stepNumber = editIndex === null ? (stepsData.length + 1) : (editIndex + 1);
  stepNumberPreview.textContent = String(stepNumber);

  if (editIndex === null) {
    resetStepModal();
  } else {
    const s = stepsData[editIndex];
    currentStepTempImageFile = null;

    if (stepText) stepText.value = s?.text || "";

    const preview = s?.imagePreviewUrl || s?.existingUrl || null;
    if (stepImagePreview) {
      stepImagePreview.innerHTML = preview
        ? `<img src="${preview}" alt="stap foto">`
        : `<span class="plus-icon">+</span>`;
    }
  }

  stepModal.show();
}

function renderStepsOverview() {
  if (!stepsOverview) return;

  stepsOverview.innerHTML = "";
  stepsData.forEach((s, idx) => {
    const stepBar= document.createElement("div");
    stepBar.className = "item-bar";

    const preview = s.imagePreviewUrl || s.existingUrl || null;

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
          <div class="friend-status">${safeText(s.text).slice(0, 40)}${safeText(s.text).length > 40 ? "…" : ""}</div>
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
  if (!file || !stepImagePreview) return;

  if (currentStepPreviewUrl) revokeIfObjectUrl(currentStepPreviewUrl);
  currentStepTempImageFile = file;
  currentStepPreviewUrl = URL.createObjectURL(file);
  stepImagePreview.innerHTML = `<img src="${currentStepPreviewUrl}" alt="stap foto preview">`;
});

saveStepBtn?.addEventListener("click", () => {
  const text = stepText?.value?.trim() || "";
  const prev = editingStepIndex !== null ? stepsData[editingStepIndex] : null;

  const imageFile = currentStepTempImageFile || prev?.imageFile || null;
  const imagePreviewUrl = currentStepTempImageFile ? currentStepPreviewUrl : (prev?.imagePreviewUrl || null);

  const stepObj = {
    text,
    imageFile,
    imagePreviewUrl,
    existingUrl: prev?.existingUrl || null
  };

  if (editingStepIndex === null) stepsData.push(stepObj);
  else stepsData[editingStepIndex] = stepObj;

  renderStepsOverview();
  stepModal?.hide();
  resetStepModal();
});

/* ====================== UPLOAD HELPERS ====================== */
async function uploadMainImage(uid, tutorialId, file) {
  const mainRef = ref(storage, `users/${uid}/tutorials/${tutorialId}/main.jpg`);
  await uploadBytes(mainRef, file);
  return await getDownloadURL(mainRef);
}

async function uploadSteps(uid, tutorialId) {
  const out = [];

  for (let i = 0; i < stepsData.length; i++) {
    const s = stepsData[i];

    if (s.imageFile) {
      const stepRef = ref(storage, `users/${uid}/tutorials/${tutorialId}/steps/step_${i + 1}.jpg`);
      await uploadBytes(stepRef, s.imageFile);
      const imageUrl = await getDownloadURL(stepRef);

      stepsData[i] = {
        ...s,
        imageFile: null,
        existingUrl: imageUrl,
        imagePreviewUrl: imageUrl
      };

      out.push({ text: s.text || "", imageUrl });
    } else {
      out.push({ text: s.text || "", imageUrl: s.existingUrl || null });
    }
  }
  return out;
}

/* ====================== LOAD TUTORIAL ====================== */
async function loadTutorial(user) {
  if (!tutorialId) {
    alert("Geen id in URL");
    window.location.href = "make-drafts.html";
    return;
  }

  const snap = await getDoc(doc(db, "tutorials", tutorialId));
  if (!snap.exists()) {
    alert("Deze make bestaat niet (meer).");
    window.location.href = "make-drafts.html";
    return;
  }

  const t = snap.data();
  tutorialCache = t;

  if (t.authorId !== user.uid) {
    alert("Je mag deze make niet bewerken.");
    window.location.href = `make-project.html?id=${tutorialId}`;
    return;
  }

  console.log("EDIT load tutorial:", {
    id: tutorialId,
    title: t.title,
    duration: t.duration,
    category: t.category,
    level: t.level,
    materialsCount: (t.materials || []).length,
    hasMainImageUrl: !!t.mainImageUrl,
    stepsCount: (t.steps || []).length
  });

  // velden invullen
  if (titleInput) titleInput.value = t.title || "";
  if (durationInput) durationInput.value = t.duration || "00:00";
  if (categorySelect) categorySelect.value = t.category || "";

  // check: is duration echt gezet?
  console.log("duration input now:", durationInput?.value);

  // level
  selectedLevel = t.level || 1;
  updateHearts(selectedLevel);

  // main preview altijd iets tonen
  renderMainPreview(t.mainImageUrl || null);

  // steps
  stepsData = (t.steps || []).map(s => ({
    text: s.text || "",
    imageFile: null,
    imagePreviewUrl: s.imageUrl || null,
    existingUrl: s.imageUrl || null
  }));
  renderStepsOverview();

  // materialen (met fallback)
  try {
    const allMaterials = await loadAllMaterials();
    renderMaterials(allMaterials, t.materials || []);
    console.log("materials rendered OK");
  } catch (e) {
    console.error("loadAllMaterials FAILED:", e?.code, e?.message);
    renderMaterialsFallback(t.materials || []);
  }

  if (statusText) statusText.textContent = t.draft ? "Status: draft" : "Status: gepubliceerd";
}

/* ====================== SAVE (draft or published) ====================== */
async function saveWithoutPublishing(user) {
  const title = titleInput?.value?.trim() || "";
  const category = categorySelect?.value || "";
  const duration = durationInput?.value || "00:00";

  const mainFile = mainImageInput?.files?.[0] || null;
  let mainImageUrl = tutorialCache?.mainImageUrl || null;

  if (mainFile) {
    mainImageUrl = await uploadMainImage(user.uid, tutorialId, mainFile);
  }

  const stepsForDb = await uploadSteps(user.uid, tutorialId);

  await updateDoc(doc(db, "tutorials", tutorialId), {
    title,
    category,
    duration,
    level: selectedLevel,
    materials: getSelectedMaterials(),
    mainImageUrl,
    steps: stepsForDb,
    lastEditedAt: serverTimestamp()
  });

  tutorialCache = {
    ...(tutorialCache || {}),
    title,
    category,
    duration,
    level: selectedLevel,
    materials: getSelectedMaterials(),
    mainImageUrl,
    steps: stepsForDb
  };

  stepsData = stepsForDb.map(s => ({
    text: s.text || "",
    imageFile: null,
    imagePreviewUrl: s.imageUrl || null,
    existingUrl: s.imageUrl || null
  }));
  renderStepsOverview();
}

/* ====================== PUBLISH / UPDATE ====================== */
async function publishOrUpdate(user) {
  const title = titleInput?.value?.trim() || "";
  const category = categorySelect?.value || "";
  const duration = durationInput?.value || "00:00";
  const mainFile = mainImageInput?.files?.[0] || null;

  if (!title) return alert("Vul een titel in.");
  if (!category) return alert("Kies een categorie.");

  let mainImageUrl = tutorialCache?.mainImageUrl || null;
  if (mainFile) {
    mainImageUrl = await uploadMainImage(user.uid, tutorialId, mainFile);
  }

  const stepsForDb = await uploadSteps(user.uid, tutorialId);

  await updateDoc(doc(db, "tutorials", tutorialId), {
    title,
    category,
    duration,
    level: selectedLevel,
    materials: getSelectedMaterials(),
    mainImageUrl,
    steps: stepsForDb,
    draft: false,
    publishedAt: tutorialCache?.publishedAt || serverTimestamp(),
    lastEditedAt: serverTimestamp()
  });
}

/* ====================== EVENTS ====================== */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const user = auth.currentUser;
    if (!user) return;

    await saveWithoutPublishing(user);
    if (statusText) statusText.textContent = "Opgeslagen ✅";
  } catch (err) {
    showErr(err);
  }
});

publishBtn?.addEventListener("click", async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await publishOrUpdate(user);
    if (statusText) statusText.textContent = "Gepubliceerd / geüpdatet ✅";
    window.location.href = `make-project.html?id=${tutorialId}`;
  } catch (err) {
    showErr(err);
  }
});

/* ====================== INIT AUTH ====================== */
onAuthStateChanged(auth, async (user) => {
  try {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    await loadTutorial(user);
  } catch (err) {
    showErr(err);
  }
});
