import { restoreCampaignState } from "./campaign-state.js";
import { Character, MAX_DIARY_MEMORIES, MAX_EXPERIENCES_PER_MEMORY, MAX_MEMORIES } from "./game.js";
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
let experienceComposer = { open: false, target: "new" };
let pendingDiaryMemoryId = "";
let activeModal = null;
const collapsedCards = new Set();
const collapsedRecords = new Set();

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
  experienceComposer = { open: false, target: "new" };
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

const createInlineIconButton = (label, iconName, className, handler, { pressed = false } = {}) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.append(createMaterialIcon(iconName));
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(Boolean(pressed)));
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

const formatStatusTags = (item, kind) => {
  const tags = [];
  if (kind === "resource" && item.stationary) tags.push("Stationary");
  if (item.used) tags.push("Checked");
  if (item.lost) tags.push("Struck");
  return tags;
};

const getLostMemoryTags = (memory) => {
  if (memory.lostReason === "diary") return ["Lost with Diary"];
  if (memory.lost) return ["Lost from Mind"];
  return [];
};

const renderSelectedTraitPills = () => {
  elements.playSelectedTraits.innerHTML = "";
  const selected = getTraitGroups()
    .flatMap((group) => group.options)
    .filter((option) => pendingExperienceTraitIds.has(option.id));
  if (!selected.length) return;
  selected.forEach((option) => {
    const pill = document.createElement("span");
    pill.className = "record-tag selected-trait";
    pill.append(createMaterialIcon(option.icon, ["record-tag-icon"]), document.createTextNode(option.value));
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
  const targetMemoryId = experienceComposer.target === "new" ? null : experienceComposer.target;
  const targetIndex = targetMemoryId === null ? null : character.memories.findIndex((memory) => memory.id === targetMemoryId);
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

const renderMemoryRecord = ({ memory, memoryIndex, lost = false }) => {
  const item = document.createElement("li");
  item.className = lost ? "record play-memory lost" : "record play-memory";
  if (memory.lost) setRecordCollapsed("memory", memory.id, true);
  const collapsed = isRecordCollapsed("memory", memory.id);

  const body = document.createElement("div");
  body.className = "record-body";

  const titleRow = document.createElement("div");
  titleRow.className = "record-title-row";
  const titleGroup = document.createElement("div");
  titleGroup.className = "record-title-group";
  titleGroup.classList.add("record-title-toggle");
  titleGroup.tabIndex = 0;
  titleGroup.role = "button";
  titleGroup.setAttribute("aria-expanded", String(!collapsed));
  const toggleMemoryCollapsed = () => {
    toggleRecordCollapsed("memory", memory.id);
    render();
  };
  titleGroup.addEventListener("click", toggleMemoryCollapsed);
  titleGroup.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleMemoryCollapsed();
  });
  const title = document.createElement("strong");
  title.textContent = `Memory ${memoryIndex + 1}`;
  titleGroup.append(title);
  titleRow.append(titleGroup);

  body.append(titleRow);
  const details = document.createElement("div");
  details.hidden = collapsed;

  const experienceList = document.createElement("ol");
  experienceList.className = "experience-list";
  memory.experiences.forEach((experience) => {
    const experienceItem = document.createElement("li");
    const text = document.createElement("p");
    text.textContent = experience.text;
    experienceItem.append(text);
    experienceList.append(experienceItem);
  });
  details.append(experienceList);

  const memoryTags = lost ? getLostMemoryTags(memory) : (memory.storedInDiary ? ["In Diary"] : []);
  if (memoryTags.length) {
    const tags = document.createElement("div");
    tags.className = "record-tags";
    memoryTags.forEach((label) => {
      const tag = document.createElement("span");
      tag.className = "record-tag";
      tag.textContent = label;
      tags.append(tag);
    });
    details.append(tags);
  }

  const footer = document.createElement("div");
  footer.className = "record-footer-actions";
  if (!lost && !memory.storedInDiary && memory.experiences.length < MAX_EXPERIENCES_PER_MEMORY) {
    if (character.diaryMemories.length < MAX_DIARY_MEMORIES) {
      footer.append(createButton("Move to Diary", "add-card-button memory-diary-button", () => {
        if (!window.confirm("Move this Memory to the Diary? This cannot be undone. The Memory can no longer gain new Experiences.")) return;
        if (character.diaryResource) {
          if (!character.moveMemoryToDiary(memory.id)) return;
          markDirty();
          render();
          return;
        }
        pendingDiaryMemoryId = memory.id;
        activeModal = "diary";
        render();
      }, {
        icon: "notebook",
        title: "Move to Diary",
      }));
    }
  }
  if (!lost) {
    footer.append(createInlineIconButton(
      "Edit memory experiences",
      "edit",
      "record-inline-button",
      () => {
        memory.experiences.forEach((experience, experienceIndex) => {
          const updatedText = window.prompt(`Edit experience ${experienceIndex + 1}`, experience.text);
          if (updatedText === null) return;
          character.updateMemoryExperience(memoryIndex, experienceIndex, updatedText);
        });
        markDirty();
        render();
      },
    ));
  }
  footer.append(createInlineIconButton(
    lost ? "Restore memory" : "Strike out memory",
    "x",
    "record-inline-button",
    () => {
      character.setMemoryLost(memoryIndex, !memory.lost);
      markDirty();
      render();
    },
    { pressed: lost },
  ));
  details.append(footer);
  body.append(details);
  item.append(body);
  return item;
};

const renderDiaryCard = () => {
  const diaryResource = character.diaryResource;
  elements.diaryCard.hidden = !diaryResource;
  elements.diaryDescription.textContent = diaryResource?.description
    ? `${diaryResource.description} (${character.diaryMemories.length}/${MAX_DIARY_MEMORIES})`
    : `Diary (${character.diaryMemories.length}/${MAX_DIARY_MEMORIES})`;
  elements.diaryMemoryList.innerHTML = "";

  if (!diaryResource) return;
  if (!character.diaryMemories.length) {
    elements.diaryMemoryList.append(createEmptyRecord("No memories are stored in the Diary."));
    return;
  }

  character.diaryMemories.forEach((memory) => {
    const memoryIndex = character.memories.findIndex((entry) => entry.id === memory.id);
    elements.diaryMemoryList.append(renderMemoryRecord({ memory, memoryIndex }));
  });
};

const renderPlayMemoryList = () => {
  elements.playMemoryList.innerHTML = "";
  elements.playLostMemoryList.innerHTML = "";
  elements.lostMemoriesCard.hidden = true;
  elements.playLostMemoryList.hidden = true;
  elements.lostMemoriesToggle.setAttribute("aria-expanded", "false");

  const visibleMemories = character.memories
    .map((memory, index) => ({ memory, index }))
    .filter(({ memory }) => !memory.storedInDiary);

  if (!visibleMemories.length) {
    elements.playMemoryList.append(createEmptyRecord("No active memories."));
  } else {
    visibleMemories.forEach(({ memory, index }) => {
      elements.playMemoryList.append(renderMemoryRecord({ memory, memoryIndex: index, lost: memory.lost }));
    });
  }
  renderDiaryCard();
};

const renderTraitList = (listElement, items, kind) => {
  listElement.innerHTML = "";
  if (!items.length) {
    listElement.append(createEmptyRecord(`No ${kind}s available.`));
    return;
  }

  items.forEach((item, index) => {
    if (item.used || item.lost) setRecordCollapsed(kind, item.id, true);
    const collapsed = isRecordCollapsed(kind, item.id);
    const entry = document.createElement("li");
    const traitId = item.id;
    const selectedForExperience = pendingExperienceTraitIds.has(traitId);
    entry.className = ["record", item.used ? "used" : "", item.lost ? "lost" : ""].filter(Boolean).join(" ");
    if (selectedForExperience) entry.classList.add("tag-target-active");

    const body = document.createElement("div");
    body.className = "record-select";
    body.tabIndex = 0;
    body.role = "button";
    const toggleTagSelection = () => {
      togglePendingTrait(traitId);
    };
    body.addEventListener("click", (event) => {
      if (event.target.closest(".record-inline-button")) return;
      toggleTagSelection();
    });
    body.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest(".record-inline-button")) return;
      event.preventDefault();
      toggleTagSelection();
    });

    const toggleChecked = () => {
      if (kind === "mark") return;
      const nextUsed = !item.used;
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
      markDirty();
      render();
    };
    const toggleStruck = () => {
      if (kind === "mark") return;
      const nextLost = !item.lost;
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
      markDirty();
      render();
    };

    const bodyInner = document.createElement("div");
    bodyInner.className = "record-body";

    const contentColumn = document.createElement("div");
    contentColumn.className = "record-trait-content";
    const titleRow = document.createElement("div");
    titleRow.className = "record-title-row";
    const titleGroup = document.createElement("div");
    titleGroup.className = "record-title-group";

    const tags = formatStatusTags(item, kind);
    if (kind === "character") tags.unshift(item.type === "mortal" ? "Mortal" : "Immortal");
    if (selectedForExperience) tags.unshift("Tagged");
    const hasSubitems = Boolean(item.description || tags.length);
    if (hasSubitems) {
      titleGroup.classList.add("record-title-toggle");
      titleGroup.tabIndex = 0;
      titleGroup.role = "button";
      titleGroup.setAttribute("aria-expanded", String(!collapsed));
      const toggleTraitCollapsed = () => {
        toggleRecordCollapsed(kind, item.id);
        renderPlayLists();
      };
      titleGroup.addEventListener("click", toggleTraitCollapsed);
      titleGroup.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleTraitCollapsed();
      });
    }
    const title = document.createElement("strong");
    title.textContent = item.name;
    titleGroup.append(title);
    titleRow.append(titleGroup);

    contentColumn.append(titleRow);
    const details = document.createElement("div");
    details.hidden = hasSubitems ? collapsed : false;
    if (item.description) {
      const text = document.createElement("p");
      text.textContent = item.description;
      details.append(text);
    }

    if (tags.length) {
      const tagWrap = document.createElement("div");
      tagWrap.className = "record-tags";
      tags.forEach((label) => {
        const tag = document.createElement("span");
        tag.className = label === "Tagged" ? "record-tag selected-trait" : "record-tag";
        tag.textContent = label;
        tagWrap.append(tag);
      });
      details.append(tagWrap);
    }
    if (hasSubitems) contentColumn.append(details);

    const actionRow = document.createElement("div");
    actionRow.className = "record-item-actions";
    actionRow.append(
      createInlineIconButton(selectedForExperience ? `Untag ${kind}` : `Tag ${kind}`, "sell", "record-inline-button", toggleTagSelection, { pressed: selectedForExperience }),
      createInlineIconButton(`Edit ${kind}`, "edit", "record-inline-button", () => {
        editingTrait = { kind, index };
        activeModal = kind;
        render();
      }),
    );
    if (kind === "mark") {
      actionRow.append(createInlineIconButton("Remove mark", "delete", "record-inline-button", () => {
        character.removeMark(index);
        markDirty();
        render();
      }));
    } else {
      actionRow.append(
        createInlineIconButton(item.used ? `Uncheck ${kind}` : `Check ${kind}`, item.used ? "square-check" : "square", "record-inline-button", toggleChecked, { pressed: item.used }),
        createInlineIconButton(item.lost ? `Restore ${kind}` : `Strike out ${kind}`, "x", "record-inline-button", toggleStruck, { pressed: item.lost }),
      );
    }

    contentColumn.append(actionRow);
    bodyInner.append(contentColumn);
    body.append(bodyInner);

    entry.append(body);
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
  if (activeModal === "memory") {
    const memoryIndex = experienceComposer.target === "new"
      ? null
      : character.memories.findIndex((memory) => memory.id === experienceComposer.target);
    elements.playModalTitle.textContent = experienceComposer.target === "new"
      ? "Add memory"
      : `Add experience to Memory ${memoryIndex + 1}`;
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
  if (activeModal === "diary") {
    elements.playModalTitle.textContent = "Create Diary";
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

  elements.playName.textContent = character.name || "Unnamed Vampire";
  elements.memorySlotsMeta.textContent = `${character.activeMemories.length}/${character.memorySlots}`;
  elements.addMemoryButton.disabled = character.activeMemories.length >= character.memorySlots;

  renderPlayComposer();
  renderFormState("skill", editingTrait?.kind === "skill" ? character.skills[editingTrait.index] : null);
  renderFormState("resource", editingTrait?.kind === "resource" ? character.resources[editingTrait.index] : null);
  renderFormState("diary");
  renderFormState("character", editingTrait?.kind === "character" ? character.characters[editingTrait.index] : null);
  renderFormState("mark", editingTrait?.kind === "mark" ? character.marks[editingTrait.index] : null);
};

const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;

const renderPromptPanel = () => {
  const model = getPromptPanelViewModel(promptState);
  elements.promptButton.disabled = model.disabled;
  elements.promptText.textContent = model.text;
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

const render = () => {
  setScreen(currentScreen);
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
  openExperienceComposer,
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
  [
    elements.addMemoryButton,
    elements.addSkillButton,
    elements.addResourceButton,
    elements.addCharacterButton,
    elements.addMarkButton,
  ].forEach((button) => {
    if (!button) return;
    button.replaceChildren(createMaterialIcon("plus"));
  });
  hydrateStaticIcons();
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
