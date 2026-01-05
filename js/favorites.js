import { auth, db } from "./firebase-init.js";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
    "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

async function loadFavorites(userId) {
    const container = document.getElementById("favoritesGrid");
    container.innerHTML = "";
    container.classList.add("favorites-list");

    const favSnap = await getDocs(
        collection(db, "users", userId, "favorites")
    );

    if (favSnap.empty) {
        container.innerHTML = "<p>Je hebt nog geen favorieten</p>";
        return;
    }

    for (const fav of favSnap.docs) {
  const tutorialSnap = await getDoc(
    doc(db, "tutorials", fav.id)
  );
  if (!tutorialSnap.exists()) continue;

  const t = tutorialSnap.data();

  const card = document.createElement("div");
  card.className = "favorite-card";

  card.innerHTML = `
    <div class="favorite-remove">
      <img src="images/icons/close.png">
    </div>

    <img src="${t.mainImageUrl}" class="favorite-image">

    <div class="favorite-info">
      <div class="favorite-title">${t.title}</div>
      <div class="favorite-meta">
        <img src="images/icons/tijd_klok.png">
        <span>${t.duration}</span>
        ${renderHearts(t.level)}
      </div>
    </div>
  `;

  // 👉 OPEN tutorial
  card.addEventListener("click", () => {
    window.location.href = `make-project.html?id=${fav.id}`;
  });

  // 👉 VERWIJDER favoriet
  card.querySelector(".favorite-remove")
    .addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteDoc(
        doc(db, "users", userId, "favorites", fav.id)
      );
      card.remove();
    });

  container.appendChild(card);
}
}

onAuthStateChanged(auth, (user) => {
    if (!user) return;
    loadFavorites(user.uid);
});

// Render hartjes
function renderHearts(level) {
    let html = "";
    for (let i = 0; i < level; i++) {
        html += `<img src="images/icons/heart1.png" alt="hart">`;
    }
    return html;
}

