import { auth, db } from "./firebase-init.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const profileUid = params.get("uid");

const friendBtn = document.getElementById("friendBtn");
const messageIconBtn = document.getElementById("messageIconBtn");

let meUid = null;

async function areWeFriends(myUid, otherUid) {
  const meSnap = await getDoc(doc(db, "users", myUid));
  const friends = meSnap.exists() ? (meSnap.data().friends || []) : [];
  return friends.includes(otherUid);
}

async function pendingRequestExists(fromUid, toUid) {
  const reqId = `${fromUid}_${toUid}`;
  const reqSnap = await getDoc(doc(db, "friendRequests", reqId));
  return reqSnap.exists() && reqSnap.data()?.status === "pending";
}

async function refreshFriendButton() {
  if (!meUid || !profileUid) return;

  if (meUid === profileUid) {
    friendBtn.style.display = "none";
    messageIconBtn.style.display = "none";
    return;
  }

  // message icoon altijd zichtbaar bij andermans profiel
  messageIconBtn.style.display = "inline-flex";

  const friends = await areWeFriends(meUid, profileUid);
  if (friends) {
    friendBtn.textContent = "Bevriend";
    friendBtn.disabled = true;
    return;
  }

  const pending = await pendingRequestExists(meUid, profileUid);
  if (pending) {
    friendBtn.textContent = "Verzoek verzonden";
    friendBtn.disabled = true;
    return;
  }

  friendBtn.textContent = "Wordt vrienden";
  friendBtn.disabled = false;
}

async function sendFriendRequest() {
  const reqId = `${meUid}_${profileUid}`;
  await setDoc(doc(db, "friendRequests", reqId), {
    fromUid: meUid,
    toUid: profileUid,
    status: "pending",
    createdAt: serverTimestamp(),
  }, { merge: true });

  await refreshFriendButton();
  alert("Vriendschapsverzoek verzonden!");
}

async function isSharingFriend(myUid, otherUid) {
  // PAS AAN naar jouw sharing-structuur.
  // Optie: users/{uid}.sharingFriends[] array
  const meSnap = await getDoc(doc(db, "users", myUid));
  const sharing = meSnap.exists() ? (meSnap.data().sharingFriends || []) : [];
  return sharing.includes(otherUid);
}

async function refreshButtons() {
  if (meUid === profileUid) {
    messageIconBtn.style.display = "none";
    askMaterialsBtn.style.display = "none";
    return;
  }

  const friends = await areWeFriends(meUid, profileUid);
  messageIconBtn.style.display = friends ? "inline-flex" : "none";

  const sharing = await isSharingFriend(meUid, profileUid);
  askMaterialsBtn.style.display = sharing ? "inline-block" : "none";
}


onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  meUid = user.uid;
  await refreshFriendButton();
});

friendBtn?.addEventListener("click", async () => {
  if (!meUid || !profileUid) return;
  await sendFriendRequest();
});

messageIconBtn?.addEventListener("click", () => {
  if (!profileUid) return;
  // naar losse pagina
  window.location.href = `message.html?to=${encodeURIComponent(profileUid)}`;
});
