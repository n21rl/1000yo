import { Character } from "./game.js";

const character = new Character();

const nameInput = document.querySelector("#name");
const memoryInput = document.querySelector("#memory");
const addMemoryButton = document.querySelector("#add-memory");
const title = document.querySelector("#character-title");
const memoryList = document.querySelector("#memory-list");

const render = () => {
  title.textContent = `${character.name}'s Memories`;
  memoryList.innerHTML = "";

  for (const memory of character.memories) {
    const item = document.createElement("li");
    item.textContent = memory.text;
    memoryList.append(item);
  }
};

nameInput.addEventListener("change", () => {
  character.rename(nameInput.value);
  nameInput.value = character.name;
  render();
});

addMemoryButton.addEventListener("click", () => {
  const added = character.addMemory(memoryInput.value);
  if (added) {
    memoryInput.value = "";
    render();
  }
});

render();
