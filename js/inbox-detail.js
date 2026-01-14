import { auth, db } from "./firebase-init.js";
import {
  doc, getDoc, updateDoc, addDoc, collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const container = document.getElementById("detailContainer");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    container.innerHTML = "<p>Geen bericht-id.</p>";
    return;
  }

  const ref = doc(db, "users", user.uid, "inbox", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    container.innerHTML = "<p>Bericht niet gevonden.</p>";
    return;
  }

  const item = { id, ...snap.data() };

  // mark read bij openen
  if (item.read === false) {
    await updateDoc(ref, { read: true, readAt: serverTimestamp() });
    item.read = true;
  }

  const from = await getUser(item.from);
  renderDetail(user.uid, item, from);
});

async function getUser(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return { username: "Onbekend", avatar: "images/avatar/default.png", level: 1 };
  const u = snap.data();
  return { username: u.username || "Onbekend", avatar: u.avatar || "images/avatar/default.png", level: u.level || 1 };
}

function prescribedMessage(fromUsername, item) {
  if (item.type === "friendRequest") {
    return `${fromUsername} wil graag vrienden worden op Cherrie’s.`;
  }
  if (item.type === "sharingRequest") {
    return `${fromUsername} wil graag een delende vriend worden (materialen lenen/uitlenen).`;
  }
  if (item.type === "materialRequest") {
    const mats = Array.isArray(item.materials) && item.materials.length
      ? item.materials.join(", ")
      : "materialen";
    return `${fromUsername} vraagt of hij/zij deze materialen kan lenen: ${mats}.`;
  }
  if (item.type === "message") {
    return item.note || `${fromUsername} heeft een bericht gestuurd.`;
  }
  return item.note || "Nieuw bericht.";
}

function needsDecision(type) {
  return type === "friendRequest" || type === "sharingRequest" || type === "materialRequest";
}

function renderDetail(currentUid, item, from) {
  const msg = prescribedMessage(from.username, item);

  container.innerHTML = `
    <div class="friend-bar existing">
      <div class="friend-avatar">
        <img src="${from.avatar}" alt="avatar">
        <img class="level-icon" src="images/icons/niveau_${from.level || 1}.png" alt="niveau">
      </div>
      <div class="friend-info">
        <div class="friend-top">
          <div class="friend-username">${from.username}</div>
        </div>
        <div class="friend-actions">
          <div class="friend-status">${item.type}</div>
        </div>
      </div>
    </div>

    <div class="classic-outline" style="background: var(--ipvwit);">
      <p style="margin:0;">${msg}</p>

      ${needsDecision(item.type) ? `
        <div class="d-flex gap-2 mt-3">
          <button id="btnAccept" class="btn-hoofd-1" style="flex:1;">Accepteren</button>
          <button id="btnReject" class="btn-licht-5" style="flex:1;">Weigeren</button>
        </div>
      ` : ""}

      ${item.type === "materialRequest" ? `
        <div class="mt-2 text-center">
          <button id="btnOther" class="btn-licht-5">Ander antwoord</button>
        </div>
      ` : ""}
    </div>
  `;

  const btnAccept = document.getElementById("btnAccept");
  const btnReject = document.getElementById("btnReject");
  const btnOther = document.getElementById("btnOther");

  btnAccept?.addEventListener("click", async () => {
    await handleAccept(currentUid, item);
    history.back();
  });

  btnReject?.addEventListener("click", async () => {
    await handleReject(currentUid, item);
    history.back();
  });

  btnOther?.addEventListener("click", async () => {
    await handleOther(currentUid, item, from.username);
    history.back();
  });
}

async function archive(currentUid, item, handledAs) {
  await updateDoc(doc(db, "users", currentUid, "inbox", item.id), {
    archived: true,
    handled: true,
    handledAs,
    handledAt: serverTimestamp()
  });
}

async function handleAccept(currentUid, item) {
  if (item.type === "friendRequest" || item.type === "sharingRequest") {
    await addDoc(collection(db, "friendships"), {
      users: [item.from, currentUid],
      type: item.type === "sharingRequest" ? "sharing" : "normal",
      createdAt: serverTimestamp()
    });

    if (item.friendRequestId) {
      await updateDoc(doc(db, "friendRequests", item.friendRequestId), {
        status: "accepted",
        handledAt: serverTimestamp()
      });
    }
  }

  if (item.type === "materialRequest") {
    await addDoc(collection(db, "users", item.from, "inbox"), {
      type: "message",
      from: currentUid,
      createdAt: serverTimestamp(),
      read: false,
      archived: false,
      note: "Ja is goed! Je kunt het lenen 🙂"
    });
  }

  await archive(currentUid, item, "accepted");
}

async function handleReject(currentUid, item) {
  if (item.friendRequestId) {
    await updateDoc(doc(db, "friendRequests", item.friendRequestId), {
      status: "rejected",
      handledAt: serverTimestamp()
    });
  }

  // optioneel terugbericht
  await addDoc(collection(db, "users", item.from, "inbox"), {
    type: "message",
    from: currentUid,
    createdAt: serverTimestamp(),
    read: false,
    archived: false,
    note: "Nee sorry, dat gaat nu niet."
  });

  await archive(currentUid, item, "rejected");
}

async function handleOther(currentUid, item, fromUsername) {
  const text = window.prompt(`Stuur een bericht aan ${fromUsername}:`, "Kan volgende week wel!");
  if (!text) return;

  await addDoc(collection(db, "users", item.from, "inbox"), {
    type: "message",
    from: currentUid,
    createdAt: serverTimestamp(),
    read: false,
    archived: false,
    note: text
  });

  await archive(currentUid, item, "other");
}
