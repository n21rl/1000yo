import { restoreCampaignState, serializeCampaignState } from "./campaign-state.js";
import { elements, totalSteps } from "./dom.js";
import { Character, MAX_EXPERIENCES_PER_MEMORY, MAX_MEMORIES } from "./game.js";
import {
  clampPromptIndex,
  getPromptEntry,
  loadPromptDeck,
  moveToNextAvailablePrompt,
  rollDie,
} from "./prompts.js";
import {
  TEST_VAMPIRE_ID,
  cleanText,
  createStoredRecord,
  ensureTestVampireRecord,
  findStoredVampireByRouteId,
  getStoredVampires,
  getVampireRouteId,
  isDuplicateVampireName,
  normalizeCharacterName,
  parseRouteId,
  saveStoredVampires,
} from "./storage.js";
import { createButton, createEmptyRecord, renderRecords } from "./ui-helpers.js";
const MIN_MEMORY_TRAITS = 2;
const COLLAPSIBLE_SECTIONS = ["memories", "characters", "skills", "resources", "marks"];

let character = new Character();
let currentStep = 0;
let hasSavedSetup = false;
let currentScreen = "menu";
let selectedVampireId = "";
const selectedLaterTraitIds = new Set();
const selectedCurseTraitIds = new Set();
const pendingExperienceTraitIds = new Set();
let editingTrait = null;
let experienceComposer = { open: false, target: "new" };
let activeModal = null;
const collapsedCards = new Set(["characters", "skills", "resources", "marks"]);
const promptState = {
  deck: [],
  isLoading: false,
  loadError: "",
  currentPrompt: 1,
  visits: new Map(),
};

const SCREEN_TITLES = {
  menu: "Start Menu",
  creation: "Vampire Creation",
  play: "Play",
};

const syncNameValidity = (name, excludingId = selectedVampireId) => {
  const cleanedName = cleanText(name);
  if (!cleanedName) {
    elements.nameInput.setCustomValidity("Name is required.");
    return false;
  }
  if (isDuplicateVampireName(cleanedName, excludingId)) {
    elements.nameInput.setCustomValidity(`A character named "${cleanedName}" already exists.`);
    return false;
  }
  elements.nameInput.setCustomValidity("");
  return true;
};

const persistCurrentCharacter = () => {
  const vampires = getStoredVampires();
  const previousId = selectedVampireId;
  const cleanedName = cleanText(character.name);
  const nextId = getVampireRouteId(cleanedName);

  if (cleanedName) {
    const duplicate = vampires.find((entry) => {
      if (entry.id === previousId) return false;
      return normalizeCharacterName(entry.data?.name) === normalizeCharacterName(cleanedName);
    });
    if (duplicate) return false;
  }

  selectedVampireId = nextId || previousId || crypto.randomUUID();
  const record = createStoredRecord({
    selectedVampireId,
    character,
    serializeCampaignState,
    promptState,
  });
  const existingIndex = vampires.findIndex((entry) => entry.id === record.id);

  if (existingIndex >= 0) vampires.splice(existingIndex, 1, record);
  else vampires.push(record);
  if (previousId && previousId !== record.id) {
    const staleIndex = vampires.findIndex((entry) => entry.id === previousId);
    if (staleIndex >= 0) vampires.splice(staleIndex, 1);
  }

  saveStoredVampires(vampires);
  return true;
};

const resetPlayState = () => {
  pendingExperienceTraitIds.clear();
  editingTrait = null;
  experienceComposer = { open: false, target: "new" };
  activeModal = null;
};

const loadCharacter = (storedCharacter) => {
  character = Character.from(storedCharacter?.data ?? {});
  selectedVampireId = storedCharacter?.id ?? "";
  hasSavedSetup = Boolean(storedCharacter?.isComplete && character.isReadyForPromptOne());
  currentStep = 0;
  selectedLaterTraitIds.clear();
  selectedCurseTraitIds.clear();
  const restoredCampaign = restoreCampaignState(storedCharacter?.campaign);
  promptState.currentPrompt = restoredCampaign.currentPrompt;
  promptState.visits = restoredCampaign.visits;
  resetPlayState();
};

const resetCreationForms = () => {
  elements.mortalForm.reset();
  elements.skillForm.reset();
  elements.resourceForm.reset();
  elements.memoryFormLater.reset();
  elements.immortalForm.reset();
  elements.markForm.reset();
  elements.memoryFormCurse.reset();
};

const resetPlayForms = () => {
  elements.playExperienceForm.reset();
  elements.playSkillForm.reset();
  elements.playResourceForm.reset();
  elements.playCharacterForm.reset();
};

const resetPromptState = () => {
  promptState.currentPrompt = 1;
  promptState.visits = new Map();
};

const getRouteForScreen = (screen) => {
  if (screen === "creation") return "#/create";
  if (screen === "play" && selectedVampireId) {
    const routeId = parseRouteId(selectedVampireId) || selectedVampireId;
    return `#/play/${encodeURIComponent(routeId)}`;
  }
  return "#/menu";
};

const updateDocumentTitle = () => {
  const title = SCREEN_TITLES[currentScreen] ?? "1000yo";
  document.title = `${title} · 1000yo`;
};

const setScreen = (screen, { updateRoute = false, replaceRoute = false } = {}) => {
  currentScreen = screen;
  elements.menuScreen.hidden = currentScreen !== "menu";
  elements.creationScreen.hidden = currentScreen !== "creation";
  elements.playScreen.hidden = currentScreen !== "play";
  updateDocumentTitle();

  if (updateRoute) {
    const nextRoute = getRouteForScreen(screen);
    if (window.location.hash !== nextRoute) {
      if (replaceRoute) window.location.replace(nextRoute);
      else window.location.hash = nextRoute;
    }
  }
};

const startNewVampire = () => {
  character = new Character();
  selectedVampireId = crypto.randomUUID();
  currentStep = 0;
  hasSavedSetup = false;
  selectedLaterTraitIds.clear();
  selectedCurseTraitIds.clear();
  resetPromptState();
  resetCreationForms();
  resetPlayState();
  resetPlayForms();
  setScreen("creation", { updateRoute: true });
  render();
};

const markDirty = () => {
  hasSavedSetup = false;
  return persistCurrentCharacter();
};

const getTraitGroups = () => [
  {
    title: "Mortals",
    options: character.characters
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.type === "mortal")
      .map(({ entry, index }) => ({ id: `character-${index}`, label: entry.name, value: `Mortal: ${entry.name}` })),
  },
  {
    title: "Immortals",
    options: character.characters
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.type === "immortal")
      .map(({ entry, index }) => ({ id: `character-${index}`, label: entry.name, value: `Immortal: ${entry.name}` })),
  },
  {
    title: "Skills",
    options: character.skills.map((item, index) => ({ id: `skill-${index}`, label: item.name, value: `Skill: ${item.name}` })),
  },
  {
    title: "Resources",
    options: character.resources.map((item, index) => ({ id: `resource-${index}`, label: item.name, value: `Resource: ${item.name}` })),
  },
  {
    title: "Marks",
    options: character.marks.map((item, index) => ({ id: `mark-${index}`, label: item.name, value: `Mark: ${item.name}` })),
  },
];

const getSelectedTraitLabels = (selectedIds) => {
  const optionsById = new Map(getTraitGroups().flatMap((group) => group.options).map((option) => [option.id, option.value]));
  return [...selectedIds].map((id) => optionsById.get(id)).filter(Boolean);
};

const syncSelectedTraits = (selectedIds) => {
  const availableIds = new Set(getTraitGroups().flatMap((group) => group.options).map((option) => option.id));
  for (const id of [...selectedIds]) {
    if (!availableIds.has(id)) selectedIds.delete(id);
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
      const pill = document.createElement("span");
      pill.className = selectedIds.has(option.id) ? "record-tag selected-trait" : "record-tag";
      pill.textContent = option.value;
      pills.append(pill);
    }

    section.append(title, pills);
    container.append(section);
  }

  if (!container.childElementCount) {
    container.append(createEmptyRecord("Select characters, skills, resources, or marks to tag this experience."));
  }
};

const renderMenu = () => {
  ensureTestVampireRecord({ Character, serializeCampaignState });
  const vampires = getStoredVampires();
  elements.vampireList.innerHTML = "";
  elements.vampireList.hidden = vampires.length === 0;

  for (const vampire of vampires) {
    const item = document.createElement("li");
    item.className = "record vampire-record";
    item.tabIndex = 0;
    item.role = "button";

    const openVampire = () => {
      loadCharacter(vampire);
      resetCreationForms();
      void startPlay(true);
    };

    item.addEventListener("click", () => {
      openVampire();
    });
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openVampire();
    });

    const body = document.createElement("div");
    body.className = "vampire-option";

    const title = document.createElement("strong");
    title.textContent = vampire.data?.name || "Unnamed Vampire";
    body.append(title);

    const actions = document.createElement("div");
    actions.className = "menu-record-actions";
    if (vampire.id !== TEST_VAMPIRE_ID) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "menu-delete-control";
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const displayName = vampire.data?.name || "this vampire";
        if (!window.confirm(`Delete ${displayName}? This cannot be undone.`)) return;
        const remaining = getStoredVampires().filter((entry) => entry.id !== vampire.id);
        saveStoredVampires(remaining);
        if (selectedVampireId === vampire.id) selectedVampireId = "";
        setScreen("menu", { updateRoute: true });
        render();
      });
      deleteButton.ariaLabel = `Delete ${vampire.data?.name || "saved vampire"}`;
      actions.append(deleteButton);
    }

    item.append(body, actions);
    elements.vampireList.append(item);
  }
};

const getMemoryRecords = (startIndex, endIndexExclusive) => character.memories
  .map((memory, index) => ({ memory, index }))
  .filter(({ index }) => index >= startIndex && index < endIndexExclusive)
  .map(({ memory, index }) => ({
    index,
    title: `Memory ${index + 1}`,
    text: memory.experiences.map((experience) => experience.text).join(" "),
    tags: [...new Set(memory.experiences.flatMap((experience) => experience.traits))],
  }));

const renderMemoryList = (listElement, startIndex, endIndexExclusive) => {
  renderRecords({
    listElement,
    records: getMemoryRecords(startIndex, endIndexExclusive),
    removeItem: (index) => character.removeMemory(index),
    emptyMessage: null,
    onAfterRemove: () => {
      markDirty();
      render();
    },
  });
};

const renderCharacterList = (listElement, type) => {
  const records = character.characters
    .map((entry, index) => ({ index, entry }))
    .filter(({ entry }) => entry.type === type)
    .map(({ index, entry }) => ({ index, title: entry.name, text: entry.description }));
  renderRecords({
    listElement,
    records,
    removeItem: (index) => character.removeCharacter(index),
    emptyMessage: null,
    onAfterRemove: () => {
      markDirty();
      render();
    },
  });
};

const renderDetailList = (listElement, items, removeItem) => {
  const records = items.map((item, index) => ({ index, title: item.name, text: item.description }));
  renderRecords({
    listElement,
    records,
    removeItem,
    emptyMessage: null,
    onAfterRemove: () => {
      markDirty();
      render();
    },
  });
};

const togglePendingTrait = (traitId) => {
  if (!experienceComposer.open) return;
  if (pendingExperienceTraitIds.has(traitId)) pendingExperienceTraitIds.delete(traitId);
  else pendingExperienceTraitIds.add(traitId);
  renderPlayLists();
};

const formatStatusTags = (item, kind) => {
  const tags = [];
  if (item.used) tags.push("Used");
  if (item.lost) tags.push(kind === "character" ? "Dead" : "Lost");
  return tags;
};

const renderSelectedTraitPills = () => {
  elements.playSelectedTraits.innerHTML = "";
  const labels = getSelectedTraitLabels(pendingExperienceTraitIds);
  if (!labels.length) return;
  labels.forEach((label) => {
    const pill = document.createElement("span");
    pill.className = "record-tag selected-trait";
    pill.textContent = label;
    elements.playSelectedTraits.append(pill);
  });
};

const openExperienceComposer = (target = "new") => {
  activeModal = "memory";
  experienceComposer = { open: true, target };
  elements.playExperienceForm.hidden = false;
};

const closeExperienceComposer = () => {
  experienceComposer = { open: false, target: "new" };
  pendingExperienceTraitIds.clear();
  elements.playExperienceForm.reset();
  elements.playExperienceForm.hidden = true;
};

const renderPlayComposer = () => {
  const targetIndex = experienceComposer.target === "new" ? null : Number(experienceComposer.target);
  const isNewMemory = experienceComposer.target === "new";
  elements.playExperienceForm.hidden = activeModal !== "memory" || !experienceComposer.open;
  elements.playExperienceSubmit.textContent = isNewMemory ? "Add memory" : "Add experience";
  if (isNewMemory) {
    elements.playMemoryHint.textContent = `This will create a new memory (${character.memories.length}/${MAX_MEMORIES}).`;
  } else {
    const memory = character.memories[targetIndex];
    elements.playMemoryHint.textContent = memory
      ? `This memory has ${memory.experiences.length}/${MAX_EXPERIENCES_PER_MEMORY} experiences.`
      : "Select a memory to continue.";
  }
  renderSelectedTraitPills();
};

const renderPlayMemoryList = () => {
  elements.playMemoryList.innerHTML = "";
  if (!character.memories.length) {
    elements.playMemoryList.append(createEmptyRecord("No memories yet."));
    return;
  }

  character.memories.forEach((memory, memoryIndex) => {
    const item = document.createElement("li");
    item.className = memory.lost ? "record play-memory lost" : "record play-memory";

    const body = document.createElement("div");
    body.className = "record-body";
    const title = document.createElement("strong");
    title.textContent = `Memory ${memoryIndex + 1}`;
    body.append(title);

    const experienceList = document.createElement("ol");
    experienceList.className = "experience-list";
    memory.experiences.forEach((experience) => {
      const experienceItem = document.createElement("li");
      const text = document.createElement("p");
      text.textContent = experience.text;
      experienceItem.append(text);
      experienceList.append(experienceItem);
    });
    body.append(experienceList);

    const actions = document.createElement("div");
    actions.className = "record-actions";
    if (!memory.lost && memory.experiences.length < MAX_EXPERIENCES_PER_MEMORY) {
      actions.append(createButton("Add experience", "ghost-button small-button", () => {
        openExperienceComposer(String(memoryIndex));
        render();
      }));
    }
    actions.append(
      createButton(memory.lost ? "Restore" : "Strike out", "ghost-button small-button", () => {
        character.setMemoryLost(memoryIndex, !memory.lost);
        markDirty();
        render();
      }),
      createButton("Remove", "ghost-button small-button", () => {
        character.removeMemory(memoryIndex);
        if (experienceComposer.target === String(memoryIndex)) closeExperienceComposer();
        markDirty();
        render();
      }),
    );

    item.append(body, actions);
    elements.playMemoryList.append(item);
  });
};

const renderTraitList = (listElement, items, kind) => {
  listElement.innerHTML = "";
  if (!items.length) {
    listElement.append(createEmptyRecord(`No ${kind}s available.`));
    return;
  }

  items.forEach((item, index) => {
    const entry = document.createElement("li");
    const traitId = `${kind}-${index}`;
    const selectedForExperience = pendingExperienceTraitIds.has(traitId);
    entry.className = item.lost ? "record lost" : "record";

    const body = document.createElement("button");
    body.type = "button";
    body.className = "record-select";
    body.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePendingTrait(traitId);
    });

    const bodyInner = document.createElement("div");
    bodyInner.className = "record-body";
    const title = document.createElement("strong");
    title.textContent = item.name;
    bodyInner.append(title);
    if (item.description) {
      const text = document.createElement("p");
      text.textContent = item.description;
      bodyInner.append(text);
    }

    const tags = formatStatusTags(item, kind);
    if (kind === "character") tags.unshift(item.type === "mortal" ? "Mortal" : "Immortal");
    if (selectedForExperience) tags.unshift("Tagged");
    if (tags.length) {
      const tagWrap = document.createElement("div");
      tagWrap.className = "record-tags";
      tags.forEach((label) => {
        const tag = document.createElement("span");
        tag.className = label === "Tagged" ? "record-tag selected-trait" : "record-tag";
        tag.textContent = label;
        tagWrap.append(tag);
      });
      bodyInner.append(tagWrap);
    }
    body.append(bodyInner);

    const actions = document.createElement("div");
    actions.className = "record-actions";
    const toggleUsed = kind === "character"
      ? createButton(item.used ? "Unuse" : "Use", "ghost-button small-button", () => {
        character.setCharacterUsed(index, !item.used);
        markDirty();
        render();
      })
      : kind === "skill"
        ? createButton(item.used ? "Uncheck" : "Use", "ghost-button small-button", () => {
          character.setSkillUsed(index, !item.used);
          markDirty();
          render();
        })
        : createButton(item.used ? "Unuse" : "Use", "ghost-button small-button", () => {
          character.setResourceUsed(index, !item.used);
          markDirty();
          render();
        });
    const toggleLost = kind === "character"
      ? createButton(item.lost ? "Revive" : "Kill", "ghost-button small-button", () => {
        character.setCharacterLost(index, !item.lost);
        markDirty();
        render();
      })
      : kind === "skill"
        ? createButton(item.lost ? "Restore" : "Strike out", "ghost-button small-button", () => {
          character.setSkillLost(index, !item.lost);
          markDirty();
          render();
        })
        : createButton(item.lost ? "Restore" : "Strike out", "ghost-button small-button", () => {
          character.setResourceLost(index, !item.lost);
          markDirty();
          render();
        });
    const editButton = createButton("Edit", "ghost-button small-button", () => {
      editingTrait = { kind, index };
      activeModal = kind;
      collapsedCards.delete(`${kind}s`.replace("characterss", "characters"));
      render();
    });
    const removeButton = createButton("Remove", "ghost-button small-button", () => {
      if (kind === "character") character.removeCharacter(index);
      if (kind === "skill") character.removeSkill(index);
      if (kind === "resource") character.removeResource(index);
      pendingExperienceTraitIds.delete(traitId);
      markDirty();
      render();
    });

    actions.append(toggleUsed, toggleLost, editButton, removeButton);
    entry.append(body, actions);
    listElement.append(entry);
  });
};

const renderFormState = (kind, item) => {
  if (kind === "skill") {
    elements.playSkillForm.hidden = activeModal !== "skill";
    elements.playSkillTitle.textContent = item ? "Edit skill" : "Add skill";
    elements.playSkillSubmit.textContent = item ? "Save skill" : "Add skill";
    elements.playSkillName.value = item?.name ?? "";
    elements.playSkillDescription.value = item?.description ?? "";
  }

  if (kind === "resource") {
    elements.playResourceForm.hidden = activeModal !== "resource";
    elements.playResourceTitle.textContent = item ? "Edit resource" : "Add resource";
    elements.playResourceSubmit.textContent = item ? "Save resource" : "Add resource";
    elements.playResourceName.value = item?.name ?? "";
    elements.playResourceDescription.value = item?.description ?? "";
  }

  if (kind === "character") {
    elements.playCharacterForm.hidden = activeModal !== "character";
    elements.playCharacterTitle.textContent = item ? "Edit character" : "Add character";
    elements.playCharacterSubmit.textContent = item ? "Save character" : "Add character";
    elements.playCharacterName.value = item?.name ?? "";
    elements.playCharacterDescription.value = item?.description ?? "";
    elements.playCharacterType.value = item?.type ?? "mortal";
  }
};

const syncActiveModal = () => {
  elements.playTraitModal.hidden = activeModal === null;
  if (activeModal === "memory") {
    elements.playModalTitle.textContent = experienceComposer.target === "new"
      ? "Add memory"
      : `Add experience to Memory ${Number(experienceComposer.target) + 1}`;
    return;
  }
  if (activeModal === "skill") {
    elements.playModalTitle.textContent = editingTrait?.kind === "skill" ? "Edit skill" : "Add skill";
    return;
  }
  if (activeModal === "resource") {
    elements.playModalTitle.textContent = editingTrait?.kind === "resource" ? "Edit resource" : "Add resource";
    return;
  }
  if (activeModal === "character") {
    elements.playModalTitle.textContent = editingTrait?.kind === "character" ? "Edit character" : "Add character";
  }
};

const renderPlayLists = () => {
  syncActiveModal();
  elements.playNameHeading.textContent = character.name || "Unnamed Vampire";
  syncSelectedTraits(pendingExperienceTraitIds);
  renderPlayMemoryList();
  renderTraitList(elements.playSkillList, character.skills, "skill");
  renderTraitList(elements.playResourceList, character.resources, "resource");
  renderTraitList(elements.playCharacterList, character.characters, "character");
  renderRecords({
    listElement: elements.playMarkList,
    records: character.marks.map((item, index) => ({ title: item.name, text: item.description, index })),
    emptyMessage: "No marks available.",
  });

  [...elements.playMarkList.querySelectorAll(".record")].forEach((entry, index) => {
    const traitId = `mark-${index}`;
    entry.addEventListener("click", () => togglePendingTrait(traitId));
  });

  renderPlayComposer();
  renderFormState("skill", editingTrait?.kind === "skill" ? character.skills[editingTrait.index] : null);
  renderFormState("resource", editingTrait?.kind === "resource" ? character.resources[editingTrait.index] : null);
  renderFormState("character", editingTrait?.kind === "character" ? character.characters[editingTrait.index] : null);
};

