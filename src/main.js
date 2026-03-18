import { Character, MAX_EXPERIENCES_PER_MEMORY, MAX_MEMORIES } from "./game.js";

const STORAGE_KEY = "1000yo.vampires";
const cleanText = (value = "") => String(value).trim().replace(/\s+/g, " ");
const cleanPromptText = (value = "") => String(value).replace(/\s+/g, " ").trim();
const MIN_MEMORY_TRAITS = 2;
const COLLAPSIBLE_SECTIONS = ["prompt", "memories", "characters", "skills", "resources", "marks"];

let character = new Character();
let currentStep = 0;
let hasSavedSetup = false;
let currentScreen = "menu";
let selectedVampireId = "";
const selectedLaterTraitIds = new Set();
const selectedCurseTraitIds = new Set();
const playExperienceTraitIds = new Set();
let selectedMemoryTarget = "new";
let editingTrait = null;
const collapsedCards = new Set(["characters", "skills", "resources", "marks"]);
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

const promptState = {
  deck: [],
  isLoading: false,
  loadError: "",
  currentPrompt: 1,
  visits: new Map(),
};

const safeLocalStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.error(error);
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
};

const elements = {
  menuScreen: document.querySelector("#menu-screen"),
  creationScreen: document.querySelector("#creation-screen"),
  playScreen: document.querySelector("#play-screen"),
  vampireList: document.querySelector("#vampire-list"),
  menuEmptyState: document.querySelector("#menu-empty-state"),
  newVampireButton: document.querySelector("#new-vampire-button"),
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
  playNameHeading: document.querySelector("#play-name-heading"),
  playMemoryList: document.querySelector("#play-memory-list"),
  playCharacterList: document.querySelector("#play-character-list"),
  playSkillList: document.querySelector("#play-skill-list"),
  playResourceList: document.querySelector("#play-resource-list"),
  playMarkList: document.querySelector("#play-mark-list"),
  promptButton: document.querySelector("#next-prompt-button"),
  promptText: document.querySelector("#prompt-text"),
  playExperienceForm: document.querySelector("#play-experience-form"),
  playExperienceText: document.querySelector("#play-experience-text"),
  playMemoryTarget: document.querySelector("#play-memory-target"),
  playExperienceTraits: document.querySelector("#play-experience-traits"),
  playMemoryHint: document.querySelector("#play-memory-hint"),
  playSkillForm: document.querySelector("#play-skill-form"),
  playSkillTitle: document.querySelector("#play-skill-form-title"),
  playSkillName: document.querySelector("#play-skill-name"),
  playSkillDescription: document.querySelector("#play-skill-description"),
  playSkillSubmit: document.querySelector("#play-skill-submit"),
  playSkillCancel: document.querySelector("#play-skill-cancel"),
  playResourceForm: document.querySelector("#play-resource-form"),
  playResourceTitle: document.querySelector("#play-resource-form-title"),
  playResourceName: document.querySelector("#play-resource-name"),
  playResourceDescription: document.querySelector("#play-resource-description"),
  playResourceSubmit: document.querySelector("#play-resource-submit"),
  playResourceCancel: document.querySelector("#play-resource-cancel"),
  playCharacterForm: document.querySelector("#play-character-form"),
  playCharacterTitle: document.querySelector("#play-character-form-title"),
  playCharacterName: document.querySelector("#play-character-name"),
  playCharacterDescription: document.querySelector("#play-character-description"),
  playCharacterType: document.querySelector("#play-character-type"),
  playCharacterSubmit: document.querySelector("#play-character-submit"),
  playCharacterCancel: document.querySelector("#play-character-cancel"),
};

const totalSteps = elements.stepPanels.length;
const SCREEN_TITLES = {
  menu: "Start Menu",
  creation: "Vampire Creation",
  play: "Play",
};

const bindRemove = (button, handler) => {
  button.addEventListener("click", handler);
  return button;
};

const getStoredVampires = () => {
  try {
    const rawValue = safeLocalStorage.getItem(STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

const saveStoredVampires = (vampires) => safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(vampires));

const serializeCharacter = () => ({
  name: character.name,
  memories: character.memories,
  skills: character.skills,
  resources: character.resources,
  characters: character.characters,
  marks: character.marks,
});

const createStoredRecord = () => ({
  id: selectedVampireId || crypto.randomUUID(),
  updatedAt: new Date().toISOString(),
  isComplete: character.isReadyForPromptOne(),
  data: serializeCharacter(),
});

const persistCurrentCharacter = () => {
  selectedVampireId = selectedVampireId || crypto.randomUUID();
  const vampires = getStoredVampires();
  const record = createStoredRecord();
  const existingIndex = vampires.findIndex((entry) => entry.id === record.id);

  if (existingIndex >= 0) vampires.splice(existingIndex, 1, record);
  else vampires.push(record);

  saveStoredVampires(vampires);
};

const loadCharacter = (storedCharacter) => {
  character = Character.from(storedCharacter?.data ?? {});
  selectedVampireId = storedCharacter?.id ?? "";
  hasSavedSetup = Boolean(storedCharacter?.isComplete && character.isReadyForPromptOne());
  currentStep = 0;
  selectedLaterTraitIds.clear();
  selectedCurseTraitIds.clear();
  playExperienceTraitIds.clear();
  selectedMemoryTarget = "new";
  editingTrait = null;
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
  elements.playExperienceForm?.reset();
  elements.playSkillForm?.reset();
  elements.playResourceForm?.reset();
  elements.playCharacterForm?.reset();
  playExperienceTraitIds.clear();
  selectedMemoryTarget = "new";
  editingTrait = null;
};

const resetPromptState = () => {
  promptState.currentPrompt = 1;
  promptState.visits = new Map();
};

const getRouteForScreen = (screen) => {
  if (screen === "creation") return "#/create";
  if (screen === "play" && selectedVampireId) return `#/play/${selectedVampireId}`;
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
  resetPlayForms();
  setScreen("creation", { updateRoute: true });
  render();
};

const markDirty = () => {
  hasSavedSetup = false;
  persistCurrentCharacter();
};

const formatTimestamp = (isoString) => {
  if (!isoString) return "Unsaved";
  const value = new Date(isoString);
  return Number.isNaN(value.getTime()) ? "Unsaved" : value.toLocaleString();
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
  const availableIds = new Set(getTraitGroups().flatMap((group) => group.options).map((option) => option.id));
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

const createEmptyRecord = (message) => {
  const item = document.createElement("li");
  item.className = "record record-empty";
  const body = document.createElement("div");
  body.className = "record-body";
  const text = document.createElement("p");
  text.className = "supporting";
  text.textContent = message;
  body.append(text);
  item.append(body);
  return item;
};

const createButton = (label, className, handler) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
};

const renderTraitSelector = (container, selectedIds) => {
  if (!container) return;
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
        if (selectedIds.has(option.id)) selectedIds.delete(option.id);
        else selectedIds.add(option.id);
        render();
      });
      pills.append(pill);
    }

    section.append(title, pills);
    container.append(section);
  }
};

const renderRecords = (listElement, records, removeItem = null, emptyMessage = "No entries yet.") => {
  listElement.innerHTML = "";
  if (!records.length) {
    listElement.append(createEmptyRecord(emptyMessage));
    return;
  }

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

    if (removeItem) {
      const removeButton = createButton("Remove", "ghost-button", () => {
        removeItem(record.index);
        markDirty();
        render();
      });
      item.append(body, removeButton);
    } else {
      item.append(body);
    }

    listElement.append(item);
  }
};

const renderMenu = () => {
  const vampires = getStoredVampires();
  elements.vampireList.innerHTML = "";
  elements.menuEmptyState.hidden = vampires.length > 0;

  for (const vampire of vampires) {
    const item = document.createElement("li");
    item.className = "record vampire-record";
    const body = document.createElement("button");
    body.type = "button";
    body.className = "vampire-option";
    body.addEventListener("click", () => {
      loadCharacter(vampire);
      resetCreationForms();
      resetPromptState();
      void startPlay(true);
    });

    const title = document.createElement("strong");
    title.textContent = vampire.data?.name || "Unnamed Vampire";
    const text = document.createElement("p");
    text.textContent = `Updated ${formatTimestamp(vampire.updatedAt)}`;
    body.append(title, text);

    const actions = document.createElement("div");
    actions.className = "menu-record-actions";
    const deleteButton = createButton("Delete", "ghost-button menu-delete-button", () => {
      const displayName = vampire.data?.name || "this vampire";
      if (!window.confirm(`Delete ${displayName}? This cannot be undone.`)) return;
      const remaining = getStoredVampires().filter((entry) => entry.id !== vampire.id);
      saveStoredVampires(remaining);
      if (selectedVampireId === vampire.id) selectedVampireId = "";
      setScreen("menu", { updateRoute: true });
      render();
    });

    actions.append(deleteButton);
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
  renderRecords(listElement, getMemoryRecords(startIndex, endIndexExclusive), (index) => character.removeMemory(index), "No memories yet.");
};

const renderCharacterList = (listElement, type) => {
  const records = character.characters
    .map((entry, index) => ({ index, entry }))
    .filter(({ entry }) => entry.type === type)
    .map(({ index, entry }) => ({ index, title: entry.name, text: entry.description }));
  renderRecords(listElement, records, (index) => character.removeCharacter(index), "No characters yet.");
};

const renderDetailList = (listElement, items, removeItem) => {
  const records = items.map((item, index) => ({ index, title: item.name, text: item.description }));
  renderRecords(listElement, records, removeItem);
};

const getMemoryTargetOptions = () => {
  const options = [{ value: "new", label: `New memory (${character.memories.length}/${MAX_MEMORIES})`, disabled: character.memories.length >= MAX_MEMORIES }];
  character.memories.forEach((memory, index) => {
    options.push({
      value: String(index),
      label: `Memory ${index + 1} (${memory.experiences.length}/${MAX_EXPERIENCES_PER_MEMORY})${memory.lost ? " — struck out" : ""}`,
      disabled: memory.lost || memory.experiences.length >= MAX_EXPERIENCES_PER_MEMORY,
    });
  });
  return options;
};

const updateMemoryTargetControl = () => {
  const options = getMemoryTargetOptions();
  elements.playMemoryTarget.innerHTML = "";
  const validValues = new Set();

  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    element.disabled = option.disabled;
    elements.playMemoryTarget.append(element);
    if (!option.disabled) validValues.add(option.value);
  }

  if (!validValues.has(selectedMemoryTarget)) selectedMemoryTarget = validValues.has("new") ? "new" : [...validValues][0] ?? "new";
  elements.playMemoryTarget.value = selectedMemoryTarget;
  elements.playMemoryHint.textContent = selectedMemoryTarget === "new"
    ? `Create a fresh memory if you still have fewer than ${MAX_MEMORIES}.`
    : `Add this experience to an existing memory until it reaches ${MAX_EXPERIENCES_PER_MEMORY} experiences.`;
};

const formatStatusTags = (item, kind) => {
  const tags = [];
  if (item.used) tags.push("Used");
  if (item.lost) tags.push(kind === "character" ? "Dead" : "Lost");
  return tags;
};

const appendActionButtons = (actions, buttons) => {
  for (const button of buttons) actions.append(button);
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
      if (experience.traits.length) {
        const tags = document.createElement("div");
        tags.className = "record-tags";
        experience.traits.forEach((trait) => {
          const tag = document.createElement("span");
          tag.className = "record-tag";
          tag.textContent = trait;
          tags.append(tag);
        });
        experienceItem.append(tags);
      }
      experienceList.append(experienceItem);
    });
    body.append(experienceList);

    const actions = document.createElement("div");
    actions.className = "record-actions";
    appendActionButtons(actions, [
      createButton(memory.lost ? "Restore" : "Strike out", "ghost-button small-button", () => {
        character.setMemoryLost(memoryIndex, !memory.lost);
        markDirty();
        render();
      }),
      createButton("Remove", "ghost-button small-button", () => {
        character.removeMemory(memoryIndex);
        markDirty();
        render();
      }),
    ]);

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
    entry.className = item.lost ? "record lost" : "record";
    const body = document.createElement("div");
    body.className = "record-body";
    const title = document.createElement("strong");
    title.textContent = item.name;
    body.append(title);

    if (item.description) {
      const text = document.createElement("p");
      text.textContent = item.description;
      body.append(text);
    }

    const tags = formatStatusTags(item, kind);
    if (kind === "character") tags.unshift(item.type === "mortal" ? "Mortal" : "Immortal");
    if (tags.length) {
      const tagWrap = document.createElement("div");
      tagWrap.className = "record-tags";
      tags.forEach((label) => {
        const tag = document.createElement("span");
        tag.className = "record-tag";
        tag.textContent = label;
        tagWrap.append(tag);
      });
      body.append(tagWrap);
    }

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
      renderPlayForms();
    });

    const removeButton = createButton("Remove", "ghost-button small-button", () => {
      if (kind === "character") character.removeCharacter(index);
      if (kind === "skill") character.removeSkill(index);
      if (kind === "resource") character.removeResource(index);
      markDirty();
      render();
    });

    appendActionButtons(actions, [toggleUsed, toggleLost, editButton, removeButton]);
    entry.append(body, actions);
    listElement.append(entry);
  });
};

const renderPlayForms = () => {
  const skillEditing = editingTrait?.kind === "skill" ? character.skills[editingTrait.index] : null;
  elements.playSkillTitle.textContent = skillEditing ? "Edit skill" : "Add skill";
  elements.playSkillSubmit.textContent = skillEditing ? "Save skill" : "Add skill";
  elements.playSkillCancel.hidden = !skillEditing;
  elements.playSkillName.value = skillEditing?.name ?? "";
  elements.playSkillDescription.value = skillEditing?.description ?? "";

  const resourceEditing = editingTrait?.kind === "resource" ? character.resources[editingTrait.index] : null;
  elements.playResourceTitle.textContent = resourceEditing ? "Edit resource" : "Add resource";
  elements.playResourceSubmit.textContent = resourceEditing ? "Save resource" : "Add resource";
  elements.playResourceCancel.hidden = !resourceEditing;
  elements.playResourceName.value = resourceEditing?.name ?? "";
  elements.playResourceDescription.value = resourceEditing?.description ?? "";

  const characterEditing = editingTrait?.kind === "character" ? character.characters[editingTrait.index] : null;
  elements.playCharacterTitle.textContent = characterEditing ? "Edit character" : "Add character";
  elements.playCharacterSubmit.textContent = characterEditing ? "Save character" : "Add character";
  elements.playCharacterCancel.hidden = !characterEditing;
  elements.playCharacterName.value = characterEditing?.name ?? "";
  elements.playCharacterDescription.value = characterEditing?.description ?? "";
  elements.playCharacterType.value = characterEditing?.type ?? "mortal";
};

const renderPlayLists = () => {
  elements.playNameHeading.textContent = character.name || "Unnamed Vampire";
  renderPlayMemoryList();
  renderTraitList(elements.playSkillList, character.skills, "skill");
  renderTraitList(elements.playResourceList, character.resources, "resource");
  renderTraitList(elements.playCharacterList, character.characters, "character");
  renderRecords(
    elements.playMarkList,
    character.marks.map((item) => ({ title: item.name, text: item.description })),
    null,
    "No marks available.",
  );
  syncSelectedTraits(playExperienceTraitIds);
  renderTraitSelector(elements.playExperienceTraits, playExperienceTraitIds);
  updateMemoryTargetControl();
  renderPlayForms();
};

const parseCsv = (csvText = "") => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = String(csvText).replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char === "\r") continue;
    field += char;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((candidate) => candidate.some((value) => cleanText(value)));
};

const parsePromptDeck = (csvText) => {
  const rows = parseCsv(csvText);
  if (!rows.length) return [];
  const [firstRow, ...remainingRows] = rows;
  const hasHeader = firstRow.slice(0, 3).map((value) => cleanPromptText(value).toLowerCase()).join("|") === "a|b|c";
  const dataRows = hasHeader ? remainingRows : rows;
  return dataRows
    .map((row) => ({ a: cleanPromptText(row[0] ?? ""), b: cleanPromptText(row[1] ?? ""), c: cleanPromptText(row[2] ?? "") }))
    .filter((prompt) => Boolean(prompt.a || prompt.b || prompt.c));
};

const getPromptEntry = (prompt, visitCount) => {
  if (!prompt) return "";
  if (visitCount === 1) return prompt.a;
  if (visitCount === 2) return prompt.b;
  if (visitCount === 3) return prompt.c;
  return "";
};

const hasPromptEntryForVisit = (prompt, visitCount) => Boolean(getPromptEntry(prompt, visitCount));
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;
const clampPromptIndex = (index) => (!promptState.deck.length ? 1 : Math.max(1, Math.min(index, promptState.deck.length)));

const moveToNextAvailablePrompt = (targetIndex) => {
  if (!promptState.deck.length) return { prompt: 1, visit: 0 };
  let nextIndex = clampPromptIndex(targetIndex);
  while (nextIndex <= promptState.deck.length) {
    const prompt = promptState.deck[nextIndex - 1];
    const visitCount = (promptState.visits.get(nextIndex) ?? 0) + 1;
    if (hasPromptEntryForVisit(prompt, visitCount)) {
      promptState.visits.set(nextIndex, visitCount);
      promptState.currentPrompt = nextIndex;
      return { prompt: nextIndex, visit: visitCount };
    }
    promptState.visits.set(nextIndex, visitCount);
    nextIndex += 1;
  }
  return { prompt: promptState.currentPrompt, visit: promptState.visits.get(promptState.currentPrompt) ?? 1 };
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

const loadPromptDeck = async () => {
  if (promptState.deck.length || promptState.isLoading) return;
  promptState.isLoading = true;
  promptState.loadError = "";
  renderPromptPanel();
  try {
    const response = await fetch("/refs/prompts.csv");
    if (!response.ok) throw new Error(`Could not load prompts (${response.status}).`);
    const csvText = await response.text();
    promptState.deck = parsePromptDeck(csvText);
    if (!promptState.deck.length) promptState.loadError = "No prompts were found in refs/prompts.csv.";
  } catch (error) {
    promptState.loadError = "Unable to load prompt data from refs/prompts.csv.";
    console.error(error);
  } finally {
    promptState.isLoading = false;
    if (promptState.deck.length) {
      promptState.currentPrompt = clampPromptIndex(promptState.currentPrompt);
      if (!promptState.visits.has(promptState.currentPrompt)) promptState.visits.set(promptState.currentPrompt, 1);
    }
    render();
  }
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
  }
  render();
  await loadPromptDeck();
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
  elements.nextButton.hidden = false;
  elements.nextButton.textContent = currentStep === totalSteps - 1 ? "Save" : "Next";
  elements.nextButton.disabled = !canAdvanceFromStep(currentStep);
};

const renderCreation = () => {
  syncSelectedTraits(selectedLaterTraitIds);
  syncSelectedTraits(selectedCurseTraitIds);
  elements.nameInput.value = character.name;
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
    const toggle = card.querySelector("[data-card-toggle]");
    const collapsed = collapsedCards.has(key);
    if (content) content.hidden = collapsed;
    if (toggle) toggle.textContent = collapsed ? "Open" : "Collapse";
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
  const storedCharacter = getStoredVampires().find((entry) => entry.id === vampireId);
  if (!storedCharacter) {
    setScreen("menu", { updateRoute: true, replaceRoute: true });
    render();
    return;
  }
  loadCharacter(storedCharacter);
  resetCreationForms();
  resetPromptState();
  await startPlay(true);
};

const saveIdentityStep = () => {
  markDirty();
  character.rename(elements.nameInput.value);
  if (character.memories.length === 0) {
    if (!character.addMemory(elements.identityMemoryInput.value)) return false;
    elements.identityMemoryInput.value = "";
  }
  persistCurrentCharacter();
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

const autofillCurrentStep = () => {
  markDirty();
  if (currentStep === 0) {
    if (!cleanText(elements.nameInput.value)) {
      elements.nameInput.value = "Test Vampire";
      character.rename(elements.nameInput.value);
    }
    if (!cleanText(elements.identityMemoryInput.value) && character.memories.length === 0) {
      elements.identityMemoryInput.value = "I was born to a fading noble house and learned early that affection is transactional.";
    }
    renderStep();
    return;
  }
  if (currentStep === 1) {
    while (character.mortalCount < 3) {
      const [name, description] = sampleMortals[character.mortalCount] ?? [`Mortal ${character.mortalCount + 1}`, "A mortal tied to my earliest years."];
      character.addCharacter(name, description, "mortal");
    }
    persistCurrentCharacter();
    render();
    return;
  }
  if (currentStep === 2) {
    while (character.skills.length < 3) {
      const [name, description] = sampleSkills[character.skills.length] ?? [`Skill ${character.skills.length + 1}`, "A practiced talent from mortal life."];
      character.addSkill(name, description);
    }
    persistCurrentCharacter();
    render();
    return;
  }
  if (currentStep === 3) {
    while (character.resources.length < 3) {
      const [name, description] = sampleResources[character.resources.length] ?? [`Resource ${character.resources.length + 1}`, "A useful possession I can still rely on."];
      character.addResource(name, description);
    }
    persistCurrentCharacter();
    render();
    return;
  }
  if (currentStep === 4) {
    while (character.memories.length < 4) {
      const sampleIndex = character.memories.length - 1;
      selectAutofillTraits(selectedLaterTraitIds);
      character.addMemory(sampleLaterMemories[sampleIndex] ?? `Another memory ${character.memories.length + 1}.`, getSelectedTraitLabels(selectedLaterTraitIds));
    }
    selectedLaterTraitIds.clear();
    persistCurrentCharacter();
    render();
    return;
  }
  if (currentStep === 5) {
    if (!cleanText(elements.immortalName.value) && character.immortalCount === 0) elements.immortalName.value = "Baron Severin";
    if (!cleanText(elements.immortalDescription.value) && character.immortalCount === 0) elements.immortalDescription.value = "The immortal who dragged me into unlife.";
    renderStep();
    return;
  }
  if (currentStep === 6) {
    if (!cleanText(elements.markInput.value) && character.marks.length === 0) elements.markInput.value = "My shadow lags a heartbeat behind me.";
    if (!cleanText(elements.markDescription.value) && character.marks.length === 0) elements.markDescription.value = "It is most visible in torchlight and unsettles the faithful.";
    renderStep();
    return;
  }
  if (currentStep === 7) {
    if (!cleanText(elements.memoryCurse.value) && character.memories.length === 4) elements.memoryCurse.value = "I pursued Baron Severin onto the chapel roof and rose again after the mortal blow.";
    if (selectedCurseTraitIds.size < MIN_MEMORY_TRAITS) selectAutofillTraits(selectedCurseTraitIds);
    render();
  }
};

elements.newVampireButton.addEventListener("click", () => startNewVampire());
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
elements.autofillButton.addEventListener("click", () => autofillCurrentStep());
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
  const from = promptState.currentPrompt;
  const target = clampPromptIndex(from + delta);
  moveToNextAvailablePrompt(target);
  renderPromptPanel();
});

elements.playMemoryTarget.addEventListener("change", () => {
  selectedMemoryTarget = elements.playMemoryTarget.value;
  renderPlayLists();
});

elements.playExperienceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const memoryIndex = selectedMemoryTarget === "new" ? null : Number(selectedMemoryTarget);
  const didSave = character.addMemory(elements.playExperienceText.value, getSelectedTraitLabels(playExperienceTraitIds), memoryIndex);
  if (!didSave) return;
  markDirty();
  elements.playExperienceForm.reset();
  playExperienceTraitIds.clear();
  selectedMemoryTarget = "new";
  render();
});

elements.playSkillForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const didSave = editingTrait?.kind === "skill"
    ? character.updateSkill(editingTrait.index, elements.playSkillName.value, elements.playSkillDescription.value)
    : character.addSkill(elements.playSkillName.value, elements.playSkillDescription.value);
  if (!didSave) return;
  markDirty();
  editingTrait = editingTrait?.kind === "skill" ? null : editingTrait;
  if (editingTrait?.kind !== "skill") elements.playSkillForm.reset();
  editingTrait = null;
  render();
});

elements.playResourceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const didSave = editingTrait?.kind === "resource"
    ? character.updateResource(editingTrait.index, elements.playResourceName.value, elements.playResourceDescription.value)
    : character.addResource(elements.playResourceName.value, elements.playResourceDescription.value);
  if (!didSave) return;
  markDirty();
  editingTrait = null;
  render();
});

elements.playCharacterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const didSave = editingTrait?.kind === "character"
    ? character.updateCharacter(editingTrait.index, elements.playCharacterName.value, elements.playCharacterDescription.value, elements.playCharacterType.value)
    : character.addCharacter(elements.playCharacterName.value, elements.playCharacterDescription.value, elements.playCharacterType.value);
  if (!didSave) return;
  markDirty();
  editingTrait = null;
  render();
});

elements.playSkillCancel.addEventListener("click", () => {
  editingTrait = null;
  renderPlayForms();
});
elements.playResourceCancel.addEventListener("click", () => {
  editingTrait = null;
  renderPlayForms();
});
elements.playCharacterCancel.addEventListener("click", () => {
  editingTrait = null;
  renderPlayForms();
});

document.querySelectorAll("[data-card-toggle]").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const card = toggle.closest("[data-card-key]");
    const key = card?.dataset.cardKey;
    if (!key) return;
    if (collapsedCards.has(key)) collapsedCards.delete(key);
    else collapsedCards.add(key);
    renderCollapsibleCards();
  });
});

const initialize = () => {
  const vampires = getStoredVampires();
  selectedVampireId = vampires[0]?.id ?? "";
  window.addEventListener("hashchange", () => {
    void handleRouteChange();
  });
  COLLAPSIBLE_SECTIONS.forEach((key) => {
    if (!collapsedCards.has(key) && key !== "prompt" && key !== "memories") collapsedCards.add(key);
  });
  void handleRouteChange();
};

initialize();
