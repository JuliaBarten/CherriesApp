import { auth, db, storage } from "./firebase-init.js";
import { collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

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
   Stappen modal + carrousel
====================== */
let stepsData = [];
let stepCount = 0;

const stepModal = new bootstrap.Modal(document.getElementById("stepModal"));
const stepImageInput = document.getElementById("stepImage");
const stepTextInput = document.getElementById("stepText");
const stepNumberPreview = document.getElementById("stepNumberPreview");

document.getElementById("addStepBtn").addEventListener("click", () => {
  stepNumberPreview.textContent = stepCount + 1;
  stepModal.show();
});

document.getElementById("saveStepBtn").addEventListener("click", () => {
  stepCount++;

  stepsData.push({
    order: stepCount,
    image: stepImageInput.files[0] || null,
    text: stepTextInput.value.trim()
  });

  stepImageInput.value = "";
  stepTextInput.value = "";
  stepModal.hide();

  renderStepCarousel();
});


// Render alle stappen in carrousel
function renderStepCarousel() {
  const carouselInner = document.querySelector("#stepsCarousel .carousel-inner");
  carouselInner.innerHTML = "";

  stepsData.forEach((step, index) => {
    const item = document.createElement("div");
    item.className = `carousel-item ${index === 0 ? "active" : ""}`;

    item.innerHTML = `
      <div class="step-card">
        <div class="step-image-wrapper">
          ${
            step.image
              ? `<img src="${URL.createObjectURL(step.image)}">`
              : `<div class="step-placeholder">Geen afbeelding</div>`
          }
        </div>

        <div class="step-text">
          <strong>Stap ${step.order}</strong>
          ${step.text ? `<p>${step.text}</p>` : ""}
        </div>
      </div>
    `;

    carouselInner.appendChild(item);
  });
}


document.getElementById("addStepBtn").onclick = () => stepModal.show();



/* ======================
   Tutorial Submit
====================== */
const form = document.getElementById("tutorialForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return alert("Je moet ingelogd zijn");

    const title = document.getElementById("titel").value.trim();
    const description = document.getElementById("omschrijving").value.trim();
    const duration = document.getElementById("duration-input").value;
    const mainImageFile = document.getElementById("mainImage").files[0];

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

    try {
        // Hoofdafbeelding uploaden
        const mainRef = ref(storage, `tutorials/${user.uid}/${Date.now()}_main.jpg`);
        await uploadBytes(mainRef, mainImageFile);
        const mainImageUrl = await getDownloadURL(mainRef);

        // Tutorial document
        const tutorialRef = await addDoc(collection(db, "tutorials"), {
            title,
            description,
            level: selectedLevel,
            duration,
            materials,
            category,
            mainImageUrl,
            authorId: user.uid,
            authorUsername: user.displayName || "Onbekend",
            createdAt: serverTimestamp()
        });

        // Stappen uploaden
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

            await addDoc(collection(db, "tutorials", tutorialRef.id, "steps"), {
                order: step.order,
                text: step.text,
                image: imageUrl
            });
        }


        alert("Tutorial succesvol geüpload!");
        form.reset();
        stepsOverview.innerHTML = "";
        stepCount = 0;
        stepsData = [];
        updateHearts(1);

    } catch (err) {
        console.error(err);
        alert("Upload mislukt: " + err.message);
    }
});

// Materialen laden bij DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    loadMaterialsForMake();
});