const renderPromptPanel = () => {
  if (promptState.isLoading) {
    elements.promptButton.disabled = true;
    elements.promptText.textContent = "Loading prompts...";
    return;
  }
  if (promptState.loadError) {
    elements.promptButton.disabled = true;
    elements.promptText.textContent = promptState.loadError;
    return;
  }
  if (!promptState.deck.length) {
    elements.promptButton.disabled = true;
    elements.promptText.textContent = "No prompt content is available.";
    return;
  }
  const currentPrompt = promptState.deck[promptState.currentPrompt - 1];
  const visitCount = promptState.visits.get(promptState.currentPrompt) ?? 1;
  elements.promptButton.disabled = false;
  elements.promptText.textContent = getPromptEntry(currentPrompt, visitCount) || "No remaining prompt entry at this position.";
};

const startPlay = async (skipCreationGate = false) => {
  if (!skipCreationGate && !character.isReadyForPromptOne()) {
    setScreen("creation", { updateRoute: true });
    render();
    return;
  }
  hasSavedSetup = true;
  persistCurrentCharacter();
  setScreen("play", { updateRoute: true });
  if (!promptState.visits.size) {
    promptState.currentPrompt = 1;
    promptState.visits.set(1, 1);
    persistCurrentCharacter();
  }
  render();
  await loadPromptDeck({
    promptState,
    onLoading: renderPromptPanel,
    onLoaded: () => {
      if (promptState.deck.length) {
        promptState.currentPrompt = clampPromptIndex(promptState.currentPrompt, promptState.deck.length);
        if (!promptState.visits.has(promptState.currentPrompt)) promptState.visits.set(promptState.currentPrompt, 1);
        persistCurrentCharacter();
      }
      render();
    },
  });
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

const hasValidUniqueName = () => {
  const cleanedName = cleanText(elements.nameInput.value || character.name);
  return Boolean(cleanedName) && !isDuplicateVampireName(cleanedName, selectedVampireId);
};

const stepCanAdvance = [
  () => hasValidUniqueName(),
  () => stepRequirements[1](),
  () => stepRequirements[2](),
  () => stepRequirements[3](),
  () => stepRequirements[4](),
  () => true,
  () => true,
  () => character.memories.length >= 5 || (character.memories.length === 4 && Boolean(cleanText(elements.memoryCurse.value)) && selectedCurseTraitIds.size >= MIN_MEMORY_TRAITS),
];

const isStepComplete = (stepIndex) => stepRequirements[stepIndex]();
const canAdvanceFromStep = (stepIndex) => stepCanAdvance[stepIndex]();

const renderStep = () => {
  elements.stepPanels.forEach((panel, index) => {
    panel.hidden = currentStep !== index;
  });
  elements.stepProgress.textContent = `${currentStep + 1}/${totalSteps}`;
  elements.backButton.disabled = currentStep === 0;
  elements.nextButton.textContent = currentStep === totalSteps - 1 ? "Save" : "Next";
  elements.nextButton.disabled = !canAdvanceFromStep(currentStep);
};

const renderCreation = () => {
  syncSelectedTraits(selectedLaterTraitIds);
  syncSelectedTraits(selectedCurseTraitIds);
  elements.nameInput.value = character.name;
  syncNameValidity(elements.nameInput.value, selectedVampireId);
  renderMemoryList(elements.identityMemoryList, 0, 1);
  renderCharacterList(elements.mortalList, "mortal");
  renderDetailList(elements.skillList, character.skills, (index) => character.removeSkill(index));
  renderDetailList(elements.resourceList, character.resources, (index) => character.removeResource(index));
  renderMemoryList(elements.laterMemoryList, 1, 4);
  renderCharacterList(elements.immortalList, "immortal");
  renderDetailList(elements.markList, character.marks, (index) => character.removeMark(index));
  renderMemoryList(elements.curseMemoryList, 4, 5);
  renderTraitSelector(elements.memoryTraitsLater, selectedLaterTraitIds);
  renderTraitSelector(elements.memoryTraitsCurse, selectedCurseTraitIds);
  elements.saveConfirmation.hidden = !hasSavedSetup;
  renderStep();
};

const renderCollapsibleCards = () => {
  document.querySelectorAll("[data-card-key]").forEach((card) => {
    const key = card.dataset.cardKey;
    const content = card.querySelector("[data-card-content]");
    const indicator = card.querySelector(".card-toggle-indicator");
    const collapsed = key === "prompt" ? false : collapsedCards.has(key);
    if (content) content.hidden = collapsed;
    if (indicator) indicator.classList.toggle("is-collapsed", collapsed);
  });
};

const render = () => {
  setScreen(currentScreen);
  renderMenu();
  renderCreation();
  renderPlayLists();
  renderPromptPanel();
  renderCollapsibleCards();
};

const parseRoute = () => {
  const hash = window.location.hash || "#/menu";
  const match = hash.match(/^#\/([a-z]+)(?:\/([^/]+))?$/i);
  const route = match?.[1]?.toLowerCase() ?? "menu";
  const routeId = match?.[2] ?? "";
  if (route === "create") return { screen: "creation", vampireId: "" };
  if (route === "play") return { screen: "play", vampireId: routeId };
  return { screen: "menu", vampireId: "" };
};

const handleRouteChange = async () => {
  const { screen, vampireId } = parseRoute();
  if (screen === "menu") {
    setScreen("menu");
    render();
    return;
  }
  if (screen === "creation") {
    if (!selectedVampireId) {
      startNewVampire();
      return;
    }
    setScreen("creation");
    render();
    return;
  }
  if (!vampireId) {
    setScreen("menu", { updateRoute: true, replaceRoute: true });
    render();
    return;
  }
  const storedCharacter = findStoredVampireByRouteId(vampireId);
  if (!storedCharacter) {
    setScreen("menu", { updateRoute: true, replaceRoute: true });
    render();
    return;
  }
  loadCharacter(storedCharacter);
  resetCreationForms();
  await startPlay(true);
};

const saveIdentityStep = () => {
  if (!syncNameValidity(elements.nameInput.value, selectedVampireId)) {
    elements.nameInput.reportValidity();
    return false;
  }
  character.rename(elements.nameInput.value);
  if (character.memories.length === 0) {
    if (!character.addMemory(elements.identityMemoryInput.value)) return false;
    elements.identityMemoryInput.value = "";
  }
  if (!markDirty()) {
    elements.nameInput.reportValidity();
    return false;
  }
  return isStepComplete(0);
};

const saveImmortalStep = () => {
  if (character.immortalCount > 0) return true;
  markDirty();
  const didSave = character.addCharacter(elements.immortalName.value, elements.immortalDescription.value, "immortal");
  if (didSave) persistCurrentCharacter();
  return didSave;
};

const saveMarkStep = () => {
  if (character.marks.length > 0) return true;
  markDirty();
  const didSave = character.addMark(elements.markInput.value, elements.markDescription.value);
  if (didSave) persistCurrentCharacter();
  return didSave;
};

const saveCurseMemoryStep = () => {
  if (character.memories.length >= 5) return true;
  if (character.memories.length !== 4) return false;
  if (selectedCurseTraitIds.size < MIN_MEMORY_TRAITS) return false;
  markDirty();
  const didSave = character.addMemory(elements.memoryCurse.value, getSelectedTraitLabels(selectedCurseTraitIds));
  if (didSave) {
    elements.memoryCurse.value = "";
    selectedCurseTraitIds.clear();
    persistCurrentCharacter();
  }
  return didSave;
};

elements.newVampireButton.addEventListener("click", () => startNewVampire());
elements.nameInput.addEventListener("input", () => {
  character.rename(elements.nameInput.value);
  if (syncNameValidity(elements.nameInput.value, selectedVampireId)) markDirty();
  else hasSavedSetup = false;
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
  if (character.addMemory(elements.memoryLater.value, getSelectedTraitLabels(selectedLaterTraitIds))) {
    markDirty();
    elements.memoryFormLater.reset();
    selectedLaterTraitIds.clear();
    render();
  }
});

elements.immortalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (character.addCharacter(elements.immortalName.value, elements.immortalDescription.value, "immortal")) {
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
  if (character.addMemory(elements.memoryCurse.value, getSelectedTraitLabels(selectedCurseTraitIds))) {
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
    persistCurrentCharacter();
    if (!hasSavedSetup) {
      render();
      return;
    }
    void startPlay();
    return;
  }
  if (!isStepComplete(currentStep)) return;
  currentStep = Math.min(totalSteps - 1, currentStep + 1);
  render();
});

elements.promptButton.addEventListener("click", () => {
  if (promptState.isLoading || promptState.loadError || !promptState.deck.length) return;
  const delta = rollDie(10) - rollDie(6);
  const target = clampPromptIndex(promptState.currentPrompt + delta, promptState.deck.length);
  moveToNextAvailablePrompt(promptState, target);
  persistCurrentCharacter();
  renderPromptPanel();
});

elements.addMemoryButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (character.memories.length >= MAX_MEMORIES) return;
  collapsedCards.delete("memories");
  activeModal = "memory";
  openExperienceComposer("new");
  render();
});

