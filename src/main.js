import { Character } from "./game.js";

const character = new Character();

const elements = {
  nameInput: document.querySelector("#name"),
  setupStatus: document.querySelector("#setup-status"),
  readinessDetail: document.querySelector("#readiness-detail"),
  memoryForm: document.querySelector("#memory-form"),
  memoryTitle: document.querySelector("#memory-title"),
  memoryExperience: document.querySelector("#memory-experience"),
  memoryList: document.querySelector("#memory-list"),
  skillForm: document.querySelector("#skill-form"),
  skillInput: document.querySelector("#skill-input"),
  skillList: document.querySelector("#skill-list"),
  resourceForm: document.querySelector("#resource-form"),
  resourceInput: document.querySelector("#resource-input"),
  resourceList: document.querySelector("#resource-list"),
  characterForm: document.querySelector("#character-form"),
  characterName: document.querySelector("#character-name"),
  characterDescription: document.querySelector("#character-description"),
  characterType: document.querySelector("#character-type"),
  characterList: document.querySelector("#character-list"),
  markForm: document.querySelector("#mark-form"),
  markInput: document.querySelector("#mark-input"),
  markList: document.querySelector("#mark-list"),
  summaryName: document.querySelector("#summary-name"),
  summaryCounts: document.querySelector("#summary-counts"),
  promptHint: document.querySelector("#prompt-hint"),
};

const formatRequirement = ({ label, count, minimum, met }) =>
  `${met ? "Complete" : "Needed"}: ${label} ${count}/${minimum}`;

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

const renderReadiness = () => {
  const requirements = character.getSetupRequirements();
  elements.readinessDetail.innerHTML = "";

  for (const requirement of requirements) {
    const item = document.createElement("li");
    item.className = requirement.met ? "check complete" : "check";
    item.textContent = formatRequirement(requirement);
    elements.readinessDetail.append(item);
  }

  const ready = character.isReadyForPromptOne();
  elements.setupStatus.textContent = ready
    ? "Setup complete. You are ready to begin Prompt 1."
    : "Build the vampire's prelude until every requirement is complete.";
  elements.setupStatus.className = ready ? "status ready" : "status";
  elements.promptHint.textContent = ready
    ? "Prompt 1 starts once you begin answering the prompt deck."
    : "Prompt 1 stays locked until the starting vampire is fully built.";
};

const renderSummary = () => {
  elements.summaryName.textContent = character.name;
  elements.summaryCounts.textContent =
    `${character.memories.length} memories, ` +
    `${character.skills.length} skills, ` +
    `${character.resources.length} resources, ` +
    `${character.mortalCount} mortals, ` +
    `${character.immortalCount} immortals, ` +
    `${character.marks.length} marks`;
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
  renderReadiness();
  renderSummary();
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
