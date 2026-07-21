import { restoreCampaignState } from "./campaign-state.js";
import { Character, MAX_DIARY_MEMORIES, MAX_EXPERIENCES_PER_MEMORY } from "./game.js";
import {
  parsePromptDeck,
} from "./prompt-deck.js";
import {
  createStoredRecord,
  getStoredVampires,
  saveStoredVampires,
  upsertVampireRecord,
} from "./vampire-storage.js";
import { getElements } from "./ui/elements.js";
import { showBook, initDeskInteractions, measureFolds } from "./features/play/desk.js";
import { createMaterialIcon, hydrateStaticIcons } from "./ui/icons.js";
import {
  bindCardToggleEvents,
  bindEscapeKeyHandler,
  bindHashChange,
  bindModalCloseEvents,
} from "./events/global-events.js";
import {
  advanceToNextPromptEntry,
  createPromptState,
  ensurePromptVisit,
  getPromptPanelViewModel,
  normalizeLoadedPromptState,
} from "./features/prompt-flow.js";
import {
  applyScreenVisibility,
  getRouteForScreen,
  updateDocumentTitle,
} from "./navigation.js";
import { parseRouteHash } from "./router.js";
import { renderMenu as renderMenuView } from "./features/menu/rendering.js";
import { renderCreation as renderCreationView, renderStep as renderStepView } from "./features/creation/rendering.js";
import { bindCreationEvents } from "./features/creation/events.js";
import { bindPlayEvents } from "./features/play/events.js";
import { handleRouteChange as handleRouteChangeView } from "./route-handler.js";

const STORAGE_KEY = "1000yo.vampires";
const TEST_VAMPIRE_ID = "preset-test-vampire";
const cleanText = (value = "") => String(value).trim().replace(/\s+/g, " ");
const MIN_MEMORY_TRAITS = 2;

let character = new Character();
let currentStep = 0;
let hasSavedSetup = false;
let currentScreen = "menu";
let selectedVampireId = "";
const selectedLaterTraitIds = new Set();
const selectedCurseTraitIds = new Set();
const pendingExperienceTraitIds = new Set();
let editingTrait = null;
let experienceComposer = { open: true, target: null };
let pendingDiaryMemoryId = "";
let activeModal = null;
const collapsedCards = new Set();
const collapsedRecords = new Set();
const INITIAL_COLLAPSED_CARD_KEYS = ["diary", "characters", "skills", "resources", "marks"];

const promptState = createPromptState();

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

const elements = getElements();

const totalSteps = elements.stepPanels.length;
const createTestVampireRecord = () => {
  const testCharacter = new Character("Test Vampire");
  testCharacter.addMemory("Memory 1");
  testCharacter.addCharacter("Mortal 1", "Description of Mortal 1", "mortal");
  testCharacter.addCharacter("Mortal 2", "Description of Mortal 2", "mortal");
  testCharacter.addCharacter("Mortal 3", "Description of Mortal 3", "mortal");
  testCharacter.addSkill("Skill 1", "Description of Skill 1");
  testCharacter.addSkill("Skill 2", "Description of Skill 2");
  testCharacter.addSkill("Skill 3", "Description of Skill 3");
  testCharacter.addResource("Resource 1", "Description of Resource 1");
  testCharacter.addResource("Resource 2", "Description of Resource 2");
  testCharacter.addResource("Resource 3", "Description of Resource 3");
  const initialTraits = [testCharacter.characters[0]?.id, testCharacter.skills[0]?.id].filter(Boolean);
  testCharacter.addMemory("Experience 1 of Memory 2", initialTraits);
  testCharacter.addMemory("Experience 1 of Memory 3", initialTraits);
  testCharacter.addMemory("Experience 1 of Memory 4", initialTraits);
  testCharacter.addCharacter("Immortal 1", "Description of Immortal 1", "immortal");
  testCharacter.addMark("Mark 1", "Description of Mark 1");
  const curseTraits = [testCharacter.characters[3]?.id, testCharacter.marks[0]?.id].filter(Boolean);
  testCharacter.addMemory("Experience 1 of Memory 5", curseTraits);

  return {
    id: TEST_VAMPIRE_ID,
    updatedAt: new Date().toISOString(),
    isComplete: true,
    data: {
      name: testCharacter.name,
      memories: testCharacter.memories,
      skills: testCharacter.skills,
      resources: testCharacter.resources,
      characters: testCharacter.characters,
      marks: testCharacter.marks,
      diary: testCharacter.diary,
    },
    campaign: {
      currentPrompt: 1,
      visits: [],
    },
    isPreset: true,
  };
};

