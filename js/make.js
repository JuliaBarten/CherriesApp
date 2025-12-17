import { auth, db, storage } from "../firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

/* ======================
   STAPPEN TOEVOEGEN (UI)
====================== */

const stepsContainer = document.getElementById("stepsContainer");
const addStepBtn = document.getElementById("addStepBtn");

let stepCount = 0;

addStepBtn.addEventListener("click", () => {
  stepCount++;

  const stepDiv = document.createElement("div");
  stepDiv.classList.add("step");

  stepDiv.innerHTML = `
    <h5>Stap ${stepCount}</h5>
    <input type="file" accept="image/*" class="step-image" required />
    <input type="text" class="step-description" placeholder="Beschrijving" required />
    <hr>
  `;

  stepsContainer.appendChild(stepDiv);
});

/* ======================
   FORM SUBMIT
====================== */

const form = document.getElementById("tutorialForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("Je moet ingelogd zijn");
    return;
  }

  const title = document.getElementById("titel").value;
  const description = document.getElementById("omschrijving").value;
  const level = document.querySelector('input[name="niveau"]:checked').value;
  const duration = document.getElementById("duration-input").value;
  const imageFile = document.getElementById("mainImage").files[0];

  // materialen
  const materialElements = document.querySelectorAll(
    '#materials input[type="checkbox"]:checked'
  );

  const materials = Array.from(materialElements).map(cb => cb.value);

  const materialsContainer = document.getElementById("materials");

  async function loadMaterials() {
    const snapshot = await getDocs(collection(db, "Materialen"));

    snapshot.forEach(doc => {
      const material = doc.data();

      const label = document.createElement("label");
      label.innerHTML = `
      <input type="checkbox" value="${material.name}">
      ${material.name}
    `;

      materialsContainer.appendChild(label);
      materialsContainer.appendChild(document.createElement("br"));
    });
  }

  loadMaterials();


  /* 1. Hoofdfoto uploaden */
  try {
    const imageRef = ref(
      storage,
      `tutorials/${user.uid}/${Date.now()}_main.jpg`
    );

    await uploadBytes(imageRef, imageFile);
    const imageUrl = await getDownloadURL(imageRef);

    /* 2. Tutorial opslaan */
    const tutorialRef = await addDoc(collection(db, "tutorials"), {
      title,
      description,
      level: Number(level),
      duration,
      materials,
      mainImageUrl: imageUrl,
      authorId: user.uid,
      authorUsername: user.displayName || "Onbekend",
      createdAt: serverTimestamp()
    });

    /* 3. Stappen uploaden */
    const stepElements = document.querySelectorAll(".step");

    for (let i = 0; i < stepElements.length; i++) {
      const step = stepElements[i];
      const stepImage = step.querySelector(".step-image").files[0];
      const stepText = step.querySelector(".step-description").value;

      const stepImageRef = ref(
        storage,
        `tutorials/${tutorialRef.id}/steps/step_${i + 1}.jpg`
      );

      await uploadBytes(stepImageRef, stepImage);
      const stepImageUrl = await getDownloadURL(stepImageRef);

      await addDoc(collection(db, "tutorials", tutorialRef.id, "steps"), {
        stepNumber: i + 1,
        description: stepText,
        imageUrl: stepImageUrl
      });
    }

    alert("Tutorial succesvol geüpload!");
    form.reset();
    stepsContainer.innerHTML = "";
    stepCount = 0;

  } catch (error) {
    console.error(error);
    alert("Er ging iets mis bij het uploaden");
  }
});
