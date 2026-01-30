import { auth, db } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  // profiel avatar
  const profileAvatar = document.getElementById("profileAvatar");
  if (profileAvatar && data.avatar) {
    profileAvatar.src = data.avatar;
  }

  // navbar avatar
  const navbarAvatar = document.getElementById("navbarAvatar");
  if (navbarAvatar && data.avatar) {
    navbarAvatar.src = data.avatar;
  }

  // username
  const nameEl = document.getElementById("profileUsername");
  if (nameEl) nameEl.innerText = data.username;

  // niveau tonen
  const levelIcon = document.getElementById("avatarLevelIcon");
  if (levelIcon) {
    // standaard niveau = 1
    const level = data.level || 1;
    levelIcon.src = `images/icons/niveau_${level}.png`;
  }


  // materialen
  const materialsContainer = document.getElementById("profileMaterials");
  if (materialsContainer) {
    materialsContainer.innerHTML = ""; // eerst leegmaken
    const materialenSnapshot = await getDocs(collection(db, "Materialen")); // alle materialen ophalen
    materialenSnapshot.forEach(docSnap => {
      const m = docSnap.data();
      const materialName = m.Materiaal || m.naam || "Onbekend";

      const div = document.createElement("div");
      div.className = "material-blok";

      // Check of gebruiker dit materiaal bezit
      if (data.materialsOwned?.includes(docSnap.id)) {
        div.classList.add("selected");
      }

      div.innerText = materialName;
      materialsContainer.appendChild(div);
    });
  }

  const myTutorialsEl = document.getElementById("myTutorials");
  if (myTutorialsEl) {
    myTutorialsEl.innerHTML = "";

    const q = query(
      collection(db, "tutorials"),
      where("authorId", "==", user.uid),
      where("draft", "==", false),
      orderBy("publishedAt", "desc")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      myTutorialsEl.innerHTML = `<p class="text-center mt-3" style="opacity:.8;">Nog geen gepubliceerde makes ✨</p>`;
    } else {
      snap.forEach(docSnap => {
        const t = docSnap.data();

        const card = document.createElement("div");
        card.className = "tutorial-card";
        card.innerHTML = `
        <img src="${t.mainImageUrl || "images/icons/garen.png"}" class="tutorial-image" alt="${t.title || "make"}">
      `;

        card.addEventListener("click", () => {
          window.location.href = `make-project.html?id=${docSnap.id}`;
        });

        myTutorialsEl.appendChild(card);
      });
    }
  }

});

const btnMy = document.getElementById("btnMy");
const btnMade = document.getElementById("btnMade");
const my = document.getElementById("myTutorials");
const made = document.getElementById("madeTutorials");

btnMy?.addEventListener("click", () => {
  btnMy.classList.add("active");
  btnMade.classList.remove("active");
  my.style.display = "block";
  made.style.display = "none";
});

btnMade?.addEventListener("click", () => {
  btnMade.classList.add("active");
  btnMy.classList.remove("active");
  my.style.display = "none";
  made.style.display = "block";
});
