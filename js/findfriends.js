import { auth, db } from "./firebase-init.js";
import {
  collection, getDocs, query, where,
  addDoc, doc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ================= HELPERS ================= */
function createFriendCard({ uid, username, avatar, level, status, buttonText, onClick, existing }) {
  const div = document.createElement("div");
  div.className = "friend-bar";
  if (existing) div.classList.add("existing");

  div.innerHTML = `
    <div class="friend-avatar">
      <img src="${avatar || 'images/avatar/default.png'}">
      <img class="level-icon" src="images/icons/niveau_${level || 1}.png">
    </div>
    <div class="friend-info">
      <strong>${username}</strong>
      ${buttonText
      ? `<button class="btn-licht-5">${buttonText}</button>`
      : `<span class="friend-status">${status}</span>`}
    </div>
  `;

  // Klikbaar profiel
  div.querySelector(".friend-avatar").onclick = () => {
    window.location.href = `profile.html?uid=${uid}`;
  };
  div.querySelector(".friend-info strong").onclick = () => {
    window.location.href = `profile.html?uid=${uid}`;
  };

  if (onClick) {
    const btn = div.querySelector(".btn-licht-5");
    if (btn) btn.onclick = onClick;
  }

  return div;
}

/* ================= AUTH ================= */
let friendsSet = new Set();

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  await loadFriends(user.uid);
  await loadUserPreview(user.uid); // willekeurige 5 gebruikers
});

/* ================= LOAD FRIENDS ================= */
async function loadFriends(currentUid) {
  const list = document.getElementById("friendsList");
  if (!list) return;
  list.innerHTML = "";
  friendsSet.clear();

  const q = query(
    collection(db, "friendships"),
    where("users", "array-contains", currentUid)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    list.innerHTML = "<p>Geen vrienden</p>";
    return;
  }

  for (const d of snap.docs) {
    const f = d.data();
    const friendId = f.users.find(id => id !== currentUid);
    friendsSet.add(friendId);

    const userSnap = await getDoc(doc(db, "users", friendId));
    if (!userSnap.exists()) continue;
    const u = userSnap.data();

    const card = createFriendCard({
      uid: friendId,
      username: u.username,
      avatar: u.avatar,
      level: u.level,
      status: f.type === "sharing" ? "Delende vriend" : "Befriend!",
      existing: true
    });

    list.appendChild(card);
  }
}

/* ================= RANDOM USER PREVIEW ================= */
async function loadUserPreview(currentUid) {
  const list = document.getElementById("usersList");
  if (!list) return;
  list.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));
  const allUsers = snap.docs
    .filter(d => d.id !== currentUid && !friendsSet.has(d.id))
    .map(d => ({ uid: d.id, ...d.data() }));

  const previewUsers = allUsers.sort(() => 0.5 - Math.random()).slice(0, 5);

  previewUsers.forEach(u => {
    const card = createFriendCard({
      uid: u.uid,
      username: u.username,
      avatar: u.avatar,
      level: u.level,
      buttonText: "Word vrienden",
      onClick: async () => {
        await addDoc(collection(db, "friendRequests"), {
          from: currentUid,
          to: u.uid,
          type: "normal",
          status: "pending",
          createdAt: serverTimestamp()
        });
        const btn = card.querySelector("button");
        btn.textContent = "Verzoek verstuurd";
        btn.disabled = true;
      }
    });
    list.appendChild(card);
  });
}

/* ================= SEARCH ================= */
const searchInput = document.getElementById("searchInput");
if (searchInput) {
  searchInput.oninput = async (e) => {
    const user = auth.currentUser;
    if (!user) return;
    await loadUsers(user.uid, e.target.value);
  };
}

async function loadUsers(currentUid, filter = "") {
  const list = document.getElementById("usersList");
  if (!list) return;
  list.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));
  for (const docSnap of snap.docs) {
    if (docSnap.id === currentUid) continue;
    if (friendsSet.has(docSnap.id)) continue;

    const u = docSnap.data();
    if (!u.username?.toLowerCase().includes(filter.toLowerCase())) continue;

    const card = createFriendCard({
      uid: docSnap.id,
      username: u.username,
      avatar: u.avatar,
      level: u.level,
      buttonText: "Word vrienden",
      onClick: async () => {
        await addDoc(collection(db, "friendRequests"), {
          from: currentUid,
          to: docSnap.id,
          type: "normal",
          status: "pending",
          createdAt: serverTimestamp()
        });
        const btn = card.querySelector("button");
        btn.textContent = "Verzoek verstuurd";
        btn.disabled = true;
      }
    });

    list.appendChild(card);
  }
}
