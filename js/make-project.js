import { db } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";


function setupEditButton(authorId) {
  const btn = document.getElementById("editTutorialBtn");
  const user = auth.currentUser;

  if (user && user.uid === authorId) {
    btn.style.display = "block";
    btn.addEventListener("click", () => {
      window.location.href = `make-edit.html?id=${tutorialId}`;
    });
  }
}

const params = new URLSearchParams(window.location.search);
const tutorialId = params.get("id");

if (!tutorialId) {
  console.error("Geen tutorial ID");
}

async function loadTutorial(id) {
  // tutorial zelf
  const snap = await getDoc(doc(db, "tutorials", id));
  if (!snap.exists()) return;

  const t = snap.data();
  document.getElementById("projectTitle").textContent = t.title;

  // stappen ophalen
  const stepsSnap = await getDocs(
    query(
      collection(db, "tutorials", id, "steps"),
      orderBy("order")
    )
  );

  const steps = stepsSnap.docs.map(d => d.data());
  renderSteps(steps);

  // edit-knop tonen
  setupEditButton(t.authorId);
}


function renderSteps(steps) {
  const container = document.getElementById("projectSteps");
  container.innerHTML = "";

  steps.forEach((step, index) => {
    const div = document.createElement("div");
    div.className = "step-card";

    div.innerHTML = `
      <div class="step-image-wrapper">
        ${step.image
        ? `<img src="${step.image}" alt="Stap ${index + 1}">`
        : `<div class="step-image-placeholder">Geen foto</div>`
      }
      </div>
      <div class="step-text">
        <strong>Stap ${step.order}</strong>
        <p>${step.text}</p>
      </div>
    `;

    container.appendChild(div);
  });
}

onAuthStateChanged(auth, user => {
  const editBtn = document.getElementById("editTutorialBtn");

  if (!editBtn) return;

  if (!user || user.uid !== t.authorId) {
    editBtn.style.display = "none";
  } else {
    editBtn.style.display = "block";
    editBtn.onclick = () => {
      window.location.href = `make-edit.html?id=${tutorialId}`;
    };
  }
});
