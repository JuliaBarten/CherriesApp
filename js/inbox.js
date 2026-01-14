import { auth, db } from "./firebase-init.js";
import {
  collection, query, where, orderBy, getDocs, getDoc, doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const tabAll = document.getElementById("tabAll");
const tabUnread = document.getElementById("tabUnread");
const listAll = document.getElementById("listAll");
const listUnread = document.getElementById("listUnread");
const inboxBadge = document.getElementById("inboxBadge");

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  setupTabs();
  loadInbox();
});

function setupTabs() {
  tabAll?.addEventListener("click", () => {
    tabAll.classList.add("active");
    tabUnread.classList.remove("active");
    listAll.style.display = "block";
    listUnread.style.display = "none";
  });

  tabUnread?.addEventListener("click", () => {
    tabUnread.classList.add("active");
    tabAll.classList.remove("active");
    listAll.style.display = "none";
    listUnread.style.display = "block";
  });
}

async function getUser(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return { username: "Onbekend", avatar: "images/avatar/default.png", level: 1 };
  const u = snap.data();
  return {
    username: u.username || "Onbekend",
    avatar: u.avatar || "images/avatar/default.png",
    level: u.level || 1
  };
}

function typeLabel(t) {
  if (t === "friendRequest") return "Vriendschapsverzoek";
  if (t === "sharingRequest") return "Aanvraag: delende vriend";
  if (t === "materialRequest") return "Materiaalaanvraag";
  if (t === "message") return "Bericht";
  return "Bericht";
}

function setBadge(count) {
  if (!inboxBadge) return;
  if (count > 0) {
    inboxBadge.textContent = count;
    inboxBadge.classList.remove("hidden");
  } else {
    inboxBadge.textContent = "";
    inboxBadge.classList.add("hidden");
  }
}

async function loadInbox() {
  listAll.innerHTML = "";
  listUnread.innerHTML = "";

  const uid = auth.currentUser.uid;

  const allQ = query(
    collection(db, "users", uid, "inbox"),
    where("archived", "==", false),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(allQ);

  let unreadCount = 0;

  for (const d of snap.docs) {
    const item = { id: d.id, ...d.data() };
    if (item.read === false) unreadCount++;

    const bar = await renderBar(item);
    listAll.appendChild(bar);

    if (item.read === false) {
      const bar2 = await renderBar(item);
      listUnread.appendChild(bar2);
    }
  }

  setBadge(unreadCount);
}

async function renderBar(item) {
  const from = await getUser(item.from);

  const div = document.createElement("div");
  div.className = "friend-bar inbox-bar";

  div.innerHTML = `
    ${item.read === false ? `<div class="inbox-new-pill">NEW!</div>` : ""}

    <div class="friend-avatar">
      <img src="${from.avatar}" alt="avatar">
      <img class="level-icon" src="images/icons/niveau_${from.level || 1}.png" alt="niveau">
    </div>

    <div class="friend-info">
      <div class="friend-top">
        <div class="friend-username">${from.username}</div>
      </div>
      <div class="friend-actions">
        <div class="friend-status">${typeLabel(item.type)}</div>
      </div>
    </div>
  `;

  div.addEventListener("click", () => {
    window.location.href = `inbox-detail.html?id=${encodeURIComponent(item.id)}`;
  });

  return div;
}
