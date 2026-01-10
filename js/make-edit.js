import { auth, db } from "./firebase-init.js";
import { doc, getDoc, updateDoc, serverTimestamp} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const tutorialId = params.get("id");

let selectedLevel = 1;
let stepsData = [];

/* ====================== LOAD ====================== */
async function loadTutorial() {
  const snap = await getDoc(doc(db, "tutorials", tutorialId));
  if (!snap.exists()) return;

  const t = snap.data();

  document.getElementById("titel").value = t.title;
  document.getElementById("duration-input").value = t.duration || "";
  document.getElementById("tutorialCategory").value = t.category || "";

  selectedLevel = t.level || 1;
  stepsData = t.steps || [];

  updateHearts(selectedLevel);
}

/* ====================== AUTOSAVE ====================== */
const autoSave = debounce(async () => {
  await updateDoc(doc(db, "tutorials", tutorialId), {
    title: document.getElementById("titel").value.trim(),
    level: selectedLevel,
    lastEditedAt: serverTimestamp()
  });
}, 1000);

/* ====================== HELPERS ====================== */
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function updateHearts(level) {
  document.querySelectorAll(".niveau-icon").forEach(icon => {
    icon.src =
      Number(icon.dataset.level) <= level
        ? "images/icons/heart3.png"
        : "images/icons/heart4.png";
  });
  selectedLevel = level;
}

/* ====================== EVENTS ====================== */
document.getElementById("titel").addEventListener("input", autoSave);
document.querySelectorAll(".niveau-icon").forEach(icon => {
  icon.onclick = () => {
    updateHearts(Number(icon.dataset.level));
    autoSave();
  };
});

/* ====================== INIT ====================== */
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "tutorials", tutorialId));
  if (!snap.exists()) return;

  const tutorial = snap.data();

  if (tutorial.authorId !== user.uid) {
    alert("Je mag deze tutorial niet bewerken");
    window.location.href = `make-project.html?id=${tutorialId}`;
    return;
  }

  loadTutorial();
});

