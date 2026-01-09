import { auth, db } from "./firebase-init.js";
import { renderAvatarPicker } from "./avatar-utils.js";
import { doc, updateDoc, getDoc } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const container = document.getElementById("avatarCarousel");
const saveBtn = document.getElementById("saveAvatarBtn");

let selectedAvatar = null;

onAuthStateChanged(auth, async (user) => {
  if (!user || !container) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  const currentAvatar = snap.exists() ? snap.data().avatar : null;

  const getSelected = renderAvatarPicker(container, (avatar) => {
    selectedAvatar = avatar;
  });

  // huidige avatar vooraf selecteren
  if (currentAvatar) {
    container.querySelectorAll("img").forEach(img => {
      if (img.src.includes(currentAvatar)) {
        img.classList.add("selected");
        selectedAvatar = currentAvatar;
      }
    });
  }

  saveBtn?.addEventListener("click", async () => {
    if (!selectedAvatar) {
      alert("Kies eerst een avatar");
      return;
    }

    await updateDoc(doc(db, "users", user.uid), {
      avatar: selectedAvatar
    });

    window.location.href = "profiel.html";
  });
});