const loadStoredVampires = () => getStoredVampires(
  safeLocalStorage,
  STORAGE_KEY,
  TEST_VAMPIRE_ID,
  createTestVampireRecord,
);

const persistStoredVampires = (vampires) => saveStoredVampires(safeLocalStorage, STORAGE_KEY, vampires);

const serializeCharacter = (currentCharacter) => ({
  name: currentCharacter.name,
  memorySlots: currentCharacter.memorySlots,
  memories: currentCharacter.memories,
  skills: currentCharacter.skills,
  resources: currentCharacter.resources,
  characters: currentCharacter.characters,
  marks: currentCharacter.marks,
  diary: currentCharacter.diary,
});

const persistCurrentCharacter = () => {
  selectedVampireId = selectedVampireId || crypto.randomUUID();
  const vampires = loadStoredVampires();
  const record = createStoredRecord({
    selectedVampireId,
    character,
    promptState,
    serializeCharacter,
  });
  const nextVampires = upsertVampireRecord(vampires, record);
  persistStoredVampires(nextVampires);
};

const resetPlayState = () => {
  pendingExperienceTraitIds.clear();
  editingTrait = null;
  experienceComposer = { open: true, target: null };
  activeModal = null;
  pendingDiaryMemoryId = "";
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
  elements.playDiaryForm.reset();
  elements.playMemoryForm.reset();
  elements.playMemoryExperienceFields.replaceChildren();
  elements.playCharacterForm.reset();
  elements.playMarkForm.reset();
};

const resetPromptState = () => {
  promptState.currentPrompt = 1;
  promptState.visits = new Map();
};

const setScreen = (screen, { updateRoute = false, replaceRoute = false } = {}) => {
  currentScreen = screen;
  applyScreenVisibility(currentScreen, elements);
  updateDocumentTitle(currentScreen);

  if (updateRoute) {
    const nextRoute = getRouteForScreen(screen, selectedVampireId);
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
  persistCurrentCharacter();
};

const getTraitGroups = () => [
  {
    title: "Mortals",
    options: character.characters
      .filter((entry) => entry.type === "mortal")
      .map((entry) => ({ id: entry.id, label: entry.name, value: entry.name, icon: "person" })),
  },
  {
    title: "Immortals",
    options: character.characters
      .filter((entry) => entry.type === "immortal")
      .map((entry) => ({ id: entry.id, label: entry.name, value: entry.name, icon: "person" })),
  },
  {
    title: "Skills",
    options: character.skills.map((item) => ({ id: item.id, label: item.name, value: item.name, icon: "bolt" })),
  },
  {
    title: "Resources",
    options: character.resources.map((item) => ({ id: item.id, label: item.name, value: item.name, icon: "deployed_code" })),
  },
  {
    title: "Marks",
    options: character.marks.map((item) => ({ id: item.id, label: item.name, value: item.name, icon: "local_fire_department" })),
  },
];

const getSelectedTraitLabels = (selectedIds) => [...selectedIds]
  .map((id) => character.getTraitLabel(id))
  .filter(Boolean);

const syncSelectedTraits = (selectedIds) => {
  const availableIds = new Set(getTraitGroups().flatMap((group) => group.options).map((option) => option.id));
  for (const id of [...selectedIds]) {
    if (!availableIds.has(id)) selectedIds.delete(id);
  }
};

const createEmptyRecord = (message) => {
  const item = document.createElement("li");
  item.className = "empty-note hand";
  item.textContent = message;
  return item;
};

const getRecordCollapseKey = (kind, id) => `${kind}:${id}`;
const isRecordCollapsed = (kind, id) => collapsedRecords.has(getRecordCollapseKey(kind, id));
const setRecordCollapsed = (kind, id, collapsed) => {
  const key = getRecordCollapseKey(kind, id);
  if (collapsed) collapsedRecords.add(key);
  else collapsedRecords.delete(key);
};
const toggleRecordCollapsed = (kind, id) => setRecordCollapsed(kind, id, !isRecordCollapsed(kind, id));

const collapseSettledRecords = () => {
  character.memories.forEach((memory) => {
    if (memory.lost) setRecordCollapsed("memory", memory.id, true);
  });
  character.skills.forEach((item) => {
    if (item.used || item.lost) setRecordCollapsed("skill", item.id, true);
  });
  character.resources.forEach((item) => {
    if (item.used || item.lost) setRecordCollapsed("resource", item.id, true);
  });
  character.characters.forEach((item) => {
    if (item.used || item.lost) setRecordCollapsed("character", item.id, true);
  });
};

const createButton = (label, className, handler, options = {}) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  if (options.icon) button.append(createMaterialIcon(options.icon));
  else button.textContent = options.symbol ?? label;
  button.title = options.title ?? label;
  button.setAttribute("aria-label", options.ariaLabel ?? label);
  if (options.pressed !== undefined) button.setAttribute("aria-pressed", String(Boolean(options.pressed)));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    handler();
  });
  return button;
};


