import { auth, db } from "./firebase-init.js";
import {
  collection, getDocs, query, where,
  addDoc, getDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let friends = new Set();

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  await loadFriends();
  loadUsers();
});

/* ================= FRIEND IDS ================= */
async function loadFriends() {
  const q = query(
    collection(db, "friendships"),
    where("users", "array-contains", auth.currentUser.uid)
  );
  const snap = await getDocs(q);
  snap.forEach(d => {
    d.data().users.forEach(id => {
      if (id !== auth.currentUser.uid) friends.add(id);
    });
  });
}

/* ================= USERS + SEARCH ================= */
async function loadUsers(filter = "") {
  const list = document.getElementById("usersList");
  list.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));

  snap.forEach(docSnap => {
    if (docSnap.id === auth.currentUser.uid) return;
    if (friends.has(docSnap.id)) return;

    const u = docSnap.data();
    if (!u.username?.toLowerCase().includes(filter)) return;

    const div = document.createElement("div");
    div.className = "friend-card";
    div.innerHTML = `
      <strong>${u.username}</strong><br>
      <button data-type="normal">Vriend</button>
      <button data-type="sharing">Delend</button>
    `;

    div.querySelectorAll("button").forEach(btn => {
      btn.onclick = () =>
        sendRequest(docSnap.id, u.username, btn.dataset.type);
    });

    list.appendChild(div);
  });
}

/* ================= SEARCH ================= */
document.getElementById("searchInput").oninput = (e) => {
  loadUsers(e.target.value.toLowerCase());
};

/* ================= SEND ================= */
async function sendRequest(toId, username, type) {
  const message =
    type === "sharing"
      ? `Hey ${username}, wil je mijn delende vriend worden zodat we materialen kunnen lenen?`
      : `Hey ${username}, wil je mijn vriend worden?`;

  await addDoc(collection(db, "friendRequests"), {
    from: auth.currentUser.uid,
    to: toId,
    type,
    message,
    status: "pending",
    createdAt: serverTimestamp()
  });

  alert("Verzoek verzonden!");
}
