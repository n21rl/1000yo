import { restoreCampaignState } from "./campaign-state.js";
import {
  Character,
  MAX_DIARY_MEMORIES,
  MAX_EXPERIENCES_PER_MEMORY,
  MAX_MEMORIES,
  MIN_IMMORTALS,
  MIN_MARKS,
  MIN_MORTALS,
  MIN_RESOURCES,
  MIN_SKILLS,
} from "./game.js";
import {
  parsePromptDeck,
} from "./prompt-deck.js";
import {
  createStoredRecord,
  getLatestCompleteVampire,
  getLatestIncompleteVampire,
  getStoredVampires,
  saveStoredVampires,
  upsertVampireRecord,
} from "./vampire-storage.js";
import { getElements } from "./ui/elements.js";
import { createMaterialFallbackIcon, hydrateStaticIcons } from "./ui/icons.js";
import { openActionSheet, openAlertDialog, openConfirmDialog, openPromptDialog } from "./ui/dialog.js";
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
  formatPromptStamp,
  getPromptPanelViewModel,
  isPromptResolved,
  normalizeLoadedPromptState,
} from "./features/prompt-flow.js";
import {
  applyScreenVisibility,
  getRouteForScreen,
  updateDocumentTitle,
} from "./navigation.js";
import { parseRouteHash } from "./router.js";
import { renderMenu as renderMenuView } from "./features/menu/rendering.js";
import { bindMenuEvents } from "./features/menu/events.js";
import { renderSaves as renderSavesView } from "./features/saves/rendering.js";
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
let pendingDiaryMemoryId = "";
let activeModal = null;
const collapsedCards = new Set();
const INITIAL_COLLAPSED_CARD_KEYS = ["prompt"];
let activePlayTab = "memories";
let activeTraitSubtab = "characters";
let activeMemoryDetailId = null;
let traitSortRecent = true;

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
  activeMemoryDetailId = null;
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

const openVampireEntry = (vampire) => {
  loadCharacter(vampire);
  resetCreationForms();
  void startPlay();
};

const renameVampireRecord = (vampireId, nextName) => {
  const cleanedName = cleanText(nextName);
  if (!cleanedName) return false;
  if (vampireId === selectedVampireId) {
    if (!character.rename(cleanedName)) return false;
    markDirty();
    return true;
  }
  const vampires = loadStoredVampires();
  if (!vampires.some((entry) => entry.id === vampireId)) return false;
  const updated = vampires.map((entry) => (
    entry.id === vampireId
      ? { ...entry, updatedAt: new Date().toISOString(), data: { ...entry.data, name: cleanedName } }
      : entry
  ));
  persistStoredVampires(updated);
  return true;
};

const startNewVampireFlow = async () => {
  const latestIncomplete = getLatestIncompleteVampire(loadStoredVampires(), TEST_VAMPIRE_ID);
  if (!latestIncomplete) {
    startNewVampire();
    return;
  }
  const displayName = latestIncomplete.data?.name || "Unnamed Vampire";
  const choice = await openActionSheet({
    title: "Unfinished vampire",
    actions: [
      { id: "continue", label: `Continue ${displayName}` },
      { id: "fresh", label: "Start a new vampire" },
    ],
  });
  if (choice === "continue") {
    openVampireEntry(latestIncomplete);
    return;
  }
  if (choice === "fresh") startNewVampire();
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
    pill.textContent = option.value;
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
  listElement.classList.add("wizard-added-list");
  if (!records.length) {
    listElement.append(createEmptyRecord(emptyMessage));
    return;
  }

  records.forEach((record, position) => {
    const item = document.createElement("li");
    item.className = "wizard-added-item";

    const index = document.createElement("span");
    index.className = "wizard-added-index";
    index.textContent = String(position + 1).padStart(2, "0");

    const body = document.createElement("div");
    body.className = "wizard-added-body";

    if (record.title) {
      const title = document.createElement("strong");
      title.className = "wizard-added-title";
      title.textContent = record.title;
      body.append(title);
    }
    if (record.text) {
      const text = document.createElement("p");
      text.className = "wizard-added-text";
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

    item.append(index, body);

    if (removeItem) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "wizard-added-remove";
      removeButton.setAttribute("aria-label", "Remove");
      removeButton.append(createMaterialFallbackIcon("delete"));
      removeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        removeItem(record.index);
        markDirty();
        render();
      });
      item.append(removeButton);
    }

    listElement.append(item);
  });
};

