import { auth, db, storage } from "./firebase-init.js";
import { collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

/* ======================
   Niveau LADEN (hearts)
====================== */
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

/* ======================
   Materialen laden
====================== */
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
const stepsContainer = document.getElementById("stepsContainer");
const addStepBtn = document.getElementById("addStepBtn");
const stepModalEl = document.getElementById("stepModal");
const stepModal = new bootstrap.Modal(stepModalEl);
const stepTextInput = document.getElementById("stepText");
const stepImagesInput = document.getElementById("stepImages");
const carouselInner = document.querySelector("#stepPreview .carousel-inner");
const stepsOverview = document.getElementById("stepsOverview");
let stepCount = 0;

// Carrousel preview
stepImagesInput.addEventListener("change", () => {
    const files = Array.from(stepImagesInput.files).slice(0, 1);
    carouselInner.innerHTML = "";

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = e => {
            const item = document.createElement("div");
            item.className = `carousel-item ${index === 0 ? "active" : ""}`;
            item.innerHTML = `<img src="${e.target.result}" class="d-block w-100">`;
            carouselInner.appendChild(item);
        };
        reader.readAsDataURL(file);
    });
});

// Opslaan stap
document.getElementById("saveStepBtn").addEventListener("click", () => {
    const text = stepTextInput.value.trim();
    const files = Array.from(stepImagesInput.files).slice(1);

    if (!text) {
        alert("Vul een beschrijving in voor deze stap!");
        return;
    }

    stepCount++;
    stepsData.push({
        order: stepCount,
        text,
        images: files
    });

    stepModal.hide();
    stepTextInput.value = "";
    stepImagesInput.value = "";
    carouselInner.innerHTML = "";

    renderStepCards();
});

// Render stappen
function renderStepCards() {
    stepsOverview.innerHTML = "";

    stepsData.forEach(step => {
        const div = document.createElement("div");
        div.className = "step-card classic-outline";
        div.innerHTML = `
            <strong>Stap ${step.order}</strong>
            <p>${step.text}</p>
        `;
        stepsOverview.appendChild(div);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "classic-button-small";
    addBtn.textContent = "+ Nieuwe stap";
    addBtn.onclick = () => stepModal.show();
    stepsOverview.appendChild(addBtn);
}

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
            mainImageUrl,
            authorId: user.uid,
            authorUsername: user.displayName || "Onbekend",
            createdAt: serverTimestamp()
        });

        // Stappen uploaden
        for (const step of stepsData) {
            const imageUrls = [];

            for (const file of step.images) {
                const stepRef = ref(storage, `tutorials/${tutorialRef.id}/${crypto.randomUUID()}`);
                await uploadBytes(stepRef, file);
                imageUrls.push(await getDownloadURL(stepRef));
            }

            await addDoc(collection(db, "tutorials", tutorialRef.id, "steps"), {
                order: step.order,
                text: step.text,
                images: imageUrls
            });
        }

        alert("Tutorial succesvol geüpload!");
        form.reset();
        stepsContainer.innerHTML = "";
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
