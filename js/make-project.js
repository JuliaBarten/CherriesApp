import { db } from "./firebase-init.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const tutorialId = params.get("id");

if (!tutorialId) {
  console.error("Geen tutorial ID");
}


async function loadTutorial(id) {
  const snap = await getDoc(doc(db, "tutorials", id));
  if (!snap.exists()) return;

  const t = snap.data();

  document.getElementById("projectTitle").textContent = t.title;

  renderSteps(t.steps || []);
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
        ? `<img src="${step.image}" alt="stap ${index + 1}">`
        : `<div class="step-image-placeholder">Geen foto</div>`
      }
      </div>
      <div class="step-text">
        <strong>Stap ${index + 1}</strong>
        <p>${step.text}</p>
      </div>
    `;

    container.appendChild(div);
  });
}

loadTutorial(tutorialId);
