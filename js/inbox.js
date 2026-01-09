import { auth, db } from "./firebase-init.js";
import { collection, query, where, getDocs, getDoc, updateDoc, addDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadInbox();
});

/* ================= USERNAME ================= */
async function getUsername(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().username : "Onbekend";
}

/* ================= INBOX ================= */
async function loadInbox() {
  clearInboxes();

  const q = query(
    collection(db, "friendRequests"),
    where("to", "==", auth.currentUser.uid)
  );

  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const req = d.data();
    const fromName = await getUsername(req.from);

    const card = document.createElement("div");
    card.className = "friend-card";
    card.innerHTML = `
      <strong>${fromName}</strong>
      <p>${req.message}</p>
      ${req.status === "unread" || req.status === "pending"
        ? `<button class="accept">Accepteren</button>
           <button class="reject">Weigeren</button>`
        : ""}
    `;

    if (req.status === "unread") {
      card.onclick = () =>
        updateDoc(doc(db, "friendRequests", d.id), {
          status: "pending"
        });
    }

    if (req.status === "unread") {
      inboxUnread.appendChild(card);
    } else if (req.status === "pending") {
      inboxPending.appendChild(card);
    } else {
      inboxHandled.appendChild(card);
    }

    const acceptBtn = card.querySelector(".accept");
    const rejectBtn = card.querySelector(".reject");

    if (acceptBtn) {
      acceptBtn.onclick = () =>
        acceptRequest(d.id, req);
    }

    if (rejectBtn) {
      rejectBtn.onclick = () =>
        rejectRequest(d.id);
    }
  }
}

function clearInboxes() {
  inboxUnread.innerHTML = "";
  inboxPending.innerHTML = "";
  inboxHandled.innerHTML = "";
}

/* ================= ACTIONS ================= */
async function acceptRequest(id, req) {
  await addDoc(collection(db, "friendships"), {
    users: [req.from, req.to],
    type: req.type,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "friendRequests", id), {
    status: "accepted"
  });

  loadInbox();
}

async function rejectRequest(id) {
  await updateDoc(doc(db, "friendRequests", id), {
    status: "rejected"
  });
  loadInbox();
}
