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
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ====================== STATE ====================== */
let draftId = null;
let selectedLevel = 1;

// In-memory steps: { text, imageFile, imagePreviewUrl }
let stepsData = [];
let editingStepIndex = null;
let currentStepTempImageFile = null;

/* ====================== HELPERS ====================== */
function typeSafeText(v) {
  return (v ?? "").toString();
}
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
function stepsForDraftDb() {
  return stepsData.map(s => ({
    text: s.text || "",
    imageUrl: s.imageUrl || null   // 🔑 bewaar URL als we al geupload hebben
  }));
}

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
  stepNumberPreview.textContent = String(stepNumber);

  if (editIndex === null) {
    resetStepModal();
  } else {
    const s = stepsData[editIndex];
    currentStepTempImageFile = null;
    stepText.value = s?.text || "";
    stepImagePreview.innerHTML = s?.imagePreviewUrl
      ? `<img src="${s.imagePreviewUrl}" alt="stap foto">`
      : `<span class="plus-icon">+</span>`;
  }

  stepModal.show();
}

function renderStepsOverview() {
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
  stepImagePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="stap foto preview">`;
});

saveStepBtn?.addEventListener("click", () => {
  // cleanup oude preview url bij edit + nieuwe upload
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

  const stepObj = { text, imageFile, imagePreviewUrl };

  if (editingStepIndex === null) stepsData.push(stepObj);
  else stepsData[editingStepIndex] = stepObj;

  renderStepsOverview();
  stepModal.hide();
  resetStepModal();
});

/* ====================== DRAFT SAVE (BUTTON ONLY) ====================== */
async function ensureDraftDoc({ showFeedback = true } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Je moet ingelogd zijn");

  const title = titleInput.value.trim();
  const category = categorySelect.value || "";
  const duration = durationInput.value || "00:00";
  const mainImageFile = mainImageInput.files?.[0] || null;

  // 1) Zorg dat draft doc bestaat
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
      mainImageUrl: null,      // 🔑 komt zo
      steps: []                // 🔑 komt zo
    });
  }

  // 2) Upload images (alleen als aanwezig / nodig)
  let mainImageUrl = null;

  // Als er al een mainImageUrl in doc staat en user kiest geen nieuwe, behouden we die.
  // We lezen de doc 1x om bestaande urls te behouden.
  const existingSnap = await getDoc(doc(db, "tutorials", draftId));
  const existing = existingSnap.exists() ? existingSnap.data() : {};
  mainImageUrl = existing?.mainImageUrl || null;

  if (mainImageFile) {
    mainImageUrl = await uploadMainImage(user.uid, draftId, mainImageFile);
  }

  // Step images uploaden indien nodig
  for (let i = 0; i < stepsData.length; i++) {
    const s = stepsData[i];
    // Als er een nieuwe file is gekozen (imageFile), upload hem en zet imageUrl
    if (s.imageFile) {
      const url = await uploadStepImage(user.uid, draftId, i, s.imageFile);
      stepsData[i] = {
        ...s,
        imageUrl: url,
        // optioneel: als je wil, kun je imageFile daarna weggooien (scheelt memory)
        // imageFile: null
      };
    } else {
      // Geen nieuwe file gekozen, behoud bestaande imageUrl (als aanwezig)
      if (!s.imageUrl && existing?.steps?.[i]?.imageUrl) {
        stepsData[i] = { ...s, imageUrl: existing.steps[i].imageUrl };
      }
    }
  }

  // 3) Update Firestore doc met alle draft data + urls
  await updateDoc(doc(db, "tutorials", draftId), {
    title: title || "Nieuw project",
    level: selectedLevel,
    materials: getSelectedMaterials(),
    category,
    duration,
    mainImageUrl,
    steps: stepsForDraftDb(),
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
       window.location.href = `make-drafts.html`;
  } catch (e2) {
    showError(e2);
  }
});


/* ====================== PUBLISH (SUBMIT ONLY) ====================== */
async function uploadMainImage(uid, tutorialId, file) {
  const mainRef = ref(storage, `users/${uid}/tutorials/${tutorialId}/main.jpg`);
  await uploadBytes(mainRef, file);
  return await getDownloadURL(mainRef);
}

async function uploadSteps(uid, tutorialId) {
  const out = [];

  for (let i = 0; i < stepsData.length; i++) {
    const s = stepsData[i];
    let imageUrl = null;

    if (s.imageFile) {
      const stepRef = ref(storage, `users/${uid}/tutorials/${tutorialId}/steps/step_${i + 1}.jpg`);
      await uploadBytes(stepRef, s.imageFile);
      imageUrl = await getDownloadURL(stepRef);
    }

    out.push({ text: s.text || "", imageUrl });
  }

  return out;
}

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

    // 🔑 zorg dat draft doc bestaat + upload alle gekozen images
    await ensureDraftDoc({ showFeedback: false });

    // 🔑 lees alles terug (zeker weten wat er in staat)
    const snap = await getDoc(doc(db, "tutorials", draftId));
    const t = snap.data();

    // mainImageUrl moet bestaan om te publishen
    if (!t?.mainImageUrl) return alert("Upload een hoofdfoto!");

    await updateDoc(doc(db, "tutorials", draftId), {
      title,
      category,
      duration,
      level: selectedLevel,
      materials: getSelectedMaterials(),
      // steps + mainImageUrl staan al goed in doc door ensureDraftDoc
      draft: false,
      publishedAt: serverTimestamp(),
      lastEditedAt: serverTimestamp()
    });

    window.location.href = `make-project.html?id=${draftId}`;
  } catch (err) {
    showError(err);
  }
});


/* ====================== AUTH ====================== */
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadMaterials();
});