elements.playExperienceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const memoryIndex = experienceComposer.target === "new" ? null : Number(experienceComposer.target);
  const didSave = character.addMemory(elements.playExperienceText.value, getSelectedTraitLabels(pendingExperienceTraitIds), memoryIndex);
  if (!didSave) return;
  markDirty();
  closeExperienceComposer();
  activeModal = null;
  render();
});

elements.playExperienceCancel.addEventListener("click", (event) => {
  event.stopPropagation();
  closeExperienceComposer();
  activeModal = null;
  render();
});

const openTraitForm = (kind) => {
  collapsedCards.delete(kind === "character" ? "characters" : `${kind}s`);
  activeModal = kind;
  editingTrait = null;
  render();
};

elements.addSkillButton.addEventListener("click", (event) => {
  event.stopPropagation();
  openTraitForm("skill");
});
elements.addResourceButton.addEventListener("click", (event) => {
  event.stopPropagation();
  openTraitForm("resource");
});
elements.addCharacterButton.addEventListener("click", (event) => {
  event.stopPropagation();
  openTraitForm("character");
});

elements.playSkillForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const didSave = editingTrait?.kind === "skill"
    ? character.updateSkill(editingTrait.index, elements.playSkillName.value, elements.playSkillDescription.value)
    : character.addSkill(elements.playSkillName.value, elements.playSkillDescription.value);
  if (!didSave) return;
  markDirty();
  activeModal = null;
  editingTrait = null;
  elements.playSkillForm.reset();
  render();
});
elements.playResourceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const didSave = editingTrait?.kind === "resource"
    ? character.updateResource(editingTrait.index, elements.playResourceName.value, elements.playResourceDescription.value)
    : character.addResource(elements.playResourceName.value, elements.playResourceDescription.value);
  if (!didSave) return;
  markDirty();
  activeModal = null;
  editingTrait = null;
  elements.playResourceForm.reset();
  render();
});
elements.playCharacterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const didSave = editingTrait?.kind === "character"
    ? character.updateCharacter(editingTrait.index, elements.playCharacterName.value, elements.playCharacterDescription.value, elements.playCharacterType.value)
    : character.addCharacter(elements.playCharacterName.value, elements.playCharacterDescription.value, elements.playCharacterType.value);
  if (!didSave) return;
  markDirty();
  activeModal = null;
  editingTrait = null;
  elements.playCharacterForm.reset();
  render();
});

