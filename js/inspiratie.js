import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";


// ------------------------------ render tutorials ------------------
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
    const tools = await getToolNames(t.materials || []);

    const card = document.createElement("div");
    card.className = "tutorial-card";

    card.innerHTML = `
      <img src="${t.mainImageUrl}" alt="${t.title}">
      <div class="favorite-btn">❤️</div>
      <div class="overlay">
        ⏱ ${t.duration}<br>
        ⭐ Niveau ${t.level}<br>
        🛠 ${tools.join(", ")}
      </div>
    `;

    const favBtn = card.querySelector(".favorite-btn");
    let isFavorite = false;

    favBtn.addEventListener("click", async () => {
      await toggleFavorite(t.id, isFavorite);
      isFavorite = !isFavorite;
      favBtn.textContent = isFavorite ? "💖" : "❤️";
    });

    grid.appendChild(card);

    
  }
}

function matchesFilters() {
  return true;
}

function sortTutorials(tutorials) {
  return tutorials.sort((a, b) =>
    (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  );
}

async function getToolNames(materialIds) {
  return [];
}


document.addEventListener("DOMContentLoaded", () => {
  loadTutorials();
});