const renderTraitSelector = (container, selectedIds) => {
  container.innerHTML = "";
  const options = getTraitGroups().flatMap((group) => group.options);
  const pills = document.createElement("div");
  pills.className = "trait-pills";
  options.forEach((option) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = selectedIds.has(option.id) ? "record-tag selected-trait trait-select-pill" : "record-tag trait-select-pill";
    pill.setAttribute("aria-pressed", String(selectedIds.has(option.id)));
    pill.append(createMaterialIcon(option.icon, ["record-tag-icon"]), document.createTextNode(option.value));
    pill.addEventListener("click", () => {
      if (selectedIds.has(option.id)) selectedIds.delete(option.id);
      else selectedIds.add(option.id);
      markDirty();
      render();
    });
    pills.append(pill);
  });
  if (options.length) container.append(pills);

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

const renderMenu = () => renderMenuView({
  elements,
  loadStoredVampires,
  loadCharacter,
  resetCreationForms,
  startPlay,
  persistStoredVampires,
  setScreen,
  render,
  getSelectedVampireId: () => selectedVampireId,
  setSelectedVampireId: (value) => {
    selectedVampireId = value;
  },
  testVampireId: TEST_VAMPIRE_ID,
  createMaterialIcon,
});

const getMemoryRecords = (startIndex, endIndexExclusive) => character.memories
  .map((memory, index) => ({ memory, index }))
  .filter(({ index }) => index >= startIndex && index < endIndexExclusive)
  .map(({ memory, index }) => ({
    index,
    title: `Memory ${index + 1}`,
    text: memory.experiences.map((experience) => experience.text).join(" "),
    tags: [...new Set(memory.experiences.flatMap((experience) => experience.traitIds.map((traitId) => character.getTraitLabel(traitId)).filter(Boolean)))],
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

const renderComposerColumn = (title, values = [], highlighted = false) => {
  const column = document.createElement("div");
  column.className = highlighted ? "composer-column composer-column-highlighted" : "composer-column";
  const heading = document.createElement("strong");
  heading.textContent = title;
  column.append(heading);

  const valueWrap = document.createElement("div");
  valueWrap.className = "record-tags";
  if (!values.length) {
    const empty = document.createElement("span");
    empty.className = "record-tag";
    empty.textContent = "None";
    valueWrap.append(empty);
  } else {
    values.forEach((value) => {
      const tag = document.createElement("span");
      tag.className = highlighted ? "record-tag selected-trait" : "record-tag";
      tag.textContent = value;
      valueWrap.append(tag);
    });
  }
  column.append(valueWrap);
  return column;
};

const openExperienceComposer = (target = null) => {
  experienceComposer = { open: true, target };
};

const closeExperienceComposer = () => {
  experienceComposer = { open: true, target: null };
  pendingExperienceTraitIds.clear();
  elements.playExperienceForm.reset();
};

const updatePlayExperienceActionState = ({ hasTarget = false } = {}) => {
  const hasDraft = Boolean(elements.playExperienceText.value.trim()) || pendingExperienceTraitIds.size > 0;
  elements.playExperienceSubmit.disabled = !hasTarget || !hasDraft;
  elements.playExperienceCancel.disabled = !hasDraft;
};

const renderPlayComposer = () => {
  const targetMemoryId = experienceComposer.target;
  const targetIndex = targetMemoryId === null ? null : character.memories.findIndex((memory) => memory.id === targetMemoryId);
  const memory = targetIndex === null ? null : character.memories[targetIndex];
  const hasTarget = Boolean(memory);
  // The composer scrap only appears while writing to a chosen memory.
  elements.playExperienceForm.hidden = !hasTarget;
  elements.playExperienceFormTitle.textContent = hasTarget ? `Writing on Memory ${targetIndex + 1}` : "Add experience";
  elements.playExperienceSubmit.textContent = "write it down";
  updatePlayExperienceActionState({ hasTarget });
  const usedTraits = getTraitGroups()
    .flatMap((group) => group.options)
    .filter((option) => {
      const collection = [
        ...character.characters,
        ...character.skills,
        ...character.resources,
      ];
      return collection.some((item) => item.id === option.id && item.used);
    })
    .map((option) => option.value);
  const lostTraits = getTraitGroups()
    .flatMap((group) => group.options)
    .filter((option) => {
      const collection = [
        ...character.characters,
        ...character.skills,
        ...character.resources,
      ];
      return collection.some((item) => item.id === option.id && item.lost);
    })
    .map((option) => option.value);

  const targetLabel = hasTarget
    ? [`Memory ${targetIndex + 1} (${memory.experiences.length}/${MAX_EXPERIENCES_PER_MEMORY})`]
    : [];
  elements.playComposerColumns.replaceChildren(
    renderComposerColumn("Targeted memory", targetLabel, true),
    renderComposerColumn("Used", usedTraits),
    renderComposerColumn("Lost", lostTraits),
  );
};

// ---------- desk building blocks ----------

const PHOTO_CORNERS = ["tl", "tr", "bl", "br"];
const appendPhotoCorners = (element) => {
  PHOTO_CORNERS.forEach((position) => {
    const corner = document.createElement("i");
    corner.className = `pc ${position}`;
    element.append(corner);
  });
};

const TICK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#4a3826" stroke-width="2.4" stroke-linecap="round"><path d="M5 13 C8 15, 9 18, 10.5 17.5 C13 11, 17 6, 21 4"/></svg>';

const createVerb = (label, handler, { quiet = false } = {}) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = quiet ? "verb quiet" : "verb";
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    handler();
  });
  return button;
};

