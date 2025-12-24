import { auth, db } from "./firebase-init.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  document.getElementById("saveProfile").addEventListener("click", async () => {
    const niveau = document.getElementById("niveauSelect").value;

    await updateDoc(doc(db, "users", user.uid), {
      level: niveau,
      profileCompleted: true
    });

    window.location.href = "index.html";
  });
});
