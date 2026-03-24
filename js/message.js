import { auth, db } from "./firebase-init.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const toUid = params.get("to");

const btnAskMaterials = document.getElementById("btnAskMaterials");
const btnOpenMessage = document.getElementById("btnOpenMessage");
const messageText = document.getElementById("messageText");
const btnSend = document.getElementById("btnSend");

let fromUid = null;
let chosenType = null;

function choose(type) {
  chosenType = type;
  if (type === "ask_materials") {
    messageText.value = "Hoi! Zou ik misschien materialen van je mogen lenen? 😊";
  } else {
    messageText.value = "";
  }
  messageText.focus();
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  fromUid = user.uid;
});

btnAskMaterials?.addEventListener("click", () => choose("ask_materials"));
btnOpenMessage?.addEventListener("click", () => choose("open_message"));

btnSend?.addEventListener("click", async () => {
  if (!fromUid) return alert("Je bent niet ingelogd.");
  if (!toUid) return alert("Geen ontvanger gevonden.");
  if (!chosenType) return alert("Kies eerst een optie (materialen / open bericht).");

  const text = (messageText.value || "").trim();
  if (!text) return alert("Typ een bericht.");

  await addDoc(collection(db, "inboxMessages"), {
    fromUid,
    toUid,
    type: chosenType,
    text,
    read: false,
    createdAt: serverTimestamp(),
  });

  alert("Bericht verstuurd!");
  // eventueel terug naar profiel:
  history.back();
});
