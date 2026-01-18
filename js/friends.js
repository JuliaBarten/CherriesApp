import { auth, db } from "./firebase-init.js";
import {
  collection, query, where, getDocs, getDoc, doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ================= AUTH ================= */
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadFriends();
});

/* ================= HELPERS ================= */
async function getUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

function createFriendCard(user, type, uid) {
  const div = document.createElement("div");
  div.className = "item-bar clickable";

  div.innerHTML = `
    <div class="friend-avatar">
      <img src="${user.avatar || "images/avatar/default.png"}">
      <img class="friend-level"
           src="images/icons/niveau_${user.level || 1}.png">
    </div>

    <div class="friend-info">
      <strong>${user.username}</strong>
      <span class="friend-status">
        ${type === "sharing" ? "🤝 Delende vriend" : "👤 Vriend"}
      </span>
    </div>
  `;

  div.addEventListener("click", () => {
    window.location.href = `profile.html?uid=${uid}`;
  });

  return div;
}


/* ================= FRIENDS ================= */
async function loadFriends() {
  const containerAll = document.getElementById("allFriends");
  const containerSharing = document.getElementById("sharingFriends");

  if (!containerAll || !containerSharing) return;

  containerAll.innerHTML = "";
  containerSharing.innerHTML = "";

  const q = query(
    collection(db, "friendships"),
    where("users", "array-contains", auth.currentUser.uid)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    containerAll.innerHTML = "<p>Geen vrienden</p>";
    return;
  }

  for (const d of snap.docs) {
    const friendship = d.data();
    const friendId = friendship.users.find(
      id => id !== auth.currentUser.uid
    );

    const userSnap = await getDoc(doc(db, "users", friendId));
    if (!userSnap.exists()) continue;

    const u = userSnap.data();

    const card = document.createElement("div");
    card.className = "item-bar";
    card.innerHTML = `
      <div class="friend-avatar">
        <img src="${u.avatar || "images/avatar/default.png"}">
        <img class="level-icon"
             src="images/icons/niveau_${u.level || 1}.png">
      </div>
      <div class="friend-info">
        <strong>${u.username}</strong>
        <span class="friend-status">
          ${friendship.type === "sharing" ? "Delende vriend" : "Vriend"}
        </span>
      </div>
    `;

    card.onclick = () => {
      window.location.href = `profile.html?uid=${friendId}`;
    };

    containerAll.appendChild(card);

    if (friendship.type === "sharing") {
      containerSharing.appendChild(card.cloneNode(true));
    }
  }
}


/* ================= TOGGLE ================= */
document.getElementById("btnAll")?.addEventListener("click", () => {
  document.getElementById("allFriends").style.display = "block";
  document.getElementById("sharingFriends").style.display = "none";
});

document.getElementById("btnSharing")?.addEventListener("click", () => {
  document.getElementById("allFriends").style.display = "none";
  document.getElementById("sharingFriends").style.display = "block";
});
