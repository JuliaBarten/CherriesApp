import { auth, db, storage } from "./firebase-init.js";
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";


const params = new URLSearchParams(window.location.search);
const tutorialId = params.get("id");

if (!tutorialId) {
  alert("Geen tutorial ID");
}

let existingMainImageUrl = null;
let stepsData = [];

async function loadTutorialForEdit() {
  const tutorialRef = doc(db, "tutorials", tutorialId);
  const snap = await getDoc(tutorialRef);

  if (!snap.exists()) {
    alert("Tutorial niet gevonden");
    return;
  }

  const t = snap.data();

  // 🔐 Alleen eigenaar mag bewerken
  const user = auth.currentUser;
  if (!user || user.uid !== t.authorId) {
    alert("Geen toegang");
    window.location.href = "inspiration.html";
    return;
  }

  // Form vullen
  document.getElementById("titel").value = t.title;
  document.getElementById("duration-input").value = t.duration;
  document.getElementById("tutorialCategory").value = t.category;

  existingMainImageUrl = t.mainImageUrl;

  document.getElementById("mainImagePreview").innerHTML = `
    <img src="${existingMainImageUrl}">
  `;

  // Niveau
  updateHearts(t.level);

  // Materialen
  t.materials.forEach(id => {
    const el = document.querySelector(`[data-material-id="${id}"]`);
    if (el) el.classList.add("selected");
  });

  // Stappen laden
  const stepsSnap = await getDocs(
    query(
      collection(db, "tutorials", tutorialId, "steps"),
      orderBy("order")
    )
  );

  stepsData = stepsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderStepsList();
}

row.querySelector(".delete-step").addEventListener("click", async () => {
  const step = stepsData[index];

  if (step.id) {
    await deleteDoc(
      doc(db, "tutorials", tutorialId, "steps", step.id)
    );
  }

  stepsData.splice(index, 1);
  renumberSteps();
  renderStepsList();
});

// steps aanpassen
const form = document.getElementById("tutorialForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("titel").value.trim();
  const duration = document.getElementById("duration-input").value;
  const category = document.getElementById("tutorialCategory").value;
  const mainImageFile = document.getElementById("mainImage").files[0];

  const materials = Array.from(
    document.querySelectorAll("#materialenContainer .material-blok.selected")
  ).map(el => el.dataset.materialId);

  let mainImageUrl = existingMainImageUrl;

  // Nieuwe hoofdfoto?
  if (mainImageFile) {
    const mainRef = ref(
      storage,
      `tutorials/${tutorialId}/main_${Date.now()}`
    );
    await uploadBytes(mainRef, mainImageFile);
    mainImageUrl = await getDownloadURL(mainRef);
  }

  // Tutorial updaten
  await updateDoc(doc(db, "tutorials", tutorialId), {
    title,
    duration,
    category,
    materials,
    level: selectedLevel,
    mainImageUrl
  });

  // Steps opslaan
  for (const step of stepsData) {
    let imageUrl = step.image;

    if (step.image instanceof File) {
      const stepRef = ref(
        storage,
        `tutorials/${tutorialId}/${crypto.randomUUID()}`
      );
      await uploadBytes(stepRef, step.image);
      imageUrl = await getDownloadURL(stepRef);
    }

    if (step.id) {
      await updateDoc(
        doc(db, "tutorials", tutorialId, "steps", step.id),
        {
          text: step.text,
          order: step.order,
          image: imageUrl
        }
      );
    }
  }

  alert("Tutorial bijgewerkt!");
  window.location.href = `make-project.html?id=${tutorialId}`;
});


onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadMaterialsForMake();
  loadTutorialForEdit();
});
