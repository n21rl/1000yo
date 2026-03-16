import { Character } from "./game.js";

const character = new Character();

const elements = {
  nameInput: document.querySelector("#name"),
  memoryForm: document.querySelector("#memory-form"),
  memoryTitle: document.querySelector("#memory-title"),
  memoryExperience: document.querySelector("#memory-experience"),
  memoryList: document.querySelector("#memory-list"),
  memoriesStatus: document.querySelector("#memories-status"),
  skillForm: document.querySelector("#skill-form"),
  skillInput: document.querySelector("#skill-input"),
  skillList: document.querySelector("#skill-list"),
  skillsStatus: document.querySelector("#skills-status"),
  resourceForm: document.querySelector("#resource-form"),
  resourceInput: document.querySelector("#resource-input"),
  resourceList: document.querySelector("#resource-list"),
  resourcesStatus: document.querySelector("#resources-status"),
  characterForm: document.querySelector("#character-form"),
  characterName: document.querySelector("#character-name"),
  characterDescription: document.querySelector("#character-description"),
  characterType: document.querySelector("#character-type"),
  characterList: document.querySelector("#character-list"),
  charactersStatus: document.querySelector("#characters-status"),
  markForm: document.querySelector("#mark-form"),
  markInput: document.querySelector("#mark-input"),
  markList: document.querySelector("#mark-list"),
  marksStatus: document.querySelector("#marks-status"),
  promptHint: document.querySelector("#prompt-hint"),
};

const bindRemove = (button, handler) => {
  button.addEventListener("click", handler);
  return button;
};

const renderMemories = () => {
  elements.memoryList.innerHTML = "";

  for (const [index, memory] of character.memories.entries()) {
    const item = document.createElement("li");
    item.className = "record";

    const body = document.createElement("div");
    body.className = "record-body";

    const title = document.createElement("strong");
    title.textContent = memory.title;

    const experiences = document.createElement("p");
    experiences.textContent = memory.experiences.join(" ");

    body.append(title, experiences);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost-button";
    removeButton.textContent = "Remove";
    bindRemove(removeButton, () => {
      character.removeMemory(index);
      render();
    });

    item.append(body, removeButton);
    elements.memoryList.append(item);
  }
};

const renderStringList = (listElement, items, removeItem) => {
  listElement.innerHTML = "";

  for (const [index, itemText] of items.entries()) {
    const item = document.createElement("li");
    item.className = "record";

    const body = document.createElement("div");
    body.className = "record-body";

    const text = document.createElement("p");
    text.textContent = itemText;

    body.append(text);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost-button";
    removeButton.textContent = "Remove";
    bindRemove(removeButton, () => {
      removeItem(index);
      render();
    });

    item.append(body, removeButton);
    listElement.append(item);
  }
};

const renderCharacters = () => {
  elements.characterList.innerHTML = "";

  for (const [index, entry] of character.characters.entries()) {
    const item = document.createElement("li");
    item.className = "record";

    const body = document.createElement("div");
    body.className = "record-body";

    const heading = document.createElement("strong");
    heading.textContent = `${entry.name} (${entry.type})`;

    const description = document.createElement("p");
    description.textContent = entry.description;

    body.append(heading, description);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost-button";
    removeButton.textContent = "Remove";
    bindRemove(removeButton, () => {
      character.removeCharacter(index);
      render();
    });

    item.append(body, removeButton);
    elements.characterList.append(item);
  }
};

const setSectionStatus = (element, isReady, label) => {
  element.textContent = isReady ? "✓" : label;
  element.className = isReady ? "section-status complete" : "section-status";
};

const renderSectionStatus = () => {
  setSectionStatus(
    elements.memoriesStatus,
    character.memories.length >= 5,
    `${character.memories.length}/5`,
  );
  setSectionStatus(elements.skillsStatus, character.skills.length >= 3, `${character.skills.length}/3`);
  setSectionStatus(
    elements.resourcesStatus,
    character.resources.length >= 3,
    `${character.resources.length}/3`,
  );
  setSectionStatus(
    elements.charactersStatus,
    character.mortalCount >= 3 && character.immortalCount >= 1,
    `${character.mortalCount}M ${character.immortalCount}I`,
  );
  setSectionStatus(elements.marksStatus, character.marks.length >= 1, `${character.marks.length}/1`);

  const ready = character.isReadyForPromptOne();
  elements.promptHint.textContent = ready
    ? "Setup complete. You are ready to begin Prompt 1."
    : "Add the remaining setup pieces, then begin Prompt 1.";
  elements.promptHint.className = ready ? "supporting hero-status ready" : "supporting hero-status";
};

const render = () => {
  elements.nameInput.value = character.name;
  renderMemories();
  renderStringList(elements.skillList, character.skills, (index) => character.removeSkill(index));
  renderStringList(elements.resourceList, character.resources, (index) =>
    character.removeResource(index),
  );
  renderCharacters();
  renderStringList(elements.markList, character.marks, (index) => character.removeMark(index));
  renderSectionStatus();
};

elements.nameInput.addEventListener("change", () => {
  character.rename(elements.nameInput.value);
  render();
});

elements.memoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const added = character.addMemory(elements.memoryTitle.value, elements.memoryExperience.value);

  if (!added) return;

  elements.memoryForm.reset();
  render();
});

elements.skillForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const added = character.addSkill(elements.skillInput.value);

  if (!added) return;

  elements.skillForm.reset();
  render();
});

elements.resourceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const added = character.addResource(elements.resourceInput.value);

  if (!added) return;

  elements.resourceForm.reset();
  render();
});

elements.characterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const added = character.addCharacter(
    elements.characterName.value,
    elements.characterDescription.value,
    elements.characterType.value,
  );

  if (!added) return;

  elements.characterForm.reset();
  elements.characterType.value = "mortal";
  render();
});

elements.markForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const added = character.addMark(elements.markInput.value);

  if (!added) return;

  elements.markForm.reset();
  render();
});

render();
