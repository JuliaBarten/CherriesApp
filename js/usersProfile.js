import { auth, db } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const myTutorialsContainer = document.getElementById("myTutorials");
const madeTutorialsContainer = document.getElementById("madeTutorials");

async function loadProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();

  // Avatar
  const profileAvatar = document.getElementById("profileAvatar");
  profileAvatar.src = data.avatar || "images/icons/avatar.png";

  // Niveau
  const avatarLevel = document.getElementById("avatarLevel");
  avatarLevel.textContent = data.level || "1";

  // Username
  document.getElementById("profileUsername").textContent = data.username || "Gebruiker";

  // Materialen
  const materialenContainer = document.getElementById("profileMaterials");
  materialenContainer.innerHTML = "";
  const materialenSnapshot = await getDocs(collection(db, "Materialen"));
  materialenSnapshot.forEach(docSnap => {
    const m = docSnap.data();
    if (data.materialsOwned?.includes(docSnap.id)) {
      const div = document.createElement("div");
      div.className = "material-blok selected";
      div.textContent = m.Materiaal || m.naam || "Onbekend";
      materialenContainer.appendChild(div);
    }
  });
}

async function loadMyTutorials(userId) {
  myTutorialsContainer.innerHTML = "";

  const q = query(
    collection(db, "tutorials"),
    where("authorId", "==", userId)
  );

  const snap = await getDocs(q);
  snap.forEach(doc => {
    const t = doc.data();
    myTutorialsContainer.innerHTML += `
      <div class="tutorial-card">
        <img src="${t.mainImageUrl}">
        <h5>${t.title}</h5>
      </div>
    `;
  });
}

document.getElementById("btnMy").onclick = () => {
  myTutorials.style.display = "block";
  madeTutorials.style.display = "none";
};

document.getElementById("btnMade").onclick = () => {
  myTutorials.style.display = "none";
  madeTutorials.style.display = "block";
};


// Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) window.location.href = "aanmelden.html";
  else await loadProfile(user);
    await loadMyTutorials(user.uid);
});
