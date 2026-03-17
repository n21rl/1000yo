import { Character } from "./game.js";

const character = new Character();
let currentStep = 0;

const elements = {
  nameInput: document.querySelector("#name"),
  promptHint: document.querySelector("#prompt-hint"),
  stepTitle: document.querySelector("#step-title"),
  stepProgress: document.querySelector("#step-progress"),
  stepList: document.querySelector("#step-list"),
  stepPanels: [...document.querySelectorAll("[data-step-panel]")],
  backButton: document.querySelector("#back-button"),
  nextButton: document.querySelector("#next-button"),

  memoryFormIdentity: document.querySelector("#memory-form-identity"),
  memoryTitleIdentity: document.querySelector("#memory-title-identity"),
  memoryExperienceIdentity: document.querySelector("#memory-experience-identity"),
  identityMemoryList: document.querySelector("#identity-memory-list"),

  mortalForm: document.querySelector("#mortal-form"),
  mortalName: document.querySelector("#mortal-name"),
  mortalDescription: document.querySelector("#mortal-description"),
  mortalList: document.querySelector("#mortal-list"),

  skillForm: document.querySelector("#skill-form"),
  skillInput: document.querySelector("#skill-input"),
  skillList: document.querySelector("#skill-list"),

  resourceForm: document.querySelector("#resource-form"),
  resourceInput: document.querySelector("#resource-input"),
  resourceList: document.querySelector("#resource-list"),

  memoryFormLater: document.querySelector("#memory-form-later"),
  memoryTitleLater: document.querySelector("#memory-title-later"),
  memoryExperienceLater: document.querySelector("#memory-experience-later"),
  laterMemoryList: document.querySelector("#later-memory-list"),

  immortalForm: document.querySelector("#immortal-form"),
  immortalName: document.querySelector("#immortal-name"),
  immortalDescription: document.querySelector("#immortal-description"),
  immortalList: document.querySelector("#immortal-list"),

  markForm: document.querySelector("#mark-form"),
  markInput: document.querySelector("#mark-input"),
  markList: document.querySelector("#mark-list"),

  memoryFormCurse: document.querySelector("#memory-form-curse"),
  memoryTitleCurse: document.querySelector("#memory-title-curse"),
  memoryExperienceCurse: document.querySelector("#memory-experience-curse"),
  curseMemoryList: document.querySelector("#curse-memory-list"),
};

const stepLabels = [
  "Step 1: Identity + first Memory",
  "Step 2: Create Mortals",
  "Step 3: Skills and Resources",
  "Step 4: Additional Memories",
  "Step 5: The Curse",
];

const bindRemove = (button, handler) => {
  button.addEventListener("click", handler);
  return button;
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

const renderMemoryList = (listElement, startIndex, endIndexExclusive) => {
  listElement.innerHTML = "";

  for (const [index, memory] of character.memories.entries()) {
    if (index < startIndex || index >= endIndexExclusive) continue;

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
    listElement.append(item);
  }
};

const renderCharacterList = (listElement, type) => {
  listElement.innerHTML = "";

  for (const [index, entry] of character.characters.entries()) {
    if (entry.type !== type) continue;

    const item = document.createElement("li");
    item.className = "record";

    const body = document.createElement("div");
    body.className = "record-body";

    const heading = document.createElement("strong");
    heading.textContent = entry.name;

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
    listElement.append(item);
  }
};

const stepRequirements = [
  () => character.memories.length >= 1,
  () => character.mortalCount >= 3,
  () => character.skills.length >= 3 && character.resources.length >= 3,
  () => character.memories.length >= 4,
  () => character.memories.length >= 5 && character.immortalCount >= 1 && character.marks.length >= 1,
];

const isStepComplete = (stepIndex) => stepRequirements[stepIndex]();

const renderStep = () => {
  elements.stepPanels.forEach((panel, index) => {
    panel.hidden = currentStep !== index;
  });

  elements.stepTitle.textContent = stepLabels[currentStep];
  elements.stepProgress.textContent = `${currentStep + 1}/5`;

  const stepItems = [...elements.stepList.children];
  for (const [index, item] of stepItems.entries()) {
    item.className = isStepComplete(index) ? "complete" : "";
    if (index === currentStep) item.classList.add("active");
  }

  elements.backButton.disabled = currentStep === 0;
  elements.nextButton.disabled = !isStepComplete(currentStep) || currentStep === 4;
};

const renderStatus = () => {
  const ready = character.isReadyForPromptOne() && stepRequirements.every((requirement) => requirement());
  elements.promptHint.textContent = ready
    ? "Setup complete in rules order. You are ready to begin Prompt 1."
    : "Complete each step in order to satisfy pre-Prompt 1 setup.";
  elements.promptHint.className = ready ? "supporting hero-status ready" : "supporting hero-status";
};

const render = () => {
  elements.nameInput.value = character.name;
  renderMemoryList(elements.identityMemoryList, 0, 1);
  renderCharacterList(elements.mortalList, "mortal");
  renderStringList(elements.skillList, character.skills, (index) => character.removeSkill(index));
  renderStringList(elements.resourceList, character.resources, (index) => character.removeResource(index));
  renderMemoryList(elements.laterMemoryList, 1, 4);
  renderCharacterList(elements.immortalList, "immortal");
  renderStringList(elements.markList, character.marks, (index) => character.removeMark(index));
  renderMemoryList(elements.curseMemoryList, 4, 5);
  renderStep();
  renderStatus();
};

elements.nameInput.addEventListener("change", () => {
  character.rename(elements.nameInput.value);
  render();
});

elements.memoryFormIdentity.addEventListener("submit", (event) => {
  event.preventDefault();
  if (character.memories.length >= 1) return;

  if (character.addMemory(elements.memoryTitleIdentity.value, elements.memoryExperienceIdentity.value)) {
    elements.memoryFormIdentity.reset();
    render();
  }
});

elements.mortalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (character.addCharacter(elements.mortalName.value, elements.mortalDescription.value, "mortal")) {
    elements.mortalForm.reset();
    render();
  }
});

elements.skillForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (character.addSkill(elements.skillInput.value)) {
    elements.skillForm.reset();
    render();
  }
});

elements.resourceForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (character.addResource(elements.resourceInput.value)) {
    elements.resourceForm.reset();
    render();
  }
});

elements.memoryFormLater.addEventListener("submit", (event) => {
  event.preventDefault();
  if (character.memories.length < 1 || character.memories.length >= 4) return;

  if (character.addMemory(elements.memoryTitleLater.value, elements.memoryExperienceLater.value)) {
    elements.memoryFormLater.reset();
    render();
  }
});

elements.immortalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (character.addCharacter(elements.immortalName.value, elements.immortalDescription.value, "immortal")) {
    elements.immortalForm.reset();
    render();
  }
});

elements.markForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (character.addMark(elements.markInput.value)) {
    elements.markForm.reset();
    render();
  }
});

elements.memoryFormCurse.addEventListener("submit", (event) => {
  event.preventDefault();
  if (character.memories.length !== 4) return;

  if (character.addMemory(elements.memoryTitleCurse.value, elements.memoryExperienceCurse.value)) {
    elements.memoryFormCurse.reset();
    render();
  }
});

elements.backButton.addEventListener("click", () => {
  currentStep = Math.max(0, currentStep - 1);
  renderStep();
});

elements.nextButton.addEventListener("click", () => {
  if (!isStepComplete(currentStep)) return;

  currentStep = Math.min(4, currentStep + 1);
  renderStep();
});

render();
