import { auth, db } from "./firebase-init.js";
import {
  collection, query, where, getDocs, getDoc,
  addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadFriends();
  loadFriendRequests();
});

/* ================= USERNAME ================= */
async function getUsername(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().username : "Onbekend";
}

/* ================= FRIENDS ================= */
async function loadFriends() {
  const list = document.getElementById("friendsList");
  list.innerHTML = "";

  const q = query(
    collection(db, "friendships"),
    where("users", "array-contains", auth.currentUser.uid)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    list.innerHTML = "<p>Geen vrienden</p>";
    return;
  }

  for (const d of snap.docs) {
    const f = d.data();
    const friendId = f.users.find(id => id !== auth.currentUser.uid);
    const username = await getUsername(friendId);

    const div = document.createElement("div");
    div.className = "friend-card";
    div.innerHTML = `
      <strong>${username}</strong><br>
      <small>${f.type === "sharing" ? "🤝 Delende vriend" : "👤 Vriend"}</small>
    `;
    list.appendChild(div);
  }
}

/* ================= INBOX ================= */
async function loadFriendRequests() {
  const inbox = document.getElementById("friendRequests");
  inbox.innerHTML = "";

  const q = query(
    collection(db, "friendRequests"),
    where("to", "==", auth.currentUser.uid),
    where("status", "==", "pending")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    inbox.innerHTML = "<p>Geen verzoeken</p>";
    return;
  }

  for (const d of snap.docs) {
    const req = d.data();
    const username = await getUsername(req.from);

    const div = document.createElement("div");
    div.className = "friend-card";
    div.innerHTML = `
      <strong>${username}</strong>
      <p>${req.message}</p>
      <button class="accept">Accepteren</button>
      <button class="reject">Weigeren</button>
    `;

    div.querySelector(".accept").onclick = () =>
      acceptRequest(d.id, req);

    div.querySelector(".reject").onclick = () =>
      rejectRequest(d.id);

    inbox.appendChild(div);
  }
}

async function acceptRequest(id, req) {
  await addDoc(collection(db, "friendships"), {
    users: [req.from, req.to],
    type: req.type,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "friendRequests", id), {
    status: "accepted"
  });

  loadFriends();
  loadFriendRequests();
}

async function rejectRequest(id) {
  await updateDoc(doc(db, "friendRequests", id), {
    status: "rejected"
  });
  loadFriendRequests();
}
