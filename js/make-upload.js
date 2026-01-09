import { auth, db, storage } from "./firebase-init.js";
import { collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let editingStepIndex = null;

const mainImageInput = document.getElementById("mainImage");
const mainImagePreview = document.getElementById("mainImagePreview");

mainImagePreview.addEventListener("click", () => {
  mainImageInput.click();
});

mainImageInput.addEventListener("change", () => {
  const file = mainImageInput.files[0];
  if (!file) return;

  mainImagePreview.innerHTML = `
    <img src="${URL.createObjectURL(file)}" alt="Hoofdfoto preview">
  `;
});


/* ======================   Niveau LADEN (hearts)   ====================== */
let selectedLevel = 1;

function updateHearts(level) {
  document.querySelectorAll(".niveau-icon").forEach(icon => {
    const iconLevel = Number(icon.dataset.level);
    icon.src = iconLevel <= level ? "images/icons/heart3.png" : "images/icons/heart4.png";
  });
  selectedLevel = level;
}

// Klik-events op hartjes
document.querySelectorAll(".niveau-icon").forEach(icon => {
  icon.addEventListener("click", () => {
    updateHearts(Number(icon.dataset.level));
  });
});

// Standaard niveau
updateHearts(1);

/* ======================  Materialen laden ===================== */
async function loadMaterialsForMake() {
  const makeMaterialenContainer = document.getElementById("makeMaterialenContainer");
  if (!makeMaterialenContainer) return;

  makeMaterialenContainer.innerHTML = "";

  const materialenSnapshot = await getDocs(collection(db, "Materialen"));

  materialenSnapshot.forEach(docSnap => {
    const m = docSnap.data();
    const materialName = m.Materiaal || m.naam || "Onbekend";

    const div = document.createElement("div");
    div.className = "material-blok";
    div.textContent = materialName;
    div.dataset.materialId = docSnap.id;

    div.addEventListener("click", () => {
      div.classList.toggle("selected");
    });

    makeMaterialenContainer.appendChild(div);
  });
}

/* ======================
   Stappen modal
====================== */
let stepsData = [];
let stepCount = 0;

const stepModal = new bootstrap.Modal(document.getElementById("stepModal"));
const stepImageInput = document.getElementById("stepImage");
const stepTextInput = document.getElementById("stepText");
const stepNumberPreview = document.getElementById("stepNumberPreview");
const stepImagePreview = document.getElementById("stepImagePreview");

// Klik op preview → open file picker
stepImagePreview.addEventListener("click", () => {
  stepImageInput.click();
});

// Preview tonen bij selecteren
stepImageInput.addEventListener("change", () => {
  const file = stepImageInput.files[0];
  if (!file) return;

  stepImagePreview.innerHTML = `
    <img src="${URL.createObjectURL(file)}" alt="Stap afbeelding preview">
  `;
});

document.getElementById("addStepBtn").addEventListener("click", () => {
  stepNumberPreview.textContent = stepCount + 1;
  stepModal.show();
});

document.getElementById("saveStepBtn").addEventListener("click", () => {
  const text = stepTextInput.value.trim();
  const image = stepImageInput.files[0] || null;

  if (editingStepIndex !== null) {
    // ✏️ EDIT
    stepsData[editingStepIndex].text = text;
    if (image) {
      stepsData[editingStepIndex].image = image;
    }
    editingStepIndex = null;
  } else {
    // ➕ NIEUW
    stepCount++;
    stepsData.push({
      order: stepCount,
      text,
      image
    });
  }
  stepImagePreview.innerHTML = `<span class="plus-icon">+</span>`;


  stepTextInput.value = "";
  stepImageInput.value = "";
  stepModal.hide();
  renderStepsList();
});


// Herschrijf stapnummers na verwijderen
function renumberSteps() {
  stepsData.forEach((step, i) => {
    step.order = i + 1;
  });
  stepCount = stepsData.length;
}

function openEditStep(index) {
  const step = stepsData[index];

  stepTextInput.value = step.text || "";
  stepImageInput.value = "";

  if (step.image) {
    stepImagePreview.innerHTML = `
      <img src="${URL.createObjectURL(step.image)}">
    `;
  } else {
    stepImagePreview.innerHTML = `<span class="plus-icon">+</span>`;
  }

  editingStepIndex = index;
  stepModal.show();
}


//stappen lijst
function renderStepsList() {
  const container = document.getElementById("stepsOverview");
  container.innerHTML = "";

  stepsData.forEach((step, index) => {
    const row = document.createElement("div");
    row.className = "step-row";

    row.innerHTML = `
      <div class="step-image">
        ${
          step.image
            ? `<img src="${URL.createObjectURL(step.image)}">`
            : `<div class="step-placeholder"></div>`
        }
      </div>

      <div class="step-content">
        <strong>Stap ${step.order}</strong>
        <p>${step.text || ""}</p>
      </div>

      <div class="step-actions">
        <button class="classic-button-small edit-step">✏️</button>
        <button class="classic-button-small delete-step">🗑</button>
      </div>
    `;

    // Verwijderen
    row.querySelector(".delete-step").addEventListener("click", () => {
      stepsData.splice(index, 1);
      renumberSteps();
      renderStepsList();
    });

    // Bewerken
    row.querySelector(".edit-step").addEventListener("click", () => {
      openEditStep(index);
    });

    container.appendChild(row);
  });
}

/* ======================
   Tutorial Submit
====================== */
const form = document.getElementById("tutorialForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("Je moet ingelogd zijn");
    return;
  }

  const title = document.getElementById("titel").value.trim();
  const duration = document.getElementById("duration-input").value;
  const mainImageFile = document.getElementById("mainImage").files[0];
  const category = document.getElementById("tutorialCategory").value;

  const materials = Array.from(
    document.querySelectorAll("#makeMaterialenContainer .material-blok.selected")
  ).map(el => el.dataset.materialId);

  if (!materials.length) {
    alert("Selecteer minstens één materiaal!");
    return;
  }

  if (!mainImageFile) {
    alert("Upload een hoofdfoto!");
    return;
  }

  if (!category) {
    alert("Selecteer een categorie!");
    return;
  }

  try {
    const mainRef = ref(storage, `tutorials/${user.uid}/${Date.now()}_main.jpg`);
    await uploadBytes(mainRef, mainImageFile);
    const mainImageUrl = await getDownloadURL(mainRef);
    const tutorialRef = await addDoc(collection(db, "tutorials"), {
      title,
      level: selectedLevel,
      duration,
      materials,
      category,
      mainImageUrl,
      authorId: user.uid,
      authorUsername: user.displayName || "Onbekend",
      createdAt: serverTimestamp()
    });

    for (const step of stepsData) {
      let imageUrl = null;

      if (step.image) {
        const stepRef = ref(
          storage,
          `tutorials/${tutorialRef.id}/${crypto.randomUUID()}`
        );
        await uploadBytes(stepRef, step.image);
        imageUrl = await getDownloadURL(stepRef);
      }

      await addDoc(collection(db, "tutorials", tutorialRef.id, "steps"),
        {
          order: step.order,
          text: step.text,
          image: imageUrl
        }
      );
    }

    alert("Tutorial succesvol geüpload!");
    form.reset();
    stepsData = [];
    stepCount = 0;
    updateHearts(1);

  } catch (err) {
    console.error(err);
    alert("Upload mislukt: " + err.message);
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadMaterialsForMake();
});