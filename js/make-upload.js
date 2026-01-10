import { auth, db, storage } from "./firebase-init.js";
import { collection, doc, setDoc, updateDoc, serverTimestamp} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
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

/* ====================== LEVEL ====================== */
function updateHearts(level) {
  document.querySelectorAll(".niveau-icon").forEach(icon => {
    const iconLevel = Number(icon.dataset.level);
    icon.src =
      iconLevel <= level
        ? "images/icons/heart3.png"
        : "images/icons/heart4.png";
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

/* ====================== AUTOSAVE DRAFT ====================== */
const autoSaveDraft = debounce(async () => {
  const user = auth.currentUser;
  if (!user) return;

  const title = document.getElementById("titel").value.trim();

  if (!draftId) {
    const ref = doc(collection(db, "tutorials"));
    draftId = ref.id;

    await setDoc(ref, {
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
}, 1200);

/* ====================== MATERIALS ====================== */
async function loadMaterials() {
  const container = document.getElementById("materialenContainer");
  const snap = await getDocs(collection(db, "Materialen"));

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

/* ====================== FORM SUBMIT ====================== */
document.getElementById("tutorialForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!draftId) {
    alert("Draft ontbreekt");
    return;
  }

  const user = auth.currentUser;
  const title = document.getElementById("titel").value.trim();
  const category = document.getElementById("tutorialCategory").value;
  const duration = document.getElementById("duration-input").value;
  const mainImageFile = document.getElementById("mainImage").files[0];

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