const moveMemoryToDiaryFlow = (memory) => {
  if (!window.confirm("Copy this Memory into the Diary? Once written there it can gain no new Experiences.")) return;
  if (character.diaryResource) {
    if (!character.moveMemoryToDiary(memory.id)) return;
    markDirty();
    render();
    return;
  }
  pendingDiaryMemoryId = memory.id;
  activeModal = "diary";
  render();
};

const buildMemorySlip = ({ memory, memoryIndex, lost = false }) => {
  const item = document.createElement("li");
  item.id = `play-memory-${memory.id}`;
  item.className = lost ? "slip smoothed" : "slip";
  item.tabIndex = 0;
  appendPhotoCorners(item);

  const title = document.createElement("div");
  title.className = "stitle";
  title.textContent = `Memory ${memoryIndex + 1}`;

  const lines = document.createElement("ul");
  memory.experiences.forEach((experience) => {
    const line = document.createElement("li");
    line.textContent = experience.text;
    lines.append(line);
  });
  const remaining = MAX_EXPERIENCES_PER_MEMORY - memory.experiences.length;
  for (let index = 0; index < remaining; index += 1) {
    const blank = document.createElement("li");
    blank.className = "blank";
    blank.innerHTML = index === 0 && !lost ? "a line remains&hellip;" : "&nbsp;";
    lines.append(blank);
  }

  if (lost) {
    // A smoothed (lost) slip is read flat on the desk floor — no fold mount.
    item.append(title, lines);
  } else {
    // The .slip-body is the fold target: fixed to one mount height at rest,
    // unfolded when the slip is lifted (see desk.js measureFolds).
    const body = document.createElement("div");
    body.className = "slip-body";
    body.append(title, lines);
    item.append(body);
  }

  const verbs = document.createElement("div");
  verbs.className = lost ? "verbs always" : "verbs";
  if (lost) {
    verbs.append(createVerb("smooth it back in", () => {
      character.setMemoryLost(memoryIndex, false);
      markDirty();
      render();
    }));
  } else {
    if (memory.experiences.length >= MAX_EXPERIENCES_PER_MEMORY) {
      const note = document.createElement("span");
      note.className = "hand";
      note.style.cssText = "font-size:1.02rem;color:var(--pen-faint);font-style:italic";
      note.textContent = "full — no line remains";
      verbs.append(note);
    } else {
      verbs.append(createVerb("write here", () => {
        openExperienceComposer(memory.id);
        render();
        elements.playExperienceText.focus();
      }));
    }
    if (!memory.storedInDiary && character.diaryMemories.length < MAX_DIARY_MEMORIES) {
      verbs.append(createVerb("copy into the diary", () => moveMemoryToDiaryFlow(memory)));
    }
    verbs.append(createVerb("rewrite", () => {
      editingTrait = { kind: "memory", index: memoryIndex };
      activeModal = "memory";
      render();
    }, { quiet: true }));
    verbs.append(createVerb("lose it", () => {
      character.setMemoryLost(memoryIndex, true);
      markDirty();
      render();
    }, { quiet: true }));
  }
  item.append(verbs);
  return item;
};

