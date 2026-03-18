import { Character } from "./game.js";

const cleanText = (value = "") => String(value).trim().replace(/\s+/g, " ");
const MIN_MEMORY_TRAITS = 2;

const character = new Character();
let currentStep = 0;
let hasSavedSetup = false;
const selectedLaterTraitIds = new Set();
const selectedCurseTraitIds = new Set();
const sampleMortals = [
  ["Yvette", "A mortal sibling who still writes to me."],
  ["Tomas", "A steward who knows too much."],
  ["Lucien", "A former lover who still trusts me."],
];
const sampleSkills = [
  ["Falconry", "Learned in the service of a minor lord."],
  ["Swordplay", "Refined during years of border war."],
  ["Court Etiquette", "Useful whenever I need to appear harmless."],
];
const sampleResources = [
  ["Family Signet", "Proof of a claim nobody else believes."],
  ["Black Mare", "A reliable horse for night journeys."],
  ["Hidden Letters", "Correspondence that can ruin a household."],
];
const sampleLaterMemories = [
  "I crossed the winter sea with trusted company and learned which promises survive hunger.",
  "My finest weapon bought me safety, but only because an old ally chose my side.",
  "I abandoned a refuge to protect the people tied to my mortal name.",
];

const elements = {
  nameInput: document.querySelector("#name"),
  identityMemoryInput: document.querySelector("#memory-identity"),
  stepProgress: document.querySelector("#step-progress"),
  stepPanels: [...document.querySelectorAll("[data-step-panel]")],
  backButton: document.querySelector("#back-button"),
  autofillButton: document.querySelector("#autofill-button"),
  nextButton: document.querySelector("#next-button"),
  saveConfirmation: document.querySelector("#save-confirmation"),

  mortalForm: document.querySelector("#mortal-form"),
  mortalName: document.querySelector("#mortal-name"),
  mortalDescription: document.querySelector("#mortal-description"),
  mortalList: document.querySelector("#mortal-list"),

  skillForm: document.querySelector("#skill-form"),
  skillName: document.querySelector("#skill-name"),
  skillDescription: document.querySelector("#skill-description"),
  skillList: document.querySelector("#skill-list"),

  resourceForm: document.querySelector("#resource-form"),
  resourceName: document.querySelector("#resource-name"),
  resourceDescription: document.querySelector("#resource-description"),
  resourceList: document.querySelector("#resource-list"),

  memoryFormLater: document.querySelector("#memory-form-later"),
  memoryLater: document.querySelector("#memory-later"),
  memoryTraitsLater: document.querySelector("#memory-traits-later"),
  laterMemoryList: document.querySelector("#later-memory-list"),

  immortalForm: document.querySelector("#immortal-form"),
  immortalName: document.querySelector("#immortal-name"),
  immortalDescription: document.querySelector("#immortal-description"),
  immortalList: document.querySelector("#immortal-list"),

  markForm: document.querySelector("#mark-form"),
  markInput: document.querySelector("#mark-input"),
  markDescription: document.querySelector("#mark-description"),
  markList: document.querySelector("#mark-list"),

  memoryFormCurse: document.querySelector("#memory-form-curse"),
  memoryCurse: document.querySelector("#memory-curse"),
  memoryTraitsCurse: document.querySelector("#memory-traits-curse"),
  curseMemoryList: document.querySelector("#curse-memory-list"),

  identityMemoryList: document.querySelector("#identity-memory-list"),
};

const totalSteps = elements.stepPanels.length;

const bindRemove = (button, handler) => {
  button.addEventListener("click", handler);
  return button;
};

const markDirty = () => {
  hasSavedSetup = false;
};

const getTraitGroups = () => [
  {
    title: "Mortals",
    options: character.characters
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.type === "mortal")
      .map(({ entry, index }) => ({
        id: `character-${index}`,
        label: entry.name,
        value: `Mortal: ${entry.name}`,
      })),
  },
  {
    title: "Immortals",
    options: character.characters
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.type === "immortal")
      .map(({ entry, index }) => ({
        id: `character-${index}`,
        label: entry.name,
        value: `Immortal: ${entry.name}`,
      })),
  },
  {
    title: "Skills",
    options: character.skills.map((item, index) => ({
      id: `skill-${index}`,
      label: item.name,
      value: `Skill: ${item.name}`,
    })),
  },
  {
    title: "Resources",
    options: character.resources.map((item, index) => ({
      id: `resource-${index}`,
      label: item.name,
      value: `Resource: ${item.name}`,
    })),
  },
  {
    title: "Marks",
    options: character.marks.map((item, index) => ({
      id: `mark-${index}`,
      label: item.name,
      value: `Mark: ${item.name}`,
    })),
  },
];

const getSelectedTraitLabels = (selectedIds) => {
  const optionsById = new Map(
    getTraitGroups().flatMap((group) => group.options).map((option) => [option.id, option.value]),
  );

  return [...selectedIds].map((id) => optionsById.get(id)).filter(Boolean);
};

const syncSelectedTraits = (selectedIds) => {
  const availableIds = new Set(
    getTraitGroups().flatMap((group) => group.options).map((option) => option.id),
  );

  for (const id of [...selectedIds]) {
    if (!availableIds.has(id)) selectedIds.delete(id);
  }
};

const selectAutofillTraits = (selectedIds) => {
  selectedIds.clear();

  for (const option of getTraitGroups().flatMap((group) => group.options).slice(0, MIN_MEMORY_TRAITS)) {
    selectedIds.add(option.id);
  }
};

const renderTraitSelector = (container, selectedIds) => {
  container.innerHTML = "";

  for (const group of getTraitGroups()) {
    if (!group.options.length) continue;

    const section = document.createElement("section");
    section.className = "trait-group";

    const title = document.createElement("p");
    title.className = "trait-group-title";
    title.textContent = group.title;

    const pills = document.createElement("div");
    pills.className = "trait-pills";

    for (const option of group.options) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = selectedIds.has(option.id) ? "trait-pill selected" : "trait-pill";
      pill.textContent = option.label;
      pill.addEventListener("click", () => {
        markDirty();

        if (selectedIds.has(option.id)) {
          selectedIds.delete(option.id);
        } else {
          selectedIds.add(option.id);
        }

        render();
      });
      pills.append(pill);
    }

    section.append(title, pills);
    container.append(section);
  }
};

const renderRecords = (listElement, records, removeItem) => {
  listElement.innerHTML = "";

  for (const record of records) {
    const item = document.createElement("li");
    item.className = "record";

    const body = document.createElement("div");
    body.className = "record-body";

    if (record.title) {
      const title = document.createElement("strong");
      title.textContent = record.title;
      body.append(title);
    }

    if (record.text) {
      const text = document.createElement("p");
      text.textContent = record.text;
      body.append(text);
    }

    if (record.tags?.length) {
      const tags = document.createElement("div");
      tags.className = "record-tags";

      for (const tagText of record.tags) {
        const tag = document.createElement("span");
        tag.className = "record-tag";
        tag.textContent = tagText;
        tags.append(tag);
      }

      body.append(tags);
    }

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost-button";
    removeButton.textContent = "Remove";
    bindRemove(removeButton, () => {
      removeItem(record.index);
      markDirty();
      render();
    });

    item.append(body, removeButton);
    listElement.append(item);
  }
};

const renderMemoryList = (listElement, startIndex, endIndexExclusive) => {
  const records = character.memories
    .map((memory, index) => ({
      index,
      text: memory.text,
      tags: memory.traits,
    }))
    .filter(({ index }) => index >= startIndex && index < endIndexExclusive);

  renderRecords(listElement, records, (index) => character.removeMemory(index));
};

const renderCharacterList = (listElement, type) => {
  const records = character.characters
    .map((entry, index) => ({ index, entry }))
    .filter(({ entry }) => entry.type === type)
    .map(({ index, entry }) => ({
      index,
      title: entry.name,
      text: entry.description,
    }));

  renderRecords(listElement, records, (index) => character.removeCharacter(index));
};

const renderDetailList = (listElement, items, removeItem) => {
  const records = items.map((item, index) => ({
    index,
    title: item.name,
    text: item.description,
  }));

  renderRecords(listElement, records, removeItem);
};

const stepRequirements = [
  () => character.memories.length >= 1,
  () => character.mortalCount >= 3,
  () => character.skills.length >= 3,
  () => character.resources.length >= 3,
  () => character.memories.length >= 4,
  () => character.immortalCount >= 1,
  () => character.marks.length >= 1,
  () => character.memories.length >= 5,
];

const stepCanAdvance = [
  () => true,
  () => stepRequirements[1](),
  () => stepRequirements[2](),
  () => stepRequirements[3](),
  () => stepRequirements[4](),
  () => true,
  () => true,
  () =>
    character.memories.length >= 5
    || (
      character.memories.length === 4
      && Boolean(cleanText(elements.memoryCurse.value))
      && selectedCurseTraitIds.size >= MIN_MEMORY_TRAITS
    ),
];

const isStepComplete = (stepIndex) => stepRequirements[stepIndex]();
const canAdvanceFromStep = (stepIndex) => stepCanAdvance[stepIndex]();