const renderMenu = () => renderMenuView({
  elements,
  loadStoredVampires,
  getLatestCompleteVampire,
  testVampireId: TEST_VAMPIRE_ID,
});

const renderSaves = () => renderSavesView({
  elements,
  loadStoredVampires,
  persistStoredVampires,
  openVampireEntry,
  renameVampire: renameVampireRecord,
  render,
  getSelectedVampireId: () => selectedVampireId,
  setSelectedVampireId: (value) => {
    selectedVampireId = value;
  },
  testVampireId: TEST_VAMPIRE_ID,
  createIcon: createMaterialFallbackIcon,
  openConfirmDialog,
  openActionSheet,
  openPromptDialog,
});

const getMemoryRecords = (startIndex, endIndexExclusive) => character.memories
  .map((memory, index) => ({ memory, index }))
  .filter(({ index }) => index >= startIndex && index < endIndexExclusive)
  .map(({ memory, index }) => ({
    index,
    title: memory.title || `Memory ${memory.createdOrder}`,
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

const closeExperienceComposer = () => {
  pendingExperienceTraitIds.clear();
  elements.playExperienceForm.reset();
};

const updatePlayExperienceActionState = () => {
  const hasDraft = Boolean(elements.playExperienceText.value.trim()) || pendingExperienceTraitIds.size > 0;
  elements.playExperienceSubmit.disabled = !hasDraft;
  elements.playExperienceCancel.disabled = !hasDraft;
};

const openIdentityMenu = async () => {
  const choice = await openActionSheet({
    title: character.name || "Vampire",
    actions: [
      { id: "rename", label: "Rename vampire" },
      { id: "picture", label: "Change picture" },
    ],
  });
  if (choice === "rename") {
    const nextName = await openPromptDialog({ title: "Rename vampire", label: "Name", initialValue: character.name });
    if (nextName === null) return;
    if (!character.rename(nextName)) return;
    markDirty();
    render();
    return;
  }
  if (choice === "picture") {
    await openAlertDialog({ title: "Change picture", body: "Choosing a picture is coming in a later update." });
  }
};

const getMemoryLabel = (memory) => memory.title || `Memory ${memory.createdOrder}`;

const openMemoryMoreMenu = async (memory) => {
  const actions = [{ id: "forget", label: memory.lost ? "Restore" : "Forget" }];
  if (!memory.lost && !memory.storedInDiary && character.diaryMemories.length < MAX_DIARY_MEMORIES) {
    actions.push({ id: "move-diary", label: "Move to Diary" });
  }
  actions.push({ id: "delete", label: "Delete", danger: true });
  const choice = await openActionSheet({ title: getMemoryLabel(memory), actions });

  if (choice === "forget") {
    character.setMemoryLost(character.memories.indexOf(memory), !memory.lost);
    if (activeMemoryDetailId === memory.id) activeMemoryDetailId = null;
    markDirty();
    render();
    return;
  }
  if (choice === "move-diary") {
    if (character.diaryResource) {
      if (!character.moveMemoryToDiary(memory.id)) return;
      if (activeMemoryDetailId === memory.id) activeMemoryDetailId = null;
      markDirty();
      render();
      return;
    }
    pendingDiaryMemoryId = memory.id;
    activeModal = "diary";
    render();
    return;
  }
  if (choice === "delete") {
    const confirmed = await openConfirmDialog({
      title: "Delete this memory?",
      body: "This is not standard play and cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    const index = character.memories.indexOf(memory);
    if (!character.removeMemory(index)) return;
    if (activeMemoryDetailId === memory.id) activeMemoryDetailId = null;
    markDirty();
    render();
  }
};

const renderMemoryRow = (memory, { lost = false } = {}) => {
  const row = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "play-memory-row";
  button.addEventListener("click", () => {
    activeMemoryDetailId = memory.id;
    render();
  });

  const icon = document.createElement("span");
  icon.className = "play-memory-icon";
  icon.append(createMaterialFallbackIcon("menu_book"));

  const info = document.createElement("span");
  info.className = "play-memory-info";
  const name = document.createElement("span");
  name.className = "play-memory-name";
  name.textContent = getMemoryLabel(memory);
  const subtitle = document.createElement("span");
  subtitle.className = "play-memory-subtitle";
  subtitle.textContent = lost
    ? (memory.lostReason === "diary" ? "Lost with Diary" : "Lost from Mind")
    : `${memory.experiences.length} / ${MAX_EXPERIENCES_PER_MEMORY} experiences`;
  info.append(name, subtitle);

  const chevron = document.createElement("span");
  chevron.className = "play-memory-chevron";
  chevron.append(createMaterialFallbackIcon("chevron_right"));

  button.append(icon, info, chevron);
  row.append(button);
  return row;
};

const renderEmptyMemorySlot = () => {
  const row = document.createElement("li");
  const inner = document.createElement("div");
  inner.className = "play-memory-row play-memory-row-empty";
  const icon = document.createElement("span");
  icon.className = "play-memory-icon";
  icon.append(createMaterialFallbackIcon("menu_book"));
  const info = document.createElement("span");
  info.className = "play-memory-info";
  const name = document.createElement("span");
  name.className = "play-memory-name";
  name.textContent = "Empty slot";
  info.append(name);
  inner.append(icon, info);
  row.append(inner);
  return row;
};

const renderMemoriesList = () => {
  elements.playMemoryList.innerHTML = "";
  elements.playLostMemoryList.innerHTML = "";

  const activeMemories = character.activeMemories;
  for (let index = 0; index < character.memorySlots; index += 1) {
    const memory = activeMemories[index];
    elements.playMemoryList.append(memory ? renderMemoryRow(memory) : renderEmptyMemorySlot());
  }

  const lostFromMind = character.memories.filter((memory) => memory.lost && memory.lostReason !== "diary");
  lostFromMind.forEach((memory) => elements.playLostMemoryList.append(renderMemoryRow(memory, { lost: true })));

  elements.memorySlotsMeta.textContent = `${activeMemories.length}/${character.memorySlots}`;
  elements.addMemoryButton.disabled = activeMemories.length >= character.memorySlots;
};

const renderPlayComposer = () => {
  elements.playComposerColumns.innerHTML = "";
  if (!pendingExperienceTraitIds.size) return;

  const allItems = [...character.characters, ...character.skills, ...character.resources, ...character.marks];
  const wrap = document.createElement("div");
  wrap.className = "play-tagged-traits";
  const chipRow = document.createElement("div");
  chipRow.className = "play-tagged-trait-chips";
  [...pendingExperienceTraitIds].forEach((traitId) => {
    const traitLabel = character.getTraitLabel(traitId);
    if (!traitLabel) return;
    const item = allItems.find((entry) => entry.id === traitId);
    const chip = document.createElement("span");
    chip.className = "play-tagged-trait-chip";
    const text = document.createElement("span");
    text.textContent = traitLabel;
    const state = document.createElement("span");
    const isUsed = Boolean(item?.used);
    state.className = isUsed ? "play-tagged-trait-tick" : "play-tagged-trait-cross";
    state.textContent = isUsed ? "✓" : "—";
    chip.append(text, state);
    chipRow.append(chip);
  });
  wrap.append(chipRow);
  elements.playComposerColumns.append(wrap);
};

const renderMemoryDetail = () => {
  const memory = character.memories.find((entry) => entry.id === activeMemoryDetailId);
  if (!memory) {
    activeMemoryDetailId = null;
    return;
  }

  elements.playMemoryDetailTitle.textContent = getMemoryLabel(memory);
  elements.playMemoryExperienceList.innerHTML = "";

  memory.experiences.forEach((experience, experienceIndex) => {
    const item = document.createElement("li");
    item.className = "play-experience-item";

    const index = document.createElement("span");
    index.className = "play-experience-index";
    index.textContent = String(experienceIndex + 1).padStart(2, "0");

    const body = document.createElement("div");
    body.className = "play-experience-body";
    const text = document.createElement("p");
    text.className = "play-experience-text";
    text.textContent = experience.text;
    body.append(text);
    if (experience.prompt) {
      const stamp = document.createElement("span");
      stamp.className = "play-experience-stamp";
      stamp.textContent = `Prompt ${experience.prompt}`;
      body.append(stamp);
    }

    const more = document.createElement("button");
    more.type = "button";
    more.className = "play-experience-more";
    more.setAttribute("aria-label", "Experience options");
    more.append(createMaterialFallbackIcon("more_vert"));
    more.addEventListener("click", async () => {
      const choice = await openActionSheet({ actions: [{ id: "edit", label: "Edit" }] });
      if (choice !== "edit") return;
      editingTrait = { kind: "memory", index: character.memories.indexOf(memory) };
      activeModal = "memory";
      render();
    });

    item.append(index, body, more);
    elements.playMemoryExperienceList.append(item);
  });

  const canAddExperience = !memory.lost && !memory.storedInDiary && memory.experiences.length < MAX_EXPERIENCES_PER_MEMORY;
  elements.playExperienceForm.hidden = !canAddExperience;
  if (canAddExperience) renderPlayComposer();
};

const renderMemoriesTab = () => {
  const showDetail = activeMemoryDetailId !== null;
  elements.playMemoryListView.hidden = showDetail;
  elements.playMemoryDetailView.hidden = !showDetail;
  elements.playHeaderBack.hidden = !showDetail;
  elements.playHamburgerButton.hidden = showDetail;
  elements.playMemoryDetailMoreButton.hidden = !showDetail;
  elements.playAvatarButton.hidden = showDetail;

  if (showDetail) {
    renderMemoryDetail();
    return;
  }
  renderMemoriesList();
};

const renderDiaryTab = () => {
  const diaryResource = character.diaryResource;
  const lostDiaryMemories = character.memories.filter((memory) => memory.lost && memory.lostReason === "diary");

  elements.diaryEmptyState.hidden = Boolean(diaryResource || lostDiaryMemories.length);
  elements.diaryCard.hidden = !diaryResource;
  if (diaryResource) {
    elements.diaryDescription.textContent = diaryResource.description
      ? `${diaryResource.description} (${character.diaryMemories.length}/${MAX_DIARY_MEMORIES})`
      : `Diary (${character.diaryMemories.length}/${MAX_DIARY_MEMORIES})`;
    elements.diaryMemoryList.innerHTML = "";
    if (!character.diaryMemories.length) {
      elements.diaryMemoryList.append(createEmptyRecord("No memories are stored in the Diary."));
    } else {
      character.diaryMemories.forEach((memory) => elements.diaryMemoryList.append(renderMemoryRow(memory)));
    }
  }

  elements.lostDiaryCard.hidden = !lostDiaryMemories.length;
  if (lostDiaryMemories.length) {
    elements.lostDiaryMemoryList.innerHTML = "";
    lostDiaryMemories.forEach((memory) => elements.lostDiaryMemoryList.append(renderMemoryRow(memory, { lost: true })));
  }
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

const TRAIT_KIND_LABEL = { character: "character", skill: "skill", resource: "resource", mark: "mark" };

const getTraitIconName = (kind, item) => {
  if (kind === "character") return item.type === "immortal" ? "skull" : "person";
  if (kind === "skill") return "bolt";
  if (kind === "resource") return "deployed_code";
  return "local_fire_department";
};

const sortTraits = (items) => {
  if (!traitSortRecent) return items;
  return [...items].sort((a, b) => (b.createdOrder ?? 0) - (a.createdOrder ?? 0));
};

const removeTraitByKind = (kind, index) => {
  if (kind === "character") return character.removeCharacter(index);
  if (kind === "skill") return character.removeSkill(index);
  if (kind === "resource") return character.removeResource(index);
  return character.removeMark(index);
};

const openTraitMoreMenu = async (kind, item, index) => {
  const choice = await openActionSheet({
    title: item.name,
    actions: [
      { id: "edit", label: "Edit" },
      { id: "delete", label: "Delete", danger: true },
      { id: "icon", label: "Icon" },
    ],
  });
  if (choice === "edit") {
    editingTrait = { kind, index };
    activeModal = kind;
    render();
    return;
  }
  if (choice === "delete") {
    const confirmed = await openConfirmDialog({
      title: `Delete this ${TRAIT_KIND_LABEL[kind]}?`,
      body: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    if (!removeTraitByKind(kind, index)) return;
    markDirty();
    render();
    return;
  }
  if (choice === "icon") {
    await openAlertDialog({ title: "Custom icons", body: "Choosing a custom icon is coming in a later update." });
  }
};

const renderTraitRow = (kind, item, index) => {
  const li = document.createElement("li");
  li.className = item.lost ? "play-trait-row play-trait-row-struck" : "play-trait-row";

  const icon = document.createElement("span");
  icon.className = "play-trait-icon";
  icon.append(createMaterialFallbackIcon(getTraitIconName(kind, item)));

  const body = document.createElement("div");
  body.className = "play-trait-body";
  const titleRow = document.createElement("div");
  titleRow.className = "play-trait-title-row";
  const name = document.createElement("span");
  name.className = "play-trait-name";
  name.textContent = item.name;
  titleRow.append(name);
  if (kind === "character") {
    const typeLabel = document.createElement("span");
    typeLabel.className = "play-trait-type-label";
    typeLabel.textContent = item.type;
    titleRow.append(typeLabel);
  }
  if (kind === "resource" && item.stationary) {
    const stationaryLabel = document.createElement("span");
    stationaryLabel.className = "play-trait-type-label";
    stationaryLabel.textContent = "stationary";
    titleRow.append(stationaryLabel);
  }
  body.append(titleRow);
  if (item.description) {
    const desc = document.createElement("p");
    desc.className = "play-trait-description";
    desc.textContent = item.description;
    body.append(desc);
  }

  if (item.lost) {
    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "play-trait-restore";
    restore.textContent = "Restore";
    restore.addEventListener("click", () => {
      applyTraitLost(kind, index, false);
      markDirty();
      render();
    });
    li.append(icon, body, restore);
    return li;
  }

  const actions = document.createElement("div");
  actions.className = "play-trait-actions";

  if (kind !== "mark") {
    const checkButton = document.createElement("button");
    checkButton.type = "button";
    checkButton.className = "play-trait-action";
    checkButton.setAttribute("aria-pressed", String(item.used));
    checkButton.append(createMaterialFallbackIcon(item.used ? "square-check" : "square"), document.createTextNode(item.used ? "Checked" : "Check"));
    checkButton.addEventListener("click", () => {
      const nextUsed = !item.used;
      applyTraitUsed(kind, index, nextUsed);
      if (nextUsed) pendingExperienceTraitIds.add(item.id);
      markDirty();
      render();
    });
    actions.append(checkButton);

    const strikeButton = document.createElement("button");
    strikeButton.type = "button";
    strikeButton.className = "play-trait-action";
    strikeButton.textContent = "Strike out";
    strikeButton.addEventListener("click", () => {
      applyTraitLost(kind, index, true);
      markDirty();
      render();
    });
    actions.append(strikeButton);
  }

  const moreButton = document.createElement("button");
  moreButton.type = "button";
  moreButton.className = "play-trait-action";
  moreButton.textContent = "More";
  moreButton.addEventListener("click", () => openTraitMoreMenu(kind, item, index));
  actions.append(moreButton);

  li.append(icon, body, actions);
  return li;
};

const renderTraitPanel = (kind, listElement, items) => {
  listElement.innerHTML = "";
  const active = sortTraits(items.filter((item) => !item.lost));
  const struckOut = items.filter((item) => item.lost);

  if (!active.length && !struckOut.length) {
    listElement.append(createEmptyRecord(`No ${kind}s yet.`));
    return;
  }

  active.forEach((item) => listElement.append(renderTraitRow(kind, item, items.indexOf(item))));

  if (struckOut.length) {
    const label = document.createElement("li");
    label.className = "play-trait-panel-label";
    label.textContent = "Struck Out";
    listElement.append(label);
    struckOut.forEach((item) => listElement.append(renderTraitRow(kind, item, items.indexOf(item))));
  }
};

const renderTraitsTab = () => {
  elements.traitSubtabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.traitSubtab === activeTraitSubtab);
  });
  elements.traitPanels.forEach((panel) => {
    panel.hidden = panel.dataset.traitPanel !== activeTraitSubtab;
  });
  elements.traitSortButton.classList.toggle("active", traitSortRecent);

  renderTraitPanel("character", elements.playCharacterList, character.characters);
  renderTraitPanel("skill", elements.playSkillList, character.skills);
  renderTraitPanel("resource", elements.playResourceList, character.resources);
  renderTraitPanel("mark", elements.playMarkList, character.marks);
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
    elements.playDiarySubmit.textContent = pendingDiaryMemoryId ? "Create Diary and Move Memory" : "Create Diary";
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

const renderPlayHeader = () => {
  elements.playHeaderName.textContent = character.name || "Unnamed Vampire";
};

const renderBottomTabs = () => {
  elements.playBottomTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.playTab === activePlayTab);
  });
  elements.playTabMemories.hidden = activePlayTab !== "memories";
  elements.playTabTraits.hidden = activePlayTab !== "traits";
  elements.playTabDiary.hidden = activePlayTab !== "diary";
};

const renderPlayLists = () => {
  syncActiveModal();
  syncSelectedTraits(pendingExperienceTraitIds);

  renderPlayHeader();
  renderBottomTabs();
  renderMemoriesTab();
  renderTraitsTab();
  renderDiaryTab();

  renderFormState("skill", editingTrait?.kind === "skill" ? character.skills[editingTrait.index] : null);
  renderFormState("resource", editingTrait?.kind === "resource" ? character.resources[editingTrait.index] : null);
  renderFormState("diary");
  renderFormState("memory");
  renderFormState("character", editingTrait?.kind === "character" ? character.characters[editingTrait.index] : null);
  renderFormState("mark", editingTrait?.kind === "mark" ? character.marks[editingTrait.index] : null);
};

const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;

const renderPromptPanel = () => {
  const resolved = isPromptResolved(promptState, character);
  const model = getPromptPanelViewModel(promptState, { resolved });
  elements.promptButton.disabled = model.disabled || model.rollDisabled;
  elements.promptText.textContent = model.text;
  elements.promptStatusLabel.textContent = model.statusLabel;
  const stamp = formatPromptStamp(promptState.currentPrompt, promptState.visits.get(promptState.currentPrompt) ?? 1);
  elements.promptStampLabel.textContent = model.disabled ? "" : `PROMPT ${stamp.toUpperCase()}`;
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

const getFirstIncompleteStepIndex = () => {
  for (let index = 0; index < totalSteps; index += 1) {
    if (!isStepComplete(index)) return index;
  }
  return 0;
};

const startPlay = async () => {
  if (!character.isReadyForPromptOne()) {
    currentStep = getFirstIncompleteStepIndex();
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
  () => character.mortalCount >= MIN_MORTALS,
  () => character.skills.length >= MIN_SKILLS,
  () => character.resources.length >= MIN_RESOURCES,
  () => character.memories.length >= MAX_MEMORIES - 1,
  () => character.immortalCount >= MIN_IMMORTALS,
  () => character.marks.length >= MIN_MARKS,
  () => character.memories.length >= MAX_MEMORIES,
];

const stepCanAdvance = [
  () => true,
  () => stepRequirements[1](),
  () => stepRequirements[2](),
  () => stepRequirements[3](),
  () => stepRequirements[4](),
  () => true,
  () => true,
  () => character.memories.length >= MAX_MEMORIES || (character.memories.length === MAX_MEMORIES - 1 && Boolean(cleanText(elements.memoryCurse.value)) && selectedCurseTraitIds.size >= MIN_MEMORY_TRAITS),
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
  maxMemories: MAX_MEMORIES,
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
  renderSaves();
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
  if (character.immortalCount >= MIN_IMMORTALS) return true;
  markDirty();
  const didSave = character.addCharacter(elements.immortalName.value, elements.immortalDescription.value, "immortal");
  if (didSave) persistCurrentCharacter();
  return didSave;
};

const saveMarkStep = () => {
  if (character.marks.length >= MIN_MARKS) return true;
  markDirty();
  const didSave = character.addMark(elements.markInput.value, elements.markDescription.value);
  if (didSave) persistCurrentCharacter();
  return didSave;
};

const saveCurseMemoryStep = () => {
  if (character.memories.length >= MAX_MEMORIES) return true;
  if (character.memories.length !== MAX_MEMORIES - 1) return false;
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
  setScreen,
  openIdentityMenu,
});

bindMenuEvents({
  elements,
  startNewVampireFlow,
  openVampireEntry,
  loadStoredVampires,
  getLatestCompleteVampire,
  testVampireId: TEST_VAMPIRE_ID,
  setScreen,
  render,
});

bindPlayEvents({
  elements,
  promptState,
  rollDie,
  advanceToNextPromptEntry,
  persistCurrentCharacter,
  render,
  setActiveModal: (value) => {
    activeModal = value;
  },
  getCharacter: () => character,
  pendingExperienceTraitIds,
  markDirty,
  closeExperienceComposer,
  openTraitForm,
  getEditingTrait: () => editingTrait,
  setEditingTrait: (value) => {
    editingTrait = value;
  },
  setPendingDiaryMemoryId: (value) => {
    pendingDiaryMemoryId = value;
  },
  getPendingDiaryMemoryId: () => pendingDiaryMemoryId,
  updatePlayExperienceActionState,
  getActivePlayTab: () => activePlayTab,
  setActivePlayTab: (value) => {
    activePlayTab = value;
  },
  getActiveTraitSubtab: () => activeTraitSubtab,
  setActiveTraitSubtab: (value) => {
    activeTraitSubtab = value;
  },
  getActiveMemoryDetailId: () => activeMemoryDetailId,
  setActiveMemoryDetailId: (value) => {
    activeMemoryDetailId = value;
  },
  toggleTraitSortRecent: () => {
    traitSortRecent = !traitSortRecent;
  },
  loadStoredVampires,
  persistStoredVampires,
  setScreen,
  getSelectedVampireId: () => selectedVampireId,
  setSelectedVampireId: (value) => {
    selectedVampireId = value;
  },
  testVampireId: TEST_VAMPIRE_ID,
  openMemoryMoreMenu,
  openIdentityMenu,
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
  [
    elements.addMemoryButton,
    elements.addSkillButton,
    elements.addResourceButton,
    elements.addCharacterButton,
    elements.addMarkButton,
    elements.createDiaryButton,
  ].forEach((button) => {
    if (!button) return;
    button.prepend(createMaterialFallbackIcon("add"));
  });
  if (elements.newVampireButton) {
    elements.newVampireButton.replaceChildren(
      createMaterialFallbackIcon("add"),
      document.createTextNode("New Vampire"),
    );
  }
  if (elements.menuSavesButton) {
    elements.menuSavesButton.replaceChildren(
      createMaterialFallbackIcon("sticky_note_2"),
      document.createTextNode("Saves"),
    );
  }
  document.querySelectorAll(".play-memory-more-icon, .play-tab-heading-more-icon").forEach((el) => el.replaceChildren(createMaterialFallbackIcon("more_vert")));
  document.querySelectorAll(".play-hamburger-icon").forEach((el) => el.replaceChildren(createMaterialFallbackIcon("menu")));
  document.querySelectorAll(".play-header-avatar-icon").forEach((el) => el.replaceChildren(createMaterialFallbackIcon("person")));
  document.querySelectorAll(".play-trait-sort-icon").forEach((el) => el.replaceChildren(createMaterialFallbackIcon("sort")));
  document.querySelector("#trait-view-list-button .play-trait-view-icon")?.replaceChildren(createMaterialFallbackIcon("menu"));
  document.querySelector("#trait-view-grid-button .play-trait-view-icon")?.replaceChildren(createMaterialFallbackIcon("grid_view"));
  [...document.querySelectorAll(".play-bottom-tab")].forEach((tab, index) => {
    const iconName = ["menu_book", "cognition", "book_2"][index];
    tab.querySelector(".play-bottom-tab-icon")?.replaceChildren(createMaterialFallbackIcon(iconName));
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
