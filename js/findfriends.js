import { auth, db } from "./firebase-init.js";
import { collection, getDocs, query, where, addDoc, doc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ================= HELPERS ================= */
function createFriendCard({ uid, username, avatar, level, status, buttonText, onClick, existing }) {
  const div = document.createElement("div");
  div.className = "friend-bar";
  if (existing) div.classList.add("existing");

  const badgeHtml = status
    ? `<span class="friend-badge ${status === "Delende vriend" ? "sharing" : "befriend"}">${status}</span>`
    : "";

  div.innerHTML = `
    <div class="friend-avatar" role="button" tabindex="0">
      <img src="${avatar || "images/avatar/default.png"}" alt="avatar">
      <img class="level-icon" src="images/icons/niveau_${level || 1}.png" alt="niveau">
    </div>

    <div class="friend-info">
      <div class="friend-top">
        <div class="friend-username">${username || "Onbekend"}</div>
        ${existing ? badgeHtml : ""}
      </div>

      <div class="friend-actions">
        ${!existing && buttonText
      ? `<button type="button" class="friend-btn btn-licht-5">${buttonText}</button>`
      : ""
    }
      </div>
    </div>
  `;

  const goToProfile = () => {
    window.location.href = `profile.html?uid=${uid}`;
  };

  div.querySelector(".friend-avatar")?.addEventListener("click", goToProfile);
  div.querySelector(".friend-username")?.addEventListener("click", goToProfile);

  const btn = div.querySelector(".friend-btn");
  if (btn && onClick) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(btn);
    });
  }

  return div;
}

/* ================= STATE ================= */
let friendsSet = new Set();

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  await loadFriends(user.uid);
  await loadUserPreview(user.uid);

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", async (e) => {
      const value = e.target.value.trim();
      if (!value) {
        // leeg → weer random preview
        await loadUserPreview(user.uid);
      } else {
        await loadUsers(user.uid, value);
      }
    });
  }
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
      status: f.type === "sharing" ? "Delende vriend" : "Bevriend",
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
  .map(d => ({ ...d.data(), uid: d.id }));
  const previewUsers = allUsers.sort(() => 0.5 - Math.random()).slice(0, 5);

  if (!previewUsers.length) {
    list.innerHTML = "<p>Geen gebruikers gevonden.</p>";
    return;
  }

  previewUsers.forEach(u => {
    const card = createFriendCard({
      uid: u.uid,
      username: u.username,
      avatar: u.avatar,
      level: u.level,
      buttonText: "Word vrienden",
      onClick: async (btnEl) => {
        try {
          console.log("SEND REQ TO:", u.uid, "from:", currentUid, "user obj:", u);

          await sendRequest(currentUid, u.uid);
          btnEl.textContent = "Verzoek verstuurd";
          btnEl.disabled = true;
        } catch (e) {
          console.error("sendRequest failed", e);
          alert(e.message);
        }
      }

    });

    list.appendChild(card);
  });
}

/* ================= SEARCH USERS ================= */
async function loadUsers(currentUid, filter = "") {
  const list = document.getElementById("usersList");
  if (!list) return;

  list.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));

  let found = 0;

  for (const docSnap of snap.docs) {
    if (docSnap.id === currentUid) continue;
    if (friendsSet.has(docSnap.id)) continue;

    const u = docSnap.data();
    if (!u.username?.toLowerCase().includes(filter.toLowerCase())) continue;

    found++;

    const card = createFriendCard({
      uid: docSnap.id,
      username: u.username,
      avatar: u.avatar,
      level: u.level,
      buttonText: "Word vrienden",
      onClick: async (btnEl) => {
        btnEl.disabled = true;
        const oldText = btnEl.textContent;
        btnEl.textContent = "Even…";

        try {
          await sendRequest(currentUid, u.uid);
          btnEl.textContent = "Verzoek verstuurd";
        } catch (e) {
          console.error("sendRequest failed:", e);
          alert(e.message);
          btnEl.disabled = false;
          btnEl.textContent = oldText;
        }
      }
    });

    list.appendChild(card);
  }

  if (!found) {
    list.innerHTML = "<p>Geen resultaten.</p>";
  }
}

/* ================= SEND REQUEST ================= */
async function sendRequest(fromUid, toUid) {
  if (!fromUid || !toUid) {
    console.error("sendRequest called with invalid uids:", { fromUid, toUid });
    alert("Er ging iets mis: ontvanger onbekend. Probeer opnieuw.");
    return;
  }
  
  try {
    const reqRef = await addDoc(collection(db, "friendRequests"), {
      from: fromUid,
      to: toUid,
      type: "normal",
      status: "pending",
      createdAt: serverTimestamp()
    });

    await addDoc(collection(db, "users", toUid, "inbox"), {
      type: "friendRequest",
      from: fromUid,
      friendType: "normal",
      friendRequestId: reqRef.id,
      createdAt: serverTimestamp(),
      read: false,
      archived: false
    });
  } catch (e) {
    console.error("sendRequest error:", e);
    throw e;
  }
}

