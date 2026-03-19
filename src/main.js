import { restoreCampaignState, serializeCampaignState } from "./campaign-state.js";
import { Character, MAX_EXPERIENCES_PER_MEMORY, MAX_MEMORIES } from "./game.js";

const STORAGE_KEY = "1000yo.vampires";
const LEGACY_VAMPIRE_ROUTE_PREFIX = "1000yo.";
const TEST_VAMPIRE_NAME = "Test Vampire";
const cleanText = (value = "") => String(value).trim().replace(/\s+/g, " ");
const cleanPromptText = (value = "") => String(value).replace(/\s+/g, " ").trim();
const normalizeCharacterName = (value = "") => cleanText(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/['’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const getVampireRouteId = (name = "") => {
  const normalizedName = normalizeCharacterName(name);
  return normalizedName;
};
const TEST_VAMPIRE_ID = getVampireRouteId(TEST_VAMPIRE_NAME);
const MIN_MEMORY_TRAITS = 2;
const COLLAPSIBLE_SECTIONS = ["prompt", "memories", "characters", "skills", "resources", "marks"];

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
const testIdentityMemory = "I was born to a fading noble house and learned early that affection is transactional.";
const testImmortal = ["Baron Severin", "The immortal who dragged me into unlife."];
const testMark = [
  "My shadow lags a heartbeat behind me.",
  "It is most visible in torchlight and unsettles the faithful.",
];
const testCurseMemory = "I pursued Baron Severin onto the chapel roof and rose again after the mortal blow.";

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
  addMemoryButton: document.querySelector("#add-memory-button"),
  playExperienceForm: document.querySelector("#play-experience-form"),
  playExperienceFormTitle: document.querySelector("#play-experience-form-title"),
  playExperienceText: document.querySelector("#play-experience-text"),
  playSelectedTraits: document.querySelector("#play-selected-traits"),
  playExperienceSubmit: document.querySelector("#play-experience-submit"),
  playExperienceCancel: document.querySelector("#play-experience-cancel"),
  playMemoryHint: document.querySelector("#play-memory-hint"),
  addSkillButton: document.querySelector("#add-skill-button"),
  playSkillForm: document.querySelector("#play-skill-form"),
  playSkillTitle: document.querySelector("#play-skill-form-title"),
  playSkillName: document.querySelector("#play-skill-name"),
  playSkillDescription: document.querySelector("#play-skill-description"),
  playSkillSubmit: document.querySelector("#play-skill-submit"),
  playSkillCancel: document.querySelector("#play-skill-cancel"),
  addResourceButton: document.querySelector("#add-resource-button"),
  playResourceForm: document.querySelector("#play-resource-form"),
  playResourceTitle: document.querySelector("#play-resource-form-title"),
  playResourceName: document.querySelector("#play-resource-name"),
  playResourceDescription: document.querySelector("#play-resource-description"),
  playResourceSubmit: document.querySelector("#play-resource-submit"),
  playResourceCancel: document.querySelector("#play-resource-cancel"),
  addCharacterButton: document.querySelector("#add-character-button"),
  playCharacterForm: document.querySelector("#play-character-form"),
  playCharacterTitle: document.querySelector("#play-character-form-title"),
  playCharacterName: document.querySelector("#play-character-name"),
  playCharacterDescription: document.querySelector("#play-character-description"),
  playCharacterType: document.querySelector("#play-character-type"),
  playCharacterSubmit: document.querySelector("#play-character-submit"),
  playCharacterCancel: document.querySelector("#play-character-cancel"),
  playTraitModal: document.querySelector("#play-trait-modal"),
  playModalTitle: document.querySelector("#play-modal-title"),
};

