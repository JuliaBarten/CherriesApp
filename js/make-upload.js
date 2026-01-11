// make-upload.js
import { auth, db, storage } from "./firebase-init.js";
import { collection, doc, setDoc, updateDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ====================== STATE ====================== */
let draftId = null;
let selectedLevel = 1;
let stepsData = [];
let stepCount = 0;
let editingStepIndex = null;

/* ====================== HELPERS ====================== */
function getSelectedMaterials() {
  return Array.from(
    document.querySelectorAll("#materialenContainer .material-blok.selected")
  ).map(el => el.dataset.materialId);
}

function debounce(fn, delay = 1000) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ====================== GLOBALE POPUP FUNCTIE ====================== */
window.showPopup = function ({ imageSrc, text, buttonText, buttonAction }) {
  // Overlay
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  overlay.style.cssText = `
    position: fixed;
    top:0; left:0; width:100%; height:100%;
    background: rgba(0,0,0,0.2);
    display:flex; justify-content:center; align-items:center;
    z-index:1000;
  `;

  // Pop-up block
  const block = document.createElement("div");
  block.className = "popup-block";
  block.style.cssText = `
    position: relative; 
    display: inline-block;
    text-align: center;
  `;

   // Afbeelding als frame
  const img = document.createElement("img");
  img.src = imageSrc;
  img.style.cssText = `
    display:block;
    width: 300px;
    border-radius: 12px;
  `;
  block.appendChild(img);

  // Tekst over het frame (optioneel, bijvoorbeeld boven de knop)
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

  // Knop bovenop de afbeelding
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

/* ====================== LEVEL ====================== */
function updateHearts(level) {
  document.querySelectorAll(".niveau-icon").forEach(icon => {
    const iconLevel = Number(icon.dataset.level);
    icon.src = iconLevel <= level ? "images/icons/heart3.png" : "images/icons/heart4.png";
  });
  selectedLevel = level;
}
document.querySelectorAll(".niveau-icon").forEach(icon => {
  icon.addEventListener("click", () => {
    updateHearts(Number(icon.dataset.level));
    autoSaveDraft();
  });
});
updateHearts(1);

/* ====================== MATERIALS ====================== */
async function loadMaterials() {
  const container = document.getElementById("materialenContainer");
  const snap = await getDocs(collection(db, "Materialen"));
  container.innerHTML = "";

  snap.forEach(docSnap => {
    const div = document.createElement("div");
    div.className = "material-blok";
    div.textContent = docSnap.data().Materiaal;
    div.dataset.materialId = docSnap.id;

    div.onclick = () => {
      div.classList.toggle("selected");
      autoSaveDraft();
    };
    container.appendChild(div);
  });
}

/* ====================== AUTOSAVE DRAFT ====================== */
const autoSaveDraft = debounce(async () => {
  const user = auth.currentUser;
  if (!user) return;

  const title = document.getElementById("titel").value.trim();

  if (!draftId) {
    const refDoc = doc(collection(db, "tutorials"));
    draftId = refDoc.id;

    await setDoc(refDoc, {
      title: title || "Nieuw project",
      authorId: user.uid,
      draft: true,
      createdAt: serverTimestamp(),
      lastEditedAt: serverTimestamp()
    });
  } else {
    await updateDoc(doc(db, "tutorials", draftId), {
      title,
      level: selectedLevel,
      materials: getSelectedMaterials(),
      lastEditedAt: serverTimestamp()
    });
  }

  // Toon feedback popup
  showPopup({
    imageSrc: "images/pop-ups/size-1.png",
    text: "Make opgeslagen in drafts!",
    buttonText: "OK!",
    buttonAction: () => window.location.href = "inspiration.html"
  });

}, 1200);

/* ====================== HOODFOTO PREVIEW ====================== */
const mainImageInput = document.getElementById("mainImage");
const mainImagePreview = document.getElementById("mainImagePreview");

mainImagePreview.addEventListener("click", () => mainImageInput.click());
mainImageInput.addEventListener("change", () => {
  const file = mainImageInput.files[0];
  if (!file) return;
  mainImagePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Hoofdfoto preview">`;
});

/* ====================== FORM SUBMIT ====================== */
document.getElementById("tutorialForm").addEventListener("submit", async e => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return alert("Je moet ingelogd zijn");

  const title = document.getElementById("titel").value.trim();
  const category = document.getElementById("tutorialCategory").value;
  const duration = document.getElementById("duration-input").value;
  const mainImageFile = mainImageInput.files[0];

  if (!mainImageFile) {
    return alert("Upload een hoofdfoto!");
  }

  const mainRef = ref(storage, `tutorials/${draftId}/main.jpg`);
  await uploadBytes(mainRef, mainImageFile);
  const mainImageUrl = await getDownloadURL(mainRef);

  await updateDoc(doc(db, "tutorials", draftId), {
    title,
    category,
    duration,
    level: selectedLevel,
    materials: getSelectedMaterials(),
    mainImageUrl,
    steps: stepsData,
    draft: false,
    publishedAt: serverTimestamp()
  });

  window.location.href = `make-project.html?id=${draftId}`;
});

/* ====================== AUTH ====================== */
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadMaterials();
});

document.getElementById("titel").addEventListener("input", autoSaveDraft);
