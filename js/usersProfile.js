import { auth, db } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

async function loadProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();

  // Avatar
  const profileAvatar = document.getElementById("profileAvatar");
  profileAvatar.src = data.avatar || "images/icons/avatar_placeholder.png";

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

  // Tutorials
  await loadTutorials(user.uid, true);
}

// Tutorials laden
let showingOwn = true;
async function loadTutorials(userId, own = true) {
  const container = document.getElementById("tutorialsContainer");
  container.innerHTML = "";
  showingOwn = own;

  const tutorialsRef = collection(db, "Tutorials"); // stel dat je een collectie Tutorials hebt
  let q;
  if (own) {
    q = query(tutorialsRef, where("creatorId", "==", userId));
  } else {
    q = query(tutorialsRef, where("creatorId", "!=", userId));
  }

  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const t = docSnap.data();
    const div = document.createElement("div");
    div.className = "tutorial-card";
    div.textContent = t.title || "Onbekend";
    container.appendChild(div);
  });
}

// Toggle buttons
document.getElementById("ownTutorialsBtn").addEventListener("click", () => {
  document.getElementById("ownTutorialsBtn").classList.add("active");
  document.getElementById("othersTutorialsBtn").classList.remove("active");
  loadTutorials(auth.currentUser.uid, true);
});

document.getElementById("othersTutorialsBtn").addEventListener("click", () => {
  document.getElementById("othersTutorialsBtn").classList.add("active");
  document.getElementById("ownTutorialsBtn").classList.remove("active");
  loadTutorials(auth.currentUser.uid, false);
});

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) window.location.href = "aanmelden.html";
  else await loadProfile(user);
});
