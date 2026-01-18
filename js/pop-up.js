
window.showPopup = function({ imageSrc, text, buttonText, buttonAction }) {
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  const block = document.createElement("div");
  block.className = "popup-block";

  const img = document.createElement("img");
  img.src = imageSrc;
  block.appendChild(img);

  const p = document.createElement("p");
  p.textContent = text;
  block.appendChild(p);

  const btn = document.createElement("button");
  btn.textContent = buttonText;
  btn.addEventListener("click", () => {
    overlay.remove();
    if (typeof buttonAction === "function") buttonAction();
  });
  block.appendChild(btn);

  overlay.appendChild(block);
  document.body.appendChild(overlay);
};