const buildDiaryEntry = ({ memory, memoryIndex }) => {
  const item = document.createElement("li");
  item.id = `play-memory-${memory.id}`;
  item.className = "diary-entry";
  const title = document.createElement("div");
  title.className = "dtitle";
  title.textContent = `Memory ${memoryIndex + 1}`;
  item.append(title);
  memory.experiences.forEach((experience) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = experience.text;
    item.append(paragraph);
  });
  const note = document.createElement("p");
  note.className = "dnote";
  note.textContent = "written forever — this page can hold no more experiences";
  item.append(note);
  return item;
};

const renderDiaryCard = () => {
  // The diary is a real, always-present second book (swapped in from the
  // closed-book prop). Its content shows whatever has been written forever.
  const diaryResource = character.diaryResource;
  elements.diaryDescription.textContent = diaryResource?.description
    ? `${diaryResource.description} (${character.diaryMemories.length}/${MAX_DIARY_MEMORIES})`
    : `Nothing is written here yet (0/${MAX_DIARY_MEMORIES})`;
  elements.diaryMemoryList.innerHTML = "";

  if (!character.diaryMemories.length) {
    elements.diaryMemoryList.append(createEmptyRecord("No memories are stored in the diary."));
    return;
  }

  character.diaryMemories.forEach((memory) => {
    const memoryIndex = character.memories.findIndex((entry) => entry.id === memory.id);
    elements.diaryMemoryList.append(buildDiaryEntry({ memory, memoryIndex }));
  });
};

const buildEmptyMount = () => {
  const slot = document.createElement("li");
  slot.className = "empty-slot";
  appendPhotoCorners(slot);
  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "an empty mount — its memory lies crumpled on the desk";
  slot.append(hint);
  return slot;
};

const renderPlayMemoryList = () => {
  elements.playMemoryList.innerHTML = "";
  elements.playLostMemoryList.innerHTML = "";
  const mountsPage = document.getElementById("play-memory-mounts");
  if (mountsPage) mountsPage.innerHTML = "";

  const nonDiary = character.memories
    .map((memory, index) => ({ memory, index }))
    .filter(({ memory }) => !memory.storedInDiary);
  const activeMemories = nonDiary.filter(({ memory }) => !memory.lost);
  const lostMemories = nonDiary.filter(({ memory }) => memory.lost);

  // Each memory slot is either a held slip or an empty photo-corner mount
  // (remaining capacity is spatial, never a counter). The leaf splits the
  // slots across the two pages: 2 sit at the bottom of the left page (under
  // the explanatory blurb), the rest continue on the right page.
  const LEFT_PAGE_SLOTS = 2;
  const slotCount = Math.max(character.memorySlots, activeMemories.length);
  const rightHost = mountsPage || elements.playMemoryList;
  for (let slot = 0; slot < slotCount; slot += 1) {
    const held = activeMemories[slot];
    const element = held
      ? buildMemorySlip({ memory: held.memory, memoryIndex: held.index })
      : buildEmptyMount();
    (slot < LEFT_PAGE_SLOTS ? elements.playMemoryList : rightHost).append(element);
  }

  // Lost memories become crumpled wads on the desk floor.
  const hasLost = lostMemories.length > 0;
  elements.lostMemoriesCard.hidden = !hasLost;
  const lostExpanded = collapsedCards.has("lost-memories");
  elements.playLostMemoryList.hidden = !lostExpanded;
  elements.lostMemoriesToggle.setAttribute("aria-expanded", String(lostExpanded));
  const wadLabel = elements.lostMemoriesToggle.querySelector(".wlabel");
  if (wadLabel) {
    wadLabel.textContent = lostMemories.length === 1
      ? "one memory, crumpled — sort through it"
      : `${lostMemories.length} memories, crumpled — sort through them`;
  }
  if (hasLost) {
    lostMemories.forEach(({ memory, index }) => {
      elements.playLostMemoryList.append(buildMemorySlip({ memory, memoryIndex: index, lost: true }));
    });
  }
  renderDiaryCard();
};