elements.playSkillCancel.addEventListener("click", (event) => {
  event.stopPropagation();
  activeModal = null;
  editingTrait = editingTrait?.kind === "skill" ? null : editingTrait;
  elements.playSkillForm.reset();
  render();
});
elements.playResourceCancel.addEventListener("click", (event) => {
  event.stopPropagation();
  activeModal = null;
  editingTrait = editingTrait?.kind === "resource" ? null : editingTrait;
  elements.playResourceForm.reset();
  render();
});
elements.playCharacterCancel.addEventListener("click", (event) => {
  event.stopPropagation();
  activeModal = null;
  editingTrait = editingTrait?.kind === "character" ? null : editingTrait;
  elements.playCharacterForm.reset();
  render();
});

document.querySelectorAll("[data-modal-close]").forEach((target) => {
  target.addEventListener("click", () => {
    activeModal = null;
    closeExperienceComposer();
    editingTrait = null;
    resetPlayForms();
    render();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || activeModal === null) return;
  activeModal = null;
  closeExperienceComposer();
  editingTrait = null;
  resetPlayForms();
  render();
});

document.querySelectorAll("[data-card-key]").forEach((card) => {
  card.addEventListener("click", (event) => {
    const interactive = event.target.closest("button, input, textarea, select, label");
    if (interactive && !interactive.hasAttribute("data-card-toggle")) return;
    const key = card.dataset.cardKey;
    if (!key || key === "prompt") return;
    if (collapsedCards.has(key)) collapsedCards.delete(key);
    else collapsedCards.add(key);
    renderCollapsibleCards();
  });
});

const initialize = () => {
  saveStoredVampires(getStoredVampires());
  ensureTestVampireRecord({ Character, serializeCampaignState });
  const vampires = getStoredVampires();
  selectedVampireId = vampires[0]?.id ?? "";
  window.addEventListener("hashchange", () => {
    void handleRouteChange();
  });
  COLLAPSIBLE_SECTIONS.forEach((key) => {
    if (!collapsedCards.has(key) && key !== "memories") collapsedCards.add(key);
  });
  void handleRouteChange();
};

initialize();