const renderStep = () => {
  elements.stepPanels.forEach((panel, index) => {
    panel.hidden = currentStep !== index;
  });

  elements.stepProgress.textContent = `${currentStep + 1}/${totalSteps}`;
  elements.backButton.disabled = currentStep === 0;
  elements.nextButton.hidden = false;
  elements.nextButton.textContent = currentStep === totalSteps - 1 ? "Save" : "Next";
  elements.nextButton.disabled = !canAdvanceFromStep(currentStep);
};

const render = () => {
  syncSelectedTraits(selectedLaterTraitIds);
  syncSelectedTraits(selectedCurseTraitIds);
  elements.nameInput.value = character.name;
  renderMemoryList(elements.identityMemoryList, 0, 1);
  renderCharacterList(elements.mortalList, "mortal");
  renderDetailList(elements.skillList, character.skills, (index) => character.removeSkill(index));
  renderDetailList(elements.resourceList, character.resources, (index) =>
    character.removeResource(index),
  );
  renderMemoryList(elements.laterMemoryList, 1, 4);
  renderCharacterList(elements.immortalList, "immortal");
  renderDetailList(elements.markList, character.marks, (index) => character.removeMark(index));
  renderMemoryList(elements.curseMemoryList, 4, 5);
  renderTraitSelector(elements.memoryTraitsLater, selectedLaterTraitIds);
  renderTraitSelector(elements.memoryTraitsCurse, selectedCurseTraitIds);
  elements.saveConfirmation.hidden = !hasSavedSetup;
  renderStep();
};

const saveIdentityStep = () => {
  markDirty();
  character.rename(elements.nameInput.value);

  if (character.memories.length === 0) {
    if (!character.addMemory(elements.identityMemoryInput.value)) {
      return false;
    }

    elements.identityMemoryInput.value = "";
  }

  return isStepComplete(0);
};

const saveImmortalStep = () => {
  if (character.immortalCount > 0) return true;

  markDirty();
  return character.addCharacter(
    elements.immortalName.value,
    elements.immortalDescription.value,
    "immortal",
  );
};

const saveMarkStep = () => {
  if (character.marks.length > 0) return true;

  markDirty();
  return character.addMark(elements.markInput.value, elements.markDescription.value);
};

const saveCurseMemoryStep = () => {
  if (character.memories.length >= 5) return true;
  if (character.memories.length !== 4) return false;
  if (selectedCurseTraitIds.size < MIN_MEMORY_TRAITS) return false;

  markDirty();
  const didSave = character.addMemory(
    elements.memoryCurse.value,
    getSelectedTraitLabels(selectedCurseTraitIds),
  );

  if (didSave) {
    elements.memoryCurse.value = "";
    selectedCurseTraitIds.clear();
  }

  return didSave;
};

const autofillCurrentStep = () => {
  markDirty();

  if (currentStep === 0) {
    if (!cleanText(elements.nameInput.value)) {
      elements.nameInput.value = "Test Vampire";
      character.rename(elements.nameInput.value);
    }

    if (!cleanText(elements.identityMemoryInput.value) && character.memories.length === 0) {
      elements.identityMemoryInput.value =
        "I was born to a fading noble house and learned early that affection is transactional.";
    }

    renderStep();
    return;
  }

  if (currentStep === 1) {
    while (character.mortalCount < 3) {
      const [name, description] = sampleMortals[character.mortalCount] ?? [
        `Mortal ${character.mortalCount + 1}`,
        "A mortal tied to my earliest years.",
      ];
      character.addCharacter(name, description, "mortal");
    }

    render();
    return;
  }

  if (currentStep === 2) {
    while (character.skills.length < 3) {
      const [name, description] = sampleSkills[character.skills.length] ?? [
        `Skill ${character.skills.length + 1}`,
        "A practiced talent from mortal life.",
      ];
      character.addSkill(name, description);
    }

    render();
    return;
  }

  if (currentStep === 3) {
    while (character.resources.length < 3) {
      const [name, description] = sampleResources[character.resources.length] ?? [
        `Resource ${character.resources.length + 1}`,
        "A useful possession I can still rely on.",
      ];
      character.addResource(name, description);
    }

    render();
    return;
  }

  if (currentStep === 4) {
    while (character.memories.length < 4) {
      const sampleIndex = character.memories.length - 1;
      selectAutofillTraits(selectedLaterTraitIds);
      character.addMemory(
        sampleLaterMemories[sampleIndex] ?? `Another memory ${character.memories.length + 1}.`,
        getSelectedTraitLabels(selectedLaterTraitIds),
      );
    }

    selectedLaterTraitIds.clear();
    render();
    return;
  }

  if (currentStep === 5) {
    if (!cleanText(elements.immortalName.value) && character.immortalCount === 0) {
      elements.immortalName.value = "Baron Severin";
    }

    if (!cleanText(elements.immortalDescription.value) && character.immortalCount === 0) {
      elements.immortalDescription.value = "The immortal who dragged me into unlife.";
    }

    renderStep();
    return;
  }

  if (currentStep === 6) {
    if (!cleanText(elements.markInput.value) && character.marks.length === 0) {
      elements.markInput.value = "My shadow lags a heartbeat behind me.";
    }

    if (!cleanText(elements.markDescription.value) && character.marks.length === 0) {
      elements.markDescription.value = "It is most visible in torchlight and unsettles the faithful.";
    }

    renderStep();
    return;
  }

  if (currentStep === 7) {
    if (!cleanText(elements.memoryCurse.value) && character.memories.length === 4) {
      elements.memoryCurse.value =
        "I pursued Baron Severin onto the chapel roof and rose again after the mortal blow.";
    }

    if (selectedCurseTraitIds.size < MIN_MEMORY_TRAITS) {
      selectAutofillTraits(selectedCurseTraitIds);
    }

    render();
  }
};