const traitMeta = (item, kind, selectedForExperience) => {
  const parts = [];
  if (kind === "character") parts.push(item.type === "mortal" ? "mortal" : "immortal");
  if (kind === "resource" && item.stationary) parts.push("stationary");
  if (item.used) parts.push("checked");
  if (item.lost) parts.push("struck out");
  if (selectedForExperience) parts.push("included");
  return parts.join(" · ");
};

const applyTraitUsed = (kind, index, nextUsed) => {
  if (kind === "character") {
    character.setCharacterUsed(index, nextUsed);
    if (nextUsed) character.setCharacterLost(index, false);
  }
  if (kind === "skill") {
    character.setSkillUsed(index, nextUsed);
    if (nextUsed) character.setSkillLost(index, false);
  }
  if (kind === "resource") {
    character.setResourceUsed(index, nextUsed);
    if (nextUsed) character.setResourceLost(index, false);
  }
};

const applyTraitLost = (kind, index, nextLost) => {
  if (kind === "character") {
    character.setCharacterLost(index, nextLost);
    if (nextLost) character.setCharacterUsed(index, false);
  }
  if (kind === "skill") {
    character.setSkillLost(index, nextLost);
    if (nextLost) character.setSkillUsed(index, false);
  }
  if (kind === "resource") {
    character.setResourceLost(index, nextLost);
    if (nextLost) character.setResourceUsed(index, false);
  }
};

