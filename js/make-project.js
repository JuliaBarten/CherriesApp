import { auth, db } from "./firebase-init.js";
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const tutorialId = params.get("id");

const heroEl = document.getElementById("projectHero");
const titleEl = document.getElementById("projectTitle");
const metaEl = document.getElementById("projectMeta");
const materialsEl = document.getElementById("projectMaterials");
const stepsEl = document.getElementById("projectSteps");

const editBtn = document.getElementById("editTutorialBtn");
const startBtn = document.getElementById("startTutorialBtn");

if (!tutorialId) {
  console.error("Geen tutorial ID in URL");
}

function safeText(v) {
  return (v ?? "").toString();
}


function renderHero(t) {
  const img = t.mainImageUrl
    ? `<img src="${t.mainImageUrl}" alt="${safeText(t.title)}" style="width:100%; border-radius: var(--borderknop); box-shadow: var(--schaduw);">`
    : `<div class="step-image-placeholder">Geen hoofdfoto</div>`;

  heroEl.innerHTML = img;
}


async function renderMaterials(tutorial) {
  const container = document.getElementById("projectMaterials");
  if (!container) return;

  container.innerHTML = "";

  const tutorialMaterials = tutorial.materials || [];
  if (!tutorialMaterials.length) {

    return;
  }

  // Titel
  const title = document.createElement("div");
  title.classList.add("mb-2");
  container.appendChild(title);

  const wrapper = document.createElement("div");
  wrapper.className = "d-flex flex-wrap gap-2";

  // Alle materialen ophalen
  const materialenSnapshot = await getDocs(collection(db, "Materialen"));

  materialenSnapshot.forEach(docSnap => {
    if (!tutorialMaterials.includes(docSnap.id)) return;

    const m = docSnap.data();
    const materialName = m.Materiaal || m.naam || "Onbekend";

    const div = document.createElement("div");
    div.className = "material-blok selected"; // altijd selected
    div.innerText = materialName;

    wrapper.appendChild(div);
  });

  container.appendChild(wrapper);
}
function renderMetaSimple(t) {
  // we gebruiken je bestaande container #projectMeta
  const container = metaEl;
  if (!container) return;

  const level = Math.min(5, Math.max(1, Number(t.level || 1)));
  const duration = safeText(t.duration || "00:00");
  const category = safeText(t.category || "-");

  container.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <img src="images/icons/niveau_${level}.png" alt="Niveau ${level}" style="width:50px; height:50px;">
      <div class="d-flex align-items-center gap-2">
        <img src="images/icons/tijd_klok.png" alt="Tijd" style="width:50px; height:50px;">
        <span>${duration}</span>
        </div
    </div>
  `;
}

function renderLevelAndTime(tutorial) {
  const container = document.getElementById("projectMeta");
  if (!container) return;

  container.innerHTML = "";

  const level = tutorial.level || 1;
  const duration = tutorial.duration || "";

  // Niveau icoon
  const levelWrapper = document.createElement("div");
  levelWrapper.className = "d-flex align-items-center gap-2";

  const levelImg = document.createElement("img");
  levelImg.src = `images/icons/niveau_${level}.png`;
  levelImg.alt = `Niveau ${level}`;
  levelImg.style.width = "32px";
  levelImg.style.height = "32px";

  levelWrapper.appendChild(levelImg);

  // Tijd
  if (duration) {
    const timeWrapper = document.createElement("div");
    timeWrapper.className = "d-flex align-items-center gap-1";

    const timeIcon = document.createElement("img");
    timeIcon.src = "images/icons/tijd_klok.png";
    timeIcon.alt = "Tijd";
    timeIcon.style.width = "18px";

    const timeText = document.createElement("span");
    timeText.textContent = duration;
    timeWrapper.appendChild(timeIcon);
    timeWrapper.appendChild(timeText);
    levelWrapper.appendChild(timeWrapper);
  }

  container.appendChild(levelWrapper);
}


async function setupButtons(user, t) {
  // edit button: alleen auteur
  if (user && user.uid === t.authorId) {
    editBtn.style.display = "block";
    editBtn.onclick = () => window.location.href = `make-edit.html?id=${tutorialId}`;
  } else {
    editBtn.style.display = "none";
  }

  // start/verdergaan
  if (!startBtn) return;

  if (!user) {
    startBtn.textContent = "Start";
    startBtn.onclick = () => window.location.href = `make-follow.html?id=${tutorialId}&step=0`;
    return;
  }

  const progRef = doc(db, "users", user.uid, "progress", tutorialId);
  const progSnap = await getDoc(progRef);

  if (progSnap.exists() && progSnap.data()?.completed !== true) {
    const stepIndex = Number(progSnap.data()?.stepIndex ?? 0);
    startBtn.textContent = "Verdergaan";
    startBtn.onclick = () => window.location.href = `make-follow.html?id=${tutorialId}&step=${stepIndex}`;
  } else {
    startBtn.textContent = "Start";
    startBtn.onclick = async () => {
      await setDoc(progRef, {
        tutorialId,
        stepIndex: 0,
        completed: false,
        updatedAt: serverTimestamp()
      }, { merge: true });

      window.location.href = `make-follow.html?id=${tutorialId}&step=0`;
    };
  }
}

async function loadTutorial(user) {
  try {
    const snap = await getDoc(doc(db, "tutorials", tutorialId));
    if (!snap.exists()) return alert("Bestaat niet (meer).");

    const t = snap.data();
    const isOwner = user && user.uid === t.authorId;

    if (t.draft === true && !isOwner) {
      alert("Deze make is nog een draft en is niet zichtbaar voor anderen.");
      window.location.href = "inspiration.html";
      return;
    }

    // ✅ vanaf hier pas renderen
    renderHero(t);
    titleEl.textContent = safeText(t.title || "Make");
    renderLevelAndTime(t);     // jouw niveau icoon + tijd
    await renderMaterials(t);
    await setupButtons(user, t);

  } catch (e) {
    if (e?.code === "permission-denied") {
      alert("Je hebt geen toegang tot deze make (waarschijnlijk een draft).");
      window.location.href = "inspiration.html";
      return;
    }
    console.error(e);
    alert("Er ging iets mis.");
  }
}




onAuthStateChanged(auth, async (user) => {
  if (!tutorialId) return;
  await loadTutorial(user);
});