elements.nameInput.addEventListener("input", () => {
  markDirty();
  character.rename(elements.nameInput.value);
  renderStep();
});

elements.identityMemoryInput.addEventListener("input", () => {
  markDirty();
  renderStep();
});

elements.memoryCurse.addEventListener("input", () => {
  markDirty();
  renderStep();
});

elements.mortalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (character.addCharacter(elements.mortalName.value, elements.mortalDescription.value, "mortal")) {
    markDirty();
    elements.mortalForm.reset();
    render();
  }
});

elements.skillForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (character.addSkill(elements.skillName.value, elements.skillDescription.value)) {
    markDirty();
    elements.skillForm.reset();
    render();
  }
});

elements.resourceForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (character.addResource(elements.resourceName.value, elements.resourceDescription.value)) {
    markDirty();
    elements.resourceForm.reset();
    render();
  }
});

elements.memoryFormLater.addEventListener("submit", (event) => {
  event.preventDefault();
  if (character.memories.length < 1 || character.memories.length >= 4) return;
  if (selectedLaterTraitIds.size < MIN_MEMORY_TRAITS) return;

  if (
    character.addMemory(
      elements.memoryLater.value,
      getSelectedTraitLabels(selectedLaterTraitIds),
    )
  ) {
    markDirty();
    elements.memoryFormLater.reset();
    selectedLaterTraitIds.clear();
    render();
  }
});

elements.immortalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (
    character.addCharacter(
      elements.immortalName.value,
      elements.immortalDescription.value,
      "immortal",
    )
  ) {
    markDirty();
    elements.immortalForm.reset();
    render();
  }
});

elements.markForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (character.addMark(elements.markInput.value, elements.markDescription.value)) {
    markDirty();
    elements.markForm.reset();
    render();
  }
});

elements.memoryFormCurse.addEventListener("submit", (event) => {
  event.preventDefault();
  if (character.memories.length !== 4) return;
  if (selectedCurseTraitIds.size < MIN_MEMORY_TRAITS) return;

  if (
    character.addMemory(
      elements.memoryCurse.value,
      getSelectedTraitLabels(selectedCurseTraitIds),
    )
  ) {
    markDirty();
    elements.memoryFormCurse.reset();
    selectedCurseTraitIds.clear();
    render();
  }
});

elements.backButton.addEventListener("click", () => {
  currentStep = Math.max(0, currentStep - 1);
  renderStep();
});

elements.autofillButton.addEventListener("click", () => {
  autofillCurrentStep();
});

elements.nextButton.addEventListener("click", () => {
  if (currentStep === 0) {
    if (!saveIdentityStep()) return;

    currentStep = 1;
    render();
    return;
  }

  if (currentStep === 5) {
    if (!saveImmortalStep()) return;

    currentStep = 6;
    render();
    return;
  }

  if (currentStep === 6) {
    if (!saveMarkStep()) return;

    currentStep = 7;
    render();
    return;
  }

  if (currentStep === 7) {
    if (!saveCurseMemoryStep()) return;

    hasSavedSetup = character.isReadyForPromptOne();
    render();
    return;
  }

  if (!isStepComplete(currentStep)) {
    return;
  }

  currentStep = Math.min(totalSteps - 1, currentStep + 1);
  render();
});

render();
