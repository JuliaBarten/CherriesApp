// make-upload.js
import { auth, db, storage } from "./firebase-init.js";
import {
  collection, doc, setDoc, updateDoc, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ====================== STATE ====================== */
let draftId = null;
let selectedLevel = 1;

// In-memory steps: { text, imageFile, imagePreviewUrl }
let stepsData = [];
let editingStepIndex = null;
let currentStepTempImageFile = null;

/* ====================== HELPERS ====================== */
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

/* ====================== GLOBALE POPUP FUNCTIE ====================== */
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
    materialenContainer.innerHTML = "";

    snap.forEach(docSnap => {
      const div = document.createElement("div");
      div.className = "material-blok";
      div.textContent = docSnap.data().Materiaal;
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
mainImagePreview.addEventListener("click", () => mainImageInput.click());
mainImageInput.addEventListener("change", () => {
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

  // Voor de preview "Stap X"
  const stepNumber = editIndex === null ? (stepsData.length + 1) : (editIndex + 1);
  stepNumberPreview.textContent = String(stepNumber);

  // Vul velden
  if (editIndex === null) {
    resetStepModal();
  } else {
    const s = stepsData[editIndex];
    currentStepTempImageFile = null; // pas vervangen als user nieuwe kiest
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
    row.className = "friend-bar";

    row.innerHTML = `
      <div class="friend-avatar">
        ${s.imagePreviewUrl
          ? `<img src="${s.imagePreviewUrl}" alt="stap">`
          : `<img src="images/icons/naaimachine.png" alt="stap">`
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

// Open modal bij nieuwe stap
addStepBtn?.addEventListener("click", () => openStepModal(null));

// Kies stap-afbeelding
stepImagePreview?.addEventListener("click", () => stepImageInput?.click());

stepImageInput?.addEventListener("change", () => {
  const file = stepImageInput.files?.[0];
  if (!file) return;
  currentStepTempImageFile = file;
  stepImagePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="stap foto preview">`;
});

// Stap opslaan (alleen lokaal)
saveStepBtn?.addEventListener("click", () => {
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

/* ====================== SERIALIZERS ====================== */
// Voor drafts: geen File objects in Firestore
function stepsForDraftDb() {
  return stepsData.map(s => ({
    text: s.text || "",
    // we bewaren géén imageUrl in draft (die bestaat nog niet)
    imageUrl: null
  }));
}

// Voor publish: upload images en maak definitieve steps array
async function stepsForPublishDb() {
  const out = [];

  for (let i = 0; i < stepsData.length; i++) {
    const s = stepsData[i];
    let imageUrl = null;

    if (s.imageFile) {
      const stepRef = ref(storage, `tutorials/${draftId}/steps/step_${i + 1}.jpg`);
      await uploadBytes(stepRef, s.imageFile);
      imageUrl = await getDownloadURL(stepRef);
    }

    out.push({
      text: s.text || "",
      imageUrl
    });
  }

  return out;
}

/* ====================== DRAFT SAVE (ONLY ON BUTTON) ====================== */
async function saveDraft({ showFeedback = true } = {}) {
  try {
    const user = auth.currentUser;
    if (!user) return alert("Je moet ingelogd zijn");

    const title = titleInput.value.trim();
    const category = categorySelect.value || "";
    const duration = durationInput.value || "00:00";

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
        // ✅ geen files, alleen tekststructuur
        steps: stepsForDraftDb()
      });
    } else {
      await updateDoc(doc(db, "tutorials", draftId), {
        title,
        level: selectedLevel,
        materials: getSelectedMaterials(),
        category,
        duration,
        steps: stepsForDraftDb(),
        lastEditedAt: serverTimestamp()
      });
    }

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

// ✅ knop → saveDraft (en nergens anders)
saveDraftBtn?.addEventListener("click", async () => {
  await saveDraft();
});

/* ====================== FORM SUBMIT (PUBLISH ONLY ON SUBMIT) ====================== */
tutorialForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const user = auth.currentUser;
    if (!user) return alert("Je moet ingelogd zijn");

    // Zorg dat doc bestaat (maar geen popup)
    if (!draftId) {
      await saveDraft({ showFeedback: false });
    }

    const title = titleInput.value.trim();
    const category = categorySelect.value;
    const duration = durationInput.value;
    const mainImageFile = mainImageInput.files?.[0];

    if (!title) return alert("Vul een titel in.");
    if (!category) return alert("Kies een categorie.");
    if (!mainImageFile) return alert("Upload een hoofdfoto!");

    // Upload main image
    const mainRef = ref(storage, `tutorials/${draftId}/main.jpg`);
    await uploadBytes(mainRef, mainImageFile);
    const mainImageUrl = await getDownloadURL(mainRef);

    // Upload step images + create clean steps array
    const stepsForDb = await stepsForPublishDb();

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
