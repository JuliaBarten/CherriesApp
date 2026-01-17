export const PREMADE_AVATARS = [
  "images/avatar/premade/pm_2.png",
  "images/avatar/premade/pm_3.png",
  "images/avatar/premade/pm_5.png",
  "images/avatar/premade/pm_1.png",
  "images/avatar/premade/pm_6.png",
  "images/avatar/premade/pm_7.png",
  "images/avatar/premade/pm_4.png",
];

export function getRandomAvatar() {
  const index = Math.floor(Math.random() * PREMADE_AVATARS.length);
  return PREMADE_AVATARS[index];
}

export function renderAvatarPicker(container, onSelect) {
  let selected = null;
  container.innerHTML = "";

  PREMADE_AVATARS.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.classList.add("avatar-option");

    img.addEventListener("click", () => {
      container.querySelectorAll("img")
        .forEach(i => i.classList.remove("selected"));

      img.classList.add("selected");
      selected = src;
      onSelect(src);
    });

    container.appendChild(img);
  });

  return () => selected;
}
