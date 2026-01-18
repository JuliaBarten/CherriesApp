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
let stepsData = []; // in-memory: { text, imageFile?, imagePreviewUrl? , existingUrl? }
let editingStepIndex = null;
let currentStepTempImageFile = null;
let tutorialCache = null; // huidige tutorial data

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

/* ====================== MATERIALS ====================== */
async function loadAllMaterials() {
  const snap = await getDocs(collection(db, "Materialen"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderMaterials(allMaterials, selectedIds) {
  materialenContainer.innerHTML = "";

  allMaterials.forEach(m => {
    const name = m.Materiaal || m.naam || m.id;

    const div = document.createElement("div");
    div.className = "material-blok";
    div.dataset.materialId = m.id;
    div.innerText = name;

    if (selectedIds?.includes(m.id)) div.classList.add("selected");

    div.addEventListener("click", () => div.classList.toggle("selected"));

    materialenContainer.appendChild(div);
  });
}

function getSelectedMaterials() {
  return Array.from(document.querySelectorAll("#materialenContainer .material-blok.selected"))
    .map(el => el.dataset.materialId);
}

/* ====================== MAIN IMAGE PREVIEW ====================== */
mainImagePreview?.addEventListener("click", () => mainImageInput?.click());
mainImageInput?.addEventListener("change", () => {
  const file = mainImageInput.files?.[0];
  if (!file) return;
  mainImagePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Hoofdfoto preview">`;
});

/* ====================== STEPS MODAL ====================== */
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

    const preview = s?.imagePreviewUrl || s?.existingUrl || null;
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
    const preview = s.imagePreviewUrl || s.existingUrl || null;

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
          <div class="friend-status">${safeText(s.text).slice(0, 40)}${safeText(s.text).length > 40 ? "…" : ""}</div>
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

  const stepObj = {
    text,
    imageFile,
    imagePreviewUrl,
    existingUrl: prev?.existingUrl || null // bewaar oude url als er geen nieuwe file is
  };

  if (editingStepIndex === null) stepsData.push(stepObj);
  else stepsData[editingStepIndex] = stepObj;

  renderStepsOverview();
  stepModal.hide();
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

      // 🔑 update in-memory zodat volgende saves goed gaan
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



function stepsForDbDraftLike() {
  // draft-achtige save: geen uploads, alleen tekst + bestaande url behouden
  return stepsData.map(s => ({
    text: s.text || "",
    imageUrl: s.existingUrl || null
  }));
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

  // form vullen
  titleInput.value = t.title || "";
  durationInput.value = t.duration || "00:00";
  categorySelect.value = t.category || "";

  selectedLevel = t.level || 1;
  updateHearts(selectedLevel);

// main image preview in edit
const mainPreview = document.getElementById("mainImagePreview");
if (mainPreview && t.mainImageUrl) {
  mainPreview.innerHTML = `<img src="${t.mainImageUrl}" alt="Hoofdfoto">`;
}

// stappen laten zien 
stepsData = (t.steps || []).map(s => ({
  text: s.text || "",
  imageFile: null,
  imagePreviewUrl: s.imageUrl || null, 
  existingUrl: s.imageUrl || null  
}));

renderStepsOverview();



  // materialen
  const allMaterials = await loadAllMaterials();
  renderMaterials(allMaterials, t.materials || []);

  statusText.textContent = t.draft ? "Status: draft" : "Status: gepubliceerd";
}

/* ====================== SAVE (draft or published) ====================== */
async function saveWithoutPublishing(user) {
  const title = titleInput.value.trim();
  const category = categorySelect.value || "";
  const duration = durationInput.value || "00:00";

  // 1) main image uploaden als er een nieuwe gekozen is
  const mainFile = mainImageInput.files?.[0] || null;
  let mainImageUrl = tutorialCache?.mainImageUrl || null;

  if (mainFile) {
    mainImageUrl = await uploadMainImage(user.uid, tutorialId, mainFile);
  }

  // 2) step images uploaden als er nieuwe files gekozen zijn
  //    + bestaande urls behouden
  const stepsForDb = await uploadSteps(user.uid, tutorialId);

  // 3) draft status NIET veranderen bij opslaan
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

  // 4) cache bijwerken zodat publish/update later klopt
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

  // 5) na upload: existingUrl in stepsData updaten (zodat UI klopt)
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
  const title = titleInput.value.trim();
  const category = categorySelect.value;
  const duration = durationInput.value;
  const mainFile = mainImageInput.files?.[0];

  if (!title) return alert("Vul een titel in.");
  if (!category) return alert("Kies een categorie.");

  // uploads alleen als er nieuwe files zijn
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
    statusText.textContent = "Opgeslagen ✅";
  } catch (err) {
    showErr(err);
  }
});

publishBtn?.addEventListener("click", async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await publishOrUpdate(user);
    statusText.textContent = "Gepubliceerd / geüpdatet ✅";
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
