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

const draftBox = document.getElementById("draftsContainer");
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
      <div class="item-info">
        <h1>${t.title || "Naamloos project"}</h1>
        <h5>Laatste bewerking: ${t.lastEditedAt ? new Date(t.lastEditedAt.seconds * 1000).toLocaleDateString() : 'Onbekend'}</h5>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `make-edit.html?id=${docSnap.id}`;
    });

    draftBox.appendChild(card);
  });
});