const renderTraitList = (listElement, items, kind) => {
  listElement.innerHTML = "";
  if (!items.length) {
    listElement.append(createEmptyRecord(`Nothing written under ${kind}s yet.`));
    return;
  }

  items.forEach((item, index) => {
    const traitId = item.id;
    const selectedForExperience = pendingExperienceTraitIds.has(traitId);
    const entry = document.createElement("li");
    entry.className = ["entry", item.lost ? "gone" : "", selectedForExperience ? "included" : ""].filter(Boolean).join(" ");
    entry.tabIndex = 0;

    const eline = document.createElement("div");
    eline.className = "eline";
    if (kind === "skill" || kind === "resource") {
      const tick = document.createElement("span");
      tick.className = "tickbox";
      if (item.used) tick.innerHTML = TICK_SVG;
      eline.append(tick);
    }
    const name = document.createElement("span");
    name.className = "ename";
    name.textContent = item.name;
    eline.append(name);
    const metaText = traitMeta(item, kind, selectedForExperience);
    if (metaText) {
      const meta = document.createElement("span");
      meta.className = "emeta";
      meta.textContent = metaText;
      eline.append(meta);
    }
    entry.append(eline);

    if (item.description) {
      const note = document.createElement("div");
      note.className = "enote";
      note.textContent = item.description;
      entry.append(note);
    }

    const verbs = document.createElement("div");
    verbs.className = "verbs";

    if (experienceComposer.open) {
      verbs.append(createVerb(selectedForExperience ? "leave out" : "include here", () => {
        togglePendingTrait(traitId);
      }));
    }

    if (kind === "mark") {
      verbs.append(createVerb("rewrite", () => {
        editingTrait = { kind, index };
        activeModal = kind;
        render();
      }, { quiet: true }));
      verbs.append(createVerb("remove", () => {
        character.removeMark(index);
        markDirty();
        render();
      }, { quiet: true }));
    } else {
      verbs.append(createVerb(item.used ? "uncheck" : "check", () => {
        const nextUsed = !item.used;
        applyTraitUsed(kind, index, nextUsed);
        if (nextUsed && experienceComposer.open) pendingExperienceTraitIds.add(traitId);
        markDirty();
        render();
      }));
      if (kind === "resource" && character.diaryResource && character.diaryResource.id === traitId) {
        verbs.append(createVerb("open the diary", () => showBook("diary")));
      }
      verbs.append(createVerb("rewrite", () => {
        editingTrait = { kind, index };
        activeModal = kind;
        render();
      }, { quiet: true }));
      verbs.append(createVerb(item.lost ? "write it back" : "strike out", () => {
        const nextLost = !item.lost;
        applyTraitLost(kind, index, nextLost);
        if (nextLost && experienceComposer.open) pendingExperienceTraitIds.add(traitId);
        markDirty();
        render();
      }, { quiet: true }));
    }

    entry.append(verbs);
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
    elements.playResourceStationary.checked = Boolean(item?.stationary);
  }

  if (kind === "diary") {
    elements.playDiaryForm.hidden = activeModal !== "diary";
  }

  if (kind === "memory") {
    elements.playMemoryForm.hidden = activeModal !== "memory";
    const memory = editingTrait?.kind === "memory" ? character.memories[editingTrait.index] : null;
    elements.playMemoryTitle.textContent = memory ? "Edit memory experiences" : "Edit memory";
    elements.playMemorySubmit.textContent = "Save memory";
    elements.playMemoryExperienceFields.replaceChildren();
    if (!memory) return;
    memory.experiences.forEach((experience, experienceIndex) => {
      const row = document.createElement("div");
      row.className = "stack memory-experience-row";
      const label = document.createElement("label");
      const inputId = `play-memory-experience-${experienceIndex}`;
      label.setAttribute("for", inputId);
      label.textContent = `Experience ${experienceIndex + 1}`;
      const input = document.createElement("textarea");
      input.id = inputId;
      input.name = "memory-experience";
      input.rows = 2;
      input.value = experience.text;
      row.append(label, input);
      elements.playMemoryExperienceFields.append(row);
    });
  }

  if (kind === "character") {
    elements.playCharacterForm.hidden = activeModal !== "character";
    elements.playCharacterTitle.textContent = item ? "Edit character" : "Add character";
    elements.playCharacterSubmit.textContent = item ? "Save character" : "Add character";
    elements.playCharacterName.value = item?.name ?? "";
    elements.playCharacterDescription.value = item?.description ?? "";
    elements.playCharacterType.value = item?.type ?? "mortal";
  }

  if (kind === "mark") {
    elements.playMarkForm.hidden = activeModal !== "mark";
    elements.playMarkTitle.textContent = item ? "Edit mark" : "Add mark";
    elements.playMarkSubmit.textContent = item ? "Save mark" : "Add mark";
    elements.playMarkName.value = item?.name ?? "";
    elements.playMarkDescription.value = item?.description ?? "";
  }
};

const syncActiveModal = () => {
  elements.playTraitModal.hidden = activeModal === null;
  if (activeModal === "skill") {
    elements.playModalTitle.textContent = editingTrait?.kind === "skill" ? "Edit skill" : "Add skill";
    return;
  }
  if (activeModal === "resource") {
    elements.playModalTitle.textContent = editingTrait?.kind === "resource" ? "Edit resource" : "Add resource";
    return;
  }
  if (activeModal === "diary") {
    elements.playModalTitle.textContent = "Create Diary";
    return;
  }
  if (activeModal === "memory") {
    elements.playModalTitle.textContent = "Edit memory";
    return;
  }
  if (activeModal === "character") {
    elements.playModalTitle.textContent = editingTrait?.kind === "character" ? "Edit character" : "Add character";
    return;
  }
  if (activeModal === "mark") {
    elements.playModalTitle.textContent = editingTrait?.kind === "mark" ? "Edit mark" : "Add mark";
  }
};

const renderPlayLists = () => {
  syncActiveModal();
  syncSelectedTraits(pendingExperienceTraitIds);
  renderPlayMemoryList();
  renderTraitList(elements.playSkillList, character.skills, "skill");
  renderTraitList(elements.playResourceList, character.resources, "resource");
  renderTraitList(elements.playCharacterList, character.characters, "character");
  renderTraitList(elements.playMarkList, character.marks, "mark");

  elements.memorySlotsMeta.textContent = `${character.activeMemories.length}/${character.memorySlots}`;
  elements.addMemoryButton.disabled = false;

  renderPlayComposer();
  renderFormState("skill", editingTrait?.kind === "skill" ? character.skills[editingTrait.index] : null);
  renderFormState("resource", editingTrait?.kind === "resource" ? character.resources[editingTrait.index] : null);
  renderFormState("diary");
  renderFormState("memory");
  renderFormState("character", editingTrait?.kind === "character" ? character.characters[editingTrait.index] : null);
  renderFormState("mark", editingTrait?.kind === "mark" ? character.marks[editingTrait.index] : null);

  // Re-measure memory slips against their fixed mount so overflow folds under
  // (creases + fold edge). Runs after layout settles for freshly-built slips.
  requestAnimationFrame(() => measureFolds());
};

const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;

const renderPromptPanel = () => {
  const model = getPromptPanelViewModel(promptState);
  elements.promptButton.disabled = model.disabled;
  elements.promptText.textContent = model.text;
  // Mirror the prompt onto the gutter tab (the mobile filed-sheet preview).
  const promptTabText = document.getElementById("prompt-tab-text");
  if (promptTabText) promptTabText.textContent = model.text;
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
      normalizeLoadedPromptState(promptState);
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
  if (ensurePromptVisit(promptState)) {
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

const renderStep = () => renderStepView({
  elements,
  currentStep,
  totalSteps,
  canAdvanceFromStep,
});

const renderCreation = () => renderCreationView({
  character,
  elements,
  selectedLaterTraitIds,
  selectedCurseTraitIds,
  syncSelectedTraits,
  renderMemoryList,
  renderCharacterList,
  renderDetailList,
  renderTraitSelector,
  hasSavedSetup,
  renderStep,
});

const renderCollapsibleCards = () => {
  document.querySelectorAll("[data-card-key]").forEach((card) => {
    const key = card.dataset.cardKey;
    const content = card.querySelector("[data-card-content]");
    const toggle = card.querySelector("[data-card-toggle]");
    const collapsed = collapsedCards.has(key);
    if (content) content.hidden = collapsed;
    if (toggle) toggle.setAttribute("aria-expanded", String(!collapsed));
  });
};

const renderHero = () => {
  const vampireName = character.name || "Unnamed Vampire";
  elements.heroTitle.textContent = currentScreen === "play" ? vampireName : "1000yo";
  elements.editHeroNameButton.hidden = currentScreen !== "play";
};

const render = () => {
  setScreen(currentScreen);
  renderHero();
  renderMenu();
  renderCreation();
  renderPlayLists();
  renderPromptPanel();
  renderCollapsibleCards();
};

const handleRouteChange = async () => handleRouteChangeView({
  parseRouteHash,
  getHash: () => window.location.hash,
  setScreen,
  render,
  getSelectedVampireId: () => selectedVampireId,
  startNewVampire,
  loadStoredVampires,
  loadCharacter,
  resetCreationForms,
  startPlay,
});

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

const openTraitForm = (kind) => {
  collapsedCards.delete(kind === "character" ? "characters" : `${kind}s`);
  activeModal = kind;
  editingTrait = null;
  render();
};

bindCreationEvents({
  elements,
  getCharacter: () => character,
  markDirty,
  render,
  renderStep,
  getSelectedTraitLabels,
  selectedLaterTraitIds,
  selectedCurseTraitIds,
  minMemoryTraits: MIN_MEMORY_TRAITS,
  saveIdentityStep,
  saveImmortalStep,
  saveMarkStep,
  saveCurseMemoryStep,
  getCurrentStep: () => currentStep,
  setCurrentStep: (value) => {
    currentStep = value;
  },
  totalSteps,
  isStepComplete,
  setHasSavedSetup: (value) => {
    hasSavedSetup = value;
  },
  persistCurrentCharacter,
  startPlay,
  startNewVampire,
});

bindPlayEvents({
  elements,
  promptState,
  rollDie,
  advanceToNextPromptEntry,
  collapseSettledRecords,
  persistCurrentCharacter,
  render,
  collapsedCards,
  setActiveModal: (value) => {
    activeModal = value;
  },
  getCharacter: () => character,
  getExperienceComposer: () => experienceComposer,
  pendingExperienceTraitIds,
  markDirty,
  closeExperienceComposer,
  openTraitForm,
  getEditingTrait: () => editingTrait,
  setEditingTrait: (value) => {
    editingTrait = value;
  },
  getActiveModal: () => activeModal,
  setPendingDiaryMemoryId: (value) => {
    pendingDiaryMemoryId = value;
  },
  getPendingDiaryMemoryId: () => pendingDiaryMemoryId,
  updatePlayExperienceActionState,
});

const closeModalAndResetPlayForms = () => {
  activeModal = null;
  closeExperienceComposer();
  editingTrait = null;
  pendingDiaryMemoryId = "";
  resetPlayForms();
  render();
};

const initialize = () => {
  const vampires = loadStoredVampires();
  selectedVampireId = vampires[0]?.id ?? "";
  INITIAL_COLLAPSED_CARD_KEYS.forEach((key) => collapsedCards.add(key));
  hydrateStaticIcons();
  initDeskInteractions();
  bindModalCloseEvents(closeModalAndResetPlayForms);
  bindEscapeKeyHandler(() => activeModal !== null, closeModalAndResetPlayForms);
  bindCardToggleEvents((key) => {
    if (collapsedCards.has(key)) collapsedCards.delete(key);
    else collapsedCards.add(key);
    renderCollapsibleCards();
  });
  bindHashChange(() => {
    void handleRouteChange();
  });
  void handleRouteChange();
};

initialize();
