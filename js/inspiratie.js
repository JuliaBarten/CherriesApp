import { db } from "./firebase-init.js";
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth } from "./firebase-init.js";

// ------------------------------ RENDER HARTJES ------------------
function renderHearts(level) {
  let heartsHTML = "";
  for (let i = 0; i < level; i++) {
    heartsHTML += `<img src="images/icons/heart1.png" class="tut-card-ic" alt="hart">`;
  }
  return heartsHTML;
}

// ------------------------------ RENDER TUTORIALS ------------------
async function loadTutorials() {
  const grid = document.getElementById("tutorialGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const snapshot = await getDocs(collection(db, "tutorials"));

  // 1️⃣ Tutorials verzamelen
  const tutorials = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  // 2️⃣ Filteren
  const filtered = tutorials.filter(matchesFilters);

  // 3️⃣ Sorteren (nieuwste bovenaan)
  const sorted = sortTutorials(filtered);

  // 4️⃣ Renderen
  for (const t of sorted) {
    const card = document.createElement("div");
    card.className = "tutorial-card";

    card.innerHTML = `
      <img src="${t.mainImageUrl}" alt="${t.title}" class="tutorial-image">

      <!-- FAVORIET KNOP -->
      <div class="favorite-btn">
        <img src="images/icons/fav_uit.png" alt="Favoriet">
      </div>

      <!-- INFO OVERLAY -->
      <div class="overlay">
        <div class="overlay-row hearts-row">
          ${renderHearts(t.level)}
        </div>

        <div class="overlay-row time-row">
        <span>${t.duration}</span>
          <img src="images/icons/tijd_klok.png" alt="klok">
        </div>
      </div>
    `;

    // FAVORIET KNOP FUNCTIONALITEIT
    const favIcon = card.querySelector(".favorite-btn img");
    let isFavorite = false; // dit kan je later aanpassen met DB

    favIcon.addEventListener("click", async () => {
      isFavorite = !isFavorite;
      favIcon.src = isFavorite
        ? "images/icons/fav_aan.png"
        : "images/icons/fav_uit.png";

      if (isFavorite) {
        // ✅ Voeg toe aan Firestore
        const userId = auth.currentUser.uid;
        await addFavorite(userId, t.id);
      } else {
        // ❌ Verwijder uit Firestore
        const userId = auth.currentUser.uid;
        await deleteDoc(doc(db, "users", userId, "favorites", t.id));
      }
    });

    grid.appendChild(card);
  }
}

// ============================ add favorite =============================

async function addFavorite(userId, tutorialId) {
  await setDoc(
    doc(db, "users", userId, "favorites", tutorialId),
    { createdAt: new Date() }
  );
}

// ------------------------------ FILTER & SORT ------------------
function matchesFilters() {
  return true;
}

function sortTutorials(tutorials) {
  return tutorials.sort((a, b) =>
    (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  );
}

// ------------------------------ INIT ------------------
document.addEventListener("DOMContentLoaded", () => {
  loadTutorials();
});
