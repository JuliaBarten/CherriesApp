import { auth, db } from "./firebase-init.js";
import {
  collection, query, where, orderBy, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  await loadMyMakes(user.uid);
  await loadMadeMakes(user.uid);
});

async function loadMyMakes(uid) {
  const myTutorialsEl = document.getElementById("myTutorials");
  if (!myTutorialsEl) return;
  myTutorialsEl.innerHTML = "";

  const qMy = query(
    collection(db, "tutorials"),
    where("authorId", "==", uid),
    where("draft", "==", false),
    orderBy("publishedAt", "desc")
  );

  const snap = await getDocs(qMy);

  if (snap.empty) {
    myTutorialsEl.innerHTML = `<p class="text-center mt-3" style="opacity:.8;">Nog geen gepubliceerde makes ✨</p>`;
    return;
  }

  snap.forEach((docSnap) => {
    const t = docSnap.data();
    myTutorialsEl.appendChild(makeTutorialCard({
      id: docSnap.id,
      title: t.title,
      imageUrl: t.mainImageUrl
    }, "make-project.html"));
  });
}

async function loadMadeMakes(uid) {
  const madeTutorialsEl = document.getElementById("madeTutorials");
  if (!madeTutorialsEl) return;
  madeTutorialsEl.innerHTML = "";

  // Subcollectie met voortgang/afgerond
  const qMade = query(
    collection(db, "users", uid, "madeMakes"),
    orderBy("startedAt", "desc") // of completedAt, afhankelijk van je voorkeur
  );

  const snap = await getDocs(qMade);

  if (snap.empty) {
    madeTutorialsEl.innerHTML = `<p class="text-center mt-3" style="opacity:.8;">Je hebt nog geen makes gestart ✨</p>`;
    return;
  }

  // Voor elk item: haal tutorial op zodat je titel + afbeelding kunt tonen
  for (const madeDoc of snap.docs) {
    const made = madeDoc.data();
    const tutorialId = made.tutorialId || madeDoc.id;

    // Optie A: als je title/mainImageUrl in madeMakes opslaat (sneller)
    if (made.title || made.mainImageUrl) {
      madeTutorialsEl.appendChild(makeTutorialCard({
        id: tutorialId,
        title: made.title,
        imageUrl: made.mainImageUrl,
        status: made.status
      }, "make-follow.html"));
      continue;
    }

    // Optie B: tutorial ophalen uit tutorials
    const tutSnap = await getDoc(doc(db, "tutorials", tutorialId));
    if (!tutSnap.exists()) continue;

    const t = tutSnap.data();
    madeTutorialsEl.appendChild(makeTutorialCard({
      id: tutorialId,
      title: t.title,
      imageUrl: t.mainImageUrl,
      status: made.status
    }, "make-follow.html"));
  }
}

// Card helper
function makeTutorialCard({ id, title, imageUrl, status }, targetPage) {
  const card = document.createElement("div");
  card.className = "tutorial-card";

  card.addEventListener("click", () => {
    window.location.href = `${targetPage}?id=${id}`;
  });

  return card;
}
