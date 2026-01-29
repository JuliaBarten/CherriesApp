import { auth, db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  documentId
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

function safeText(v) {
  return (v ?? "").toString();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function levelIcon(level) {
  const n = Math.min(5, Math.max(1, Number(level || 1)));
  return `images/icons/niveau_${n}.png`;
}

async function loadFavorites(userId) {
  const container = document.getElementById("favoritesGrid");
  if (!container) return;

  container.innerHTML = "";
  // gebruik dezelfde wrapper vibe als je andere lijsten
  container.className = "d-flex flex-column gap-2";

  const favSnap = await getDocs(collection(db, "users", userId, "favorites"));

  if (favSnap.empty) {
    container.innerHTML = `<p id="emptyStateFav" class="text-center mt-4" style="display:none;">
                    Je hebt geen favorieten <img src="images/icons/heart.png" style="width:24px; height:24px;">
                </p>`;
    return;
  }

  const ids = favSnap.docs.map(d => d.id);

  // tutorials in batches ophalen (Firestore "in" max 10)
  const batches = chunk(ids, 10);
  const tutorials = new Map();

  for (const batchIds of batches) {
    const q = query(
      collection(db, "tutorials"),
      where(documentId(), "in", batchIds)
    );
    const snap = await getDocs(q);
    snap.forEach(d => tutorials.set(d.id, d.data()));
  }

  // Render in dezelfde volgorde als favorites
  for (const tutorialId of ids) {
    const t = tutorials.get(tutorialId);
    if (!t) continue;

    const row = document.createElement("div");
    row.className = "item-bar"; // ✅ zelfde stijl als je “balken”

    const thumb = t.mainImageUrl
      ? `<img src="${t.mainImageUrl}" alt="${safeText(t.title)}">`
      : `<img src="images/icons/naaimachine.png" alt="Geen foto">`;

    const duration = safeText(t.duration || "00:00");
    const title = safeText(t.title || "Zonder titel");
    const lvl = Math.min(5, Math.max(1, Number(t.level || 1)));

    row.innerHTML = `
      <div class="tutorial-thumb">
        ${thumb}
      </div>

      <div class="item-info">
        <div class="item-top">
          <div class="friend-username">${title}</div>
        </div>

        <div class="item-actions">
          <div class="item-status d-flex align-items-center">
            <img src="${levelIcon(lvl)}" alt="Niveau ${lvl}" style="width:40px; height:40px;">
            <span class="d-flex align-items-center">
              <img src="images/icons/tijd_klok.png" alt="tijd" style="width:40px; height:40px;">
              <span>${duration}</span>
            </span>
          </div>
        </div>
      </div>

      <button class="fav-remove-btn" type="button" aria-label="Verwijder favoriet"
        style="background:transparent; border:none; padding:0; display:flex;">
        <img src="images/icons/fav_aan.png" alt="verwijderen" 
        class="del-icon">
      </button>
    `;

    // klik op rij -> open tutorial
    row.addEventListener("click", () => {
      window.location.href = `make-project.html?id=${tutorialId}`;
    });

    // klik op verwijderen -> niet doorklikken
    row.querySelector(".fav-remove-btn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await deleteDoc(doc(db, "users", userId, "favorites", tutorialId));
      row.remove();

      // lege state na verwijderen van laatste
      if (!container.querySelector(".item-bar")) {
        container.innerHTML = `<p id="emptyStateFav" class="text-center mt-4" style="display:none;">
                    Je hebt geen favorieten <img src="images/icons/heart.png" style="width:24px; height:24px;">
                </p>`;
      }
    });

    container.appendChild(row);
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadFavorites(user.uid);
});