const totalSteps = elements.stepPanels.length;
const SCREEN_TITLES = {
  menu: "Start Menu",
  creation: "Vampire Creation",
  play: "Play",
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

const findStoredVampireByNormalizedName = (name, excludingId = "") => {
  const normalizedName = normalizeCharacterName(name);
  if (!normalizedName) return null;
  return getStoredVampires().find((entry) => {
    if (entry.id === excludingId) return false;
    return normalizeCharacterName(entry.data?.name) === normalizedName;
  }) ?? null;
};

const parseRouteId = (routeId = "") => {
  let decoded = "";
  try {
    decoded = cleanText(decodeURIComponent(routeId));
  } catch (error) {
    decoded = cleanText(routeId);
  }
  if (!decoded) return "";
  if (decoded.startsWith(LEGACY_VAMPIRE_ROUTE_PREFIX)) {
    return decoded.slice(LEGACY_VAMPIRE_ROUTE_PREFIX.length);
  }
  return decoded;
};

const findStoredVampireByRouteId = (routeId = "") => {
  const parsedRouteId = parseRouteId(routeId);
  if (!parsedRouteId) return null;
  const vampires = getStoredVampires();
  return vampires.find((entry) => entry.id === routeId)
    ?? vampires.find((entry) => entry.id === parsedRouteId)
    ?? vampires.find((entry) => normalizeCharacterName(entry.data?.name) === normalizeCharacterName(parsedRouteId))
    ?? null;
};

const isDuplicateVampireName = (name, excludingId = "") => Boolean(
  findStoredVampireByNormalizedName(name, excludingId),
);

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

const serializeCharacter = (targetCharacter = character) => ({
  name: targetCharacter.name,
  memories: targetCharacter.memories,
  skills: targetCharacter.skills,
  resources: targetCharacter.resources,
  characters: targetCharacter.characters,
  marks: targetCharacter.marks,
});

const createStoredRecord = () => ({
  id: selectedVampireId || crypto.randomUUID(),
  updatedAt: new Date().toISOString(),
  isComplete: character.isReadyForPromptOne(),
  data: serializeCharacter(),
  campaign: serializeCampaignState(promptState),
});

const createTestVampireCharacter = () => {
  const testCharacter = new Character(TEST_VAMPIRE_NAME);
  testCharacter.addMemory(testIdentityMemory);

  sampleMortals.forEach(([name, description]) => {
    testCharacter.addCharacter(name, description, "mortal");
  });
  sampleSkills.forEach(([name, description]) => {
    testCharacter.addSkill(name, description);
  });
  sampleResources.forEach(([name, description]) => {
    testCharacter.addResource(name, description);
  });
  sampleLaterMemories.forEach((memoryText, index) => {
    const mortalName = sampleMortals[index % sampleMortals.length]?.[0] ?? "Mortal";
    const skillName = sampleSkills[index % sampleSkills.length]?.[0] ?? "Skill";
    testCharacter.addMemory(memoryText, [`Mortal: ${mortalName}`, `Skill: ${skillName}`]);
  });

  testCharacter.addCharacter(testImmortal[0], testImmortal[1], "immortal");
  testCharacter.addMark(testMark[0], testMark[1]);
  testCharacter.addMemory(testCurseMemory, [`Immortal: ${testImmortal[0]}`, `Mark: ${testMark[0]}`]);
  return testCharacter;
};

const createTestVampireRecord = () => {
  const testCharacter = createTestVampireCharacter();
  return {
    id: TEST_VAMPIRE_ID,
    updatedAt: new Date().toISOString(),
    isComplete: testCharacter.isReadyForPromptOne(),
    data: serializeCharacter(testCharacter),
    campaign: serializeCampaignState({
      currentPrompt: 1,
      visits: new Map([[1, 1]]),
    }),
  };
};

const ensureTestVampireRecord = () => {
  const vampires = getStoredVampires();
  if (vampires.some((entry) => entry.id === TEST_VAMPIRE_ID)) return;
  const existingTestNameIndex = vampires.findIndex((entry) => normalizeCharacterName(entry.data?.name) === normalizeCharacterName(TEST_VAMPIRE_NAME));
  if (existingTestNameIndex >= 0) {
    const existing = vampires[existingTestNameIndex];
    vampires[existingTestNameIndex] = {
      ...existing,
      id: TEST_VAMPIRE_ID,
      data: {
        ...(existing?.data ?? {}),
        name: cleanText(existing?.data?.name) || TEST_VAMPIRE_NAME,
      },
    };
    saveStoredVampires(vampires);
    return;
  }
  vampires.unshift(createTestVampireRecord());
  saveStoredVampires(vampires);
};

const startTestVampire = async () => {
  ensureTestVampireRecord();
  const testVampire = getStoredVampires().find((entry) => entry.id === TEST_VAMPIRE_ID);
  if (!testVampire) return;
  loadCharacter(testVampire);
  resetCreationForms();
  await startPlay(true);
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
  const record = createStoredRecord();
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
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    handler();
  });
  return button;
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
      record.tags.forEach((tagText) => {
        const tag = document.createElement("span");
        tag.className = "record-tag";
        tag.textContent = tagText;
        tags.append(tag);
      });
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
  ensureTestVampireRecord();
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
    if (selectedForExperience) entry.classList.add("tag-target-active");

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
  renderRecords(
    elements.playMarkList,
    character.marks.map((item, index) => ({ title: item.name, text: item.description, index })),
    null,
    "No marks available.",
  );

  [...elements.playMarkList.querySelectorAll(".record")].forEach((entry, index) => {
    const traitId = `mark-${index}`;
    if (pendingExperienceTraitIds.has(traitId)) entry.classList.add("tag-target-active");
    entry.addEventListener("click", () => togglePendingTrait(traitId));
  });

  renderPlayComposer();
  renderFormState("skill", editingTrait?.kind === "skill" ? character.skills[editingTrait.index] : null);
  renderFormState("resource", editingTrait?.kind === "resource" ? character.resources[editingTrait.index] : null);
  renderFormState("character", editingTrait?.kind === "character" ? character.characters[editingTrait.index] : null);
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
      persistCurrentCharacter();
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
    persistCurrentCharacter();
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
    const collapsed = collapsedCards.has(key);
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
elements.autofillButton.addEventListener("click", () => {
  void startTestVampire();
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
  const target = clampPromptIndex(promptState.currentPrompt + delta);
  moveToNextAvailablePrompt(target);
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
    if (!key) return;
    if (collapsedCards.has(key)) collapsedCards.delete(key);
    else collapsedCards.add(key);
    renderCollapsibleCards();
  });
});

const initialize = () => {
  ensureTestVampireRecord();
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
