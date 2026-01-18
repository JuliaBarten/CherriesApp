import { auth, db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  serverTimestamp,
  getDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ================= HELPERS ================= */
function createFriendCard({ uid, username, avatar, level, status, buttonText, onClick, existing }) {
  const div = document.createElement("div");
  div.className = "item-bar";
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
  try {
    if (!fromUid || !toUid) throw new Error("fromUid/toUid ontbreekt");
    if (fromUid === toUid) throw new Error("Je kan jezelf niet toevoegen");

    // check: bestaat ontvanger?
    const toUserSnap = await getDoc(doc(db, "users", toUid));
    if (!toUserSnap.exists()) throw new Error("Ontvanger bestaat niet (users/{uid} ontbreekt)");

    // voorkom dubbele requests (optioneel maar handig):
    // kijkt of er al een pending request is van from->to
    const existingQ = query(
      collection(db, "friendRequests"),
      where("from", "==", fromUid),
      where("to", "==", toUid),
      where("status", "==", "pending")
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      console.log("Er bestaat al een pending verzoek.");
      return;
    }

    // maak IDs vooraf zodat we batch kunnen gebruiken
    const reqRef = doc(collection(db, "friendRequests"));
    const inboxRef = doc(collection(db, "users", toUid, "inbox"));

    const batch = writeBatch(db);

    batch.set(reqRef, {
      from: fromUid,
      to: toUid,
      type: "normal",
      status: "pending",
      createdAt: serverTimestamp()
    });

    batch.set(inboxRef, {
      type: "friendRequest",
      from: fromUid,
      friendType: "normal",
      friendRequestId: reqRef.id,
      createdAt: serverTimestamp(),
      read: false,
      archived: false
    });

    await batch.commit();

    console.log("sendRequest OK:", reqRef.id);
  } catch (e) {
    console.error("sendRequest error:", {
      code: e?.code,
      message: e?.message,
      full: e
    });
    throw e;
  }
}


