import { auth, db } from "./firebase-init.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const container = document.getElementById("draftsContainer");
const emptyState = document.getElementById("emptyState");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const q = query(
    collection(db, "tutorials"),
    where("authorId", "==", user.uid),
    where("draft", "==", true),
    orderBy("lastEditedAt", "desc")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    emptyState.style.display = "block";
    return;
  }

  snap.forEach(docSnap => {
    const t = docSnap.data();

    const card = document.createElement("div");
    card.className = "item-bar";

    card.innerHTML = `
      <div class="tutorial-thumb">
        <img src="${t.mainImageUrl || 'images/icons/garen.png'}">
      </div>
      <div class="tutorial-info">
        <h4>${t.title || "Naamloos project"}</h4>
        <small>Laatst bewerkt</small>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `make-edit.html?id=${docSnap.id}`;
    });

    container.appendChild(card);
  });
});
