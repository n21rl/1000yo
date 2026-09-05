const DEFAULT_MEMORY_SLOTS = 5;
const MAX_EXPERIENCES_PER_MEMORY = 3;
const MAX_DIARY_MEMORIES = 4;
const MIN_SKILLS = 3;
const MIN_RESOURCES = 3;
const MIN_MORTALS = 3;
const MIN_IMMORTALS = 1;
const MIN_MARKS = 1;
const CHARACTER_TYPES = new Set(["mortal", "immortal"]);

const cleanText = (value = "") => String(value).trim().replace(/\s+/g, " ");

const ROMAN = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

/* Memories are numbered by the order they were created, which never
   changes as others are forgotten — so the numeral is a stable name for
   a memory's age, not its position in the list. */
/* Striking words inside an Experience (prompts 39a, 39b). The rulebook
   is specific that a struck trait "stays readable because you may refer
   back to it later or even restore it" — so a struck word is marked, not
   deleted. The mark lives inside the sentence itself, which keeps an
   Experience a single string: nothing else in the app, in storage, or in
   an export has to learn a new shape, and there are no character offsets
   to fall out of sync when the sentence is edited later. */
export const STRIKE_MARK = "~~";

export const splitExperienceText = (text = "") =>
  String(text)
    .split(/(\s+)/)
    .map((chunk) => {
      if (/^\s+$/.test(chunk) || !chunk) return { text: chunk, space: true };
      const struck = /^~~.+~~$/.test(chunk);
      return { text: struck ? chunk.slice(2, -2) : chunk, struck, space: false };
    })
    .filter((part) => part.text !== "");

export const toggleExperienceWord = (text = "", wordIndex) => {
  let seen = -1;
  return String(text)
    .split(/(\s+)/)
    .map((chunk) => {
      if (/^\s+$/.test(chunk) || !chunk) return chunk;
      seen += 1;
      if (seen !== wordIndex) return chunk;
      return /^~~.+~~$/.test(chunk) ? chunk.slice(2, -2) : `~~${chunk}~~`;
    })
    .join("");
};

export const toRoman = (value) => {
  let remaining = Math.trunc(Number(value));
  if (!Number.isFinite(remaining) || remaining < 1) return "";
  return ROMAN.reduce((out, [amount, numeral]) => {
    while (remaining >= amount) {
      out += numeral;
      remaining -= amount;
    }
    return out;
  }, "");
};
const createId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const buildRequirement = (label, count, minimum) => ({
  label,
  count,
  minimum,
  met: count >= minimum,
});

const cleanOrder = (value) => (Number.isFinite(value) ? value : null);

const createTrackableItem = (item = {}, prefix = "trait") => ({
  id: cleanText(item?.id) || createId(prefix),
  name: cleanText(item?.name),
  description: cleanText(item?.description),
  used: Boolean(item?.used),
  lost: Boolean(item?.lost),
  createdOrder: cleanOrder(item?.createdOrder),
  usedOrder: cleanOrder(item?.usedOrder),
});

const createResource = (item = {}) => ({
  ...createTrackableItem(item, "resource"),
  stationary: Boolean(item?.stationary),
});

const createMark = (item = {}) => ({
  id: cleanText(item?.id) || createId("mark"),
  name: cleanText(item?.name),
  description: cleanText(item?.description),
  createdOrder: cleanOrder(item?.createdOrder),
});

const createExperience = (experience = {}, traitLookup = new Map()) => {
  const traitIds = [
    ...(Array.isArray(experience?.traitIds) ? experience.traitIds : []),
    ...(Array.isArray(experience?.traits) ? experience.traits : []),
  ];

  return {
    text: cleanText(experience?.text),
    prompt: cleanText(experience?.prompt),
    traitIds: traitIds
      .map((traitId) => {
        const cleanedId = cleanText(traitId);
        if (!cleanedId) return "";
        return traitLookup.get(cleanedId) ?? "";
      })
      .filter(Boolean),
  };
};

const createMemory = (memory = {}, traitLookup = new Map()) => {
  const experiences = Array.isArray(memory?.experiences)
    ? memory.experiences.map((experience) => createExperience(experience, traitLookup)).filter((entry) => Boolean(entry.text))
    : [];

  return {
    id: cleanText(memory?.id) || createId("memory"),
    title: cleanText(memory?.title),
    experiences: experiences.slice(0, MAX_EXPERIENCES_PER_MEMORY),
    lost: Boolean(memory?.lost),
    storedInDiary: Boolean(memory?.storedInDiary),
    lostReason: cleanText(memory?.lostReason),
    createdOrder: cleanOrder(memory?.createdOrder),
  };
};

const createDiary = (diary = {}, resources = []) => {
  const resourceId = cleanText(diary?.resourceId);
  const memoryIds = Array.isArray(diary?.memoryIds)
    ? diary.memoryIds.map((memoryId) => cleanText(memoryId)).filter(Boolean).slice(0, MAX_DIARY_MEMORIES)
    : [];

  if (!resourceId || !memoryIds.length) return null;

  const resource = resources.find((item) => item.id === resourceId);
  if (!resource || cleanText(resource.name).toLowerCase() !== "diary") return null;

  return { resourceId, memoryIds };
};

const parseMemorySlots = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_MEMORY_SLOTS;
  return parsed;
};

export class Character {
  #orderCounter = 0;

  constructor(name = "") {
    this.name = cleanText(name);
    this.memorySlots = DEFAULT_MEMORY_SLOTS;
    this.memories = [];
    this.skills = [];
    this.resources = [];
    this.characters = [];
    this.marks = [];
    this.diary = null;
  }

  static from(data = {}) {
    const character = new Character(data.name);
    character.memorySlots = parseMemorySlots(data.memorySlots);
    character.skills = Array.isArray(data.skills)
      ? data.skills.map((item) => createTrackableItem(item, "skill")).filter((item) => Boolean(item.name))
      : [];
    character.resources = Array.isArray(data.resources)
      ? data.resources.map((item) => createResource(item)).filter((item) => Boolean(item.name))
      : [];
    character.characters = Array.isArray(data.characters)
      ? data.characters
        .map((entry) => ({
          ...createTrackableItem(entry, "character"),
          type: CHARACTER_TYPES.has(cleanText(entry?.type).toLowerCase())
            ? cleanText(entry?.type).toLowerCase()
            : null,
        }))
        .filter((entry) => Boolean(entry.name) && Boolean(entry.type))
      : [];
    character.marks = Array.isArray(data.marks)
      ? data.marks.map(createMark).filter((item) => Boolean(item.name))
      : [];

    const traitLookup = character.#buildTraitLookup();
    character.memories = Array.isArray(data.memories)
      ? data.memories
        .map((memory) => {
          if (Array.isArray(memory?.experiences)) return createMemory(memory, traitLookup);

          if (memory?.text) {
            return createMemory({
              id: memory.id,
              experiences: [{
                text: memory.text,
                traitIds: Array.isArray(memory?.traitIds) ? memory.traitIds : [],
                traits: Array.isArray(memory?.traits) ? memory.traits : [],
              }],
              lost: memory.lost,
            }, traitLookup);
          }

          return createMemory(memory, traitLookup);
        })
        .filter((memory) => memory.experiences.length > 0)
        .slice(0, character.memorySlots + MAX_DIARY_MEMORIES)
      : [];
    character.diary = createDiary(data.diary, character.resources);
    character.#syncDiaryState();

    const seenOrders = [
      ...character.skills.flatMap((item) => [item.createdOrder, item.usedOrder]),
      ...character.resources.flatMap((item) => [item.createdOrder, item.usedOrder]),
      ...character.characters.flatMap((item) => [item.createdOrder, item.usedOrder]),
      ...character.marks.map((item) => item.createdOrder),
      ...character.memories.map((item) => item.createdOrder),
    ].filter((value) => Number.isFinite(value));
    character.#orderCounter = seenOrders.length ? Math.max(...seenOrders) : 0;

    return character;
  }

  rename(name) {
    this.name = cleanText(name);
    return Boolean(this.name);
  }

  setMemorySlots(nextSlots) {
    const slots = parseMemorySlots(nextSlots);
    if (this.activeMemories.length > slots) return false;
    this.memorySlots = slots;
    return true;
  }

  addMemory(experience, traitIds = [], memoryId = null, promptStamp = "") {
    const cleanedExperience = createExperience({ text: experience, traitIds, prompt: promptStamp }, this.#buildTraitLookup());
    if (!cleanedExperience.text) return false;

    if (memoryId !== null) {
      const memory = this.memories.find((entry) => entry.id === memoryId);
      if (!memory || memory.lost || memory.storedInDiary || memory.experiences.length >= MAX_EXPERIENCES_PER_MEMORY) return false;
      memory.experiences.push(cleanedExperience);
      return true;
    }

    if (this.activeMemories.length >= this.memorySlots) return false;
    this.memories.push({
      id: createId("memory"),
      title: "",
      experiences: [cleanedExperience],
      lost: false,
      storedInDiary: false,
      lostReason: "",
      createdOrder: this.#nextMemoryOrder(),
    });
    return true;
  }

  renameMemory(index, title) {
    const memory = this.memories[index];
    if (!memory) return false;
    memory.title = cleanText(title);
    return true;
  }

  updateMemoryExperience(memoryIndex, experienceIndex, text) {
    const memory = this.memories[memoryIndex];
    if (!memory) return false;
    const experience = memory.experiences[experienceIndex];
    if (!experience) return false;
    const cleanedText = cleanText(text);
    if (!cleanedText) return false;
    experience.text = cleanedText;
    return true;
  }

  /* Used by striking, which rewrites the sentence with marks in it —
     separate from updateMemoryExperience so a rewrite and a strike stay
     distinguishable at the call site. */
  setMemoryExperienceText(memoryIndex, experienceIndex, text) {
    const memory = this.memories[memoryIndex];
    if (!memory) return false;
    const experience = memory.experiences[experienceIndex];
    if (!experience) return false;
    const cleaned = cleanText(text);
    if (!cleaned) return false;
    experience.text = cleaned;
    return true;
  }

  updateMemoryExperiences(memoryIndex, texts = []) {
    const memory = this.memories[memoryIndex];
    if (!memory) return false;
    if (!Array.isArray(texts) || texts.length !== memory.experiences.length) return false;
    const cleanedTexts = texts.map((text) => cleanText(text));
    if (cleanedTexts.some((text) => !text)) return false;
    cleanedTexts.forEach((text, experienceIndex) => {
      memory.experiences[experienceIndex].text = text;
    });
    return true;
  }

  /* 51a ("Lose a random Experience from a Memory") needs this; nothing
     else in normal play removes a single Experience. */
  removeMemoryExperience(memoryIndex, experienceIndex) {
    const memory = this.memories[memoryIndex];
    if (!memory) return false;
    if (!memory.experiences[experienceIndex]) return false;
    memory.experiences.splice(experienceIndex, 1);
    return true;
  }

  removeMemory(index) {
    return this.#removeAt(this.memories, index);
  }

  setMemoryLost(index, lost) {
    const memory = this.memories[index];
    if (!memory) return false;
    const nextLost = Boolean(lost);
    memory.lost = nextLost;
    if (nextLost) {
      memory.lostReason = memory.storedInDiary ? "diary" : "mind";
      memory.storedInDiary = false;
      if (this.diary) {
        this.diary.memoryIds = this.diary.memoryIds.filter((memoryId) => memoryId !== memory.id);
        if (!this.diary.memoryIds.length) this.#clearDiaryState();
      }
    } else memory.lostReason = "";
    return true;
  }

  addSkill(name, description = "") {
    return this.#addDetailItem(this.skills, name, description, "skill");
  }

  updateSkill(index, name, description = "") {
    return this.#updateTrackableItem(this.skills, index, name, description);
  }

  removeSkill(index) {
    return this.#removeAt(this.skills, index);
  }

  setSkillUsed(index, used) {
    return this.#setUsed(this.skills, index, used);
  }

  setSkillLost(index, lost) {
    return this.#setBoolean(this.skills, index, "lost", lost);
  }

  addResource(name, description = "", stationary = false) {
    return this.#addDetailItem(this.resources, name, description, "resource", { stationary });
  }

  updateResource(index, name, description = "", stationary = false) {
    return this.#updateTrackableItem(this.resources, index, name, description, { stationary });
  }

  removeResource(index) {
    return this.#removeAt(this.resources, index);
  }

  setResourceUsed(index, used) {
    return this.#setUsed(this.resources, index, used);
  }

  setResourceLost(index, lost) {
    const item = this.resources[index];
    if (!item) return false;
    const nextLost = Boolean(lost);
    item.lost = nextLost;
    if (this.diary?.resourceId === item.id && nextLost) {
      this.diary.memoryIds.forEach((memoryId) => {
        const memory = this.memories.find((entry) => entry.id === memoryId);
        if (!memory) return;
        memory.storedInDiary = false;
        memory.lost = true;
        memory.lostReason = "diary";
      });
      this.#clearDiaryState();
    }
    return true;
  }

  createDiary(description = "") {
    if (this.diary) return false;
    const cleanedDescription = cleanText(description);
    this.resources.push({
      id: createId("resource"),
      name: "Diary",
      description: cleanedDescription,
      used: false,
      lost: false,
      stationary: false,
      createdOrder: this.#nextOrder(),
      usedOrder: null,
    });
    const resourceId = this.resources.at(-1)?.id;
    if (!resourceId) return false;
    this.diary = { resourceId, memoryIds: [] };
    return true;
  }

  moveMemoryToDiary(memoryId, description = "") {
    const cleanedMemoryId = cleanText(memoryId);
    const memory = this.memories.find((entry) => entry.id === cleanedMemoryId);
    if (!memory || memory.lost || memory.storedInDiary) return false;

    if (!this.diary) {
      const created = this.createDiary(description);
      if (!created) return false;
    }

    if (!this.diary || this.diary.memoryIds.length >= MAX_DIARY_MEMORIES) return false;

    memory.storedInDiary = true;
    memory.lost = false;
    memory.lostReason = "";
    this.diary.memoryIds.push(memory.id);
    return true;
  }

  get diaryResource() {
    if (!this.diary) return null;
    return this.resources.find((entry) => entry.id === this.diary.resourceId && !entry.lost) ?? null;
  }

  /* "Your vampire can have one Diary at a time, and it must contain at
     least one Memory" (refs/rules.txt). A Diary emptied by forgetting or
     deleting its last Memory is discarded with it — the same end state
     as losing the Diary, which strikes out what it held. */
  discardEmptyDiary() {
    if (!this.diary) return false;
    if (this.diaryMemories.length) return false;
    const resource = this.resources.find((entry) => entry.id === this.diary.resourceId);
    if (resource) resource.lost = true;
    this.diary = null;
    return true;
  }

  get diaryMemories() {
    if (!this.diary) return [];
    const diaryIds = new Set(this.diary.memoryIds);
    return this.memories.filter((memory) => diaryIds.has(memory.id) && memory.storedInDiary && !memory.lost);
  }

  get activeMemories() {
    return this.memories.filter((memory) => !memory.lost && !memory.storedInDiary);
  }

  addMark(name, description = "") {
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);
    if (!cleanedName) return false;
    this.marks.push({
      id: createId("mark"),
      name: cleanedName,
      description: cleanedDescription,
      createdOrder: this.#nextOrder(),
    });
    return true;
  }

  updateMark(index, name, description = "") {
    const item = this.marks[index];
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);
    if (!item || !cleanedName) return false;
    item.name = cleanedName;
    item.description = cleanedDescription;
    return true;
  }

  removeMark(index) {
    return this.#removeAt(this.marks, index);
  }

  addCharacter(name, description = "", type = "mortal") {
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);
    const cleanedType = cleanText(type).toLowerCase();

    if (!cleanedName) return false;
    if (!CHARACTER_TYPES.has(cleanedType)) return false;

    this.characters.push({
      id: createId("character"),
      name: cleanedName,
      description: cleanedDescription,
      type: cleanedType,
      used: false,
      lost: false,
      createdOrder: this.#nextOrder(),
      usedOrder: null,
    });
    return true;
  }

  updateCharacter(index, name, description = "", type = "mortal") {
    const entry = this.characters[index];
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);
    const cleanedType = cleanText(type).toLowerCase();
    if (!entry || !cleanedName || !CHARACTER_TYPES.has(cleanedType)) return false;
    entry.name = cleanedName;
    entry.description = cleanedDescription;
    entry.type = cleanedType;
    return true;
  }

  removeCharacter(index) {
    return this.#removeAt(this.characters, index);
  }

  setCharacterUsed(index, used) {
    return this.#setUsed(this.characters, index, used);
  }

  setCharacterLost(index, lost) {
    return this.#setBoolean(this.characters, index, "lost", lost);
  }

  getSetupRequirements() {
    return [
      buildRequirement("Memories", this.memories.length, DEFAULT_MEMORY_SLOTS),
      buildRequirement("Skills", this.skills.length, MIN_SKILLS),
      buildRequirement("Resources", this.resources.length, MIN_RESOURCES),
      buildRequirement("Mortals", this.mortalCount, MIN_MORTALS),
      buildRequirement("Immortals", this.immortalCount, MIN_IMMORTALS),
      buildRequirement("Marks", this.marks.length, MIN_MARKS),
    ];
  }

  isReadyForPromptOne() {
    return this.getSetupRequirements().every((requirement) => requirement.met);
  }

  getTraitLabel(traitId) {
    const cleanedId = cleanText(traitId);
    if (!cleanedId) return "";

    const characterEntry = this.characters.find((entry) => entry.id === cleanedId);
    if (characterEntry) return characterEntry.name;

    const skill = this.skills.find((entry) => entry.id === cleanedId);
    if (skill) return skill.name;

    const resource = this.resources.find((entry) => entry.id === cleanedId);
    if (resource) return resource.name;

    const mark = this.marks.find((entry) => entry.id === cleanedId);
    if (mark) return mark.name;

    return "";
  }

  get mortalCount() {
    return this.characters.filter((character) => character.type === "mortal").length;
  }

  get immortalCount() {
    return this.characters.filter((character) => character.type === "immortal").length;
  }

  #clearDiaryState() {
    this.diary = null;
  }

  #syncDiaryState() {
    if (!this.diary) {
      this.memories.forEach((memory) => {
        if (!memory.lost) memory.storedInDiary = false;
      });
      return;
    }

    const validMemoryIds = new Set();
    this.diary.memoryIds = this.diary.memoryIds.filter((memoryId) => {
      const memory = this.memories.find((entry) => entry.id === memoryId);
      if (!memory || memory.lost) return false;
      validMemoryIds.add(memoryId);
      memory.storedInDiary = true;
      return true;
    });

    this.memories.forEach((memory) => {
      if (!validMemoryIds.has(memory.id) && !memory.lost) memory.storedInDiary = false;
      if (memory.lost && !memory.lostReason) memory.lostReason = "mind";
    });

    if (!this.diary.memoryIds.length || !this.diaryResource) this.#clearDiaryState();
  }

  #addDetailItem(list, name, description, prefix, extra = {}) {
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);

    if (!cleanedName) return false;

    list.push({
      id: createId(prefix),
      name: cleanedName,
      description: cleanedDescription,
      used: false,
      lost: false,
      createdOrder: this.#nextOrder(),
      usedOrder: null,
      ...extra,
    });
    return true;
  }

  #updateTrackableItem(list, index, name, description, extra = {}) {
    const item = list[index];
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);
    if (!item || !cleanedName) return false;
    item.name = cleanedName;
    item.description = cleanedDescription;
    Object.assign(item, extra);
    return true;
  }

  #setBoolean(list, index, key, value) {
    const item = list[index];
    if (!item) return false;
    item[key] = Boolean(value);
    return true;
  }

  #setUsed(list, index, used) {
    const item = list[index];
    if (!item) return false;
    const nextUsed = Boolean(used);
    if (nextUsed && !item.used) item.usedOrder = this.#nextOrder();
    item.used = nextUsed;
    return true;
  }

  /* Memories are numbered among themselves — the shared trait counter
     would show a player Memory I, XI, XII. Frozen at creation and never
     renumbered when another memory is forgotten, so the numeral stays a
     name for one memory's age (design/MOBILE_REDESIGN_SPEC.md). */
  #nextMemoryOrder() {
    return this.memories.reduce((highest, memory) => Math.max(highest, memory.createdOrder ?? 0), 0) + 1;
  }

  #nextOrder() {
    this.#orderCounter += 1;
    return this.#orderCounter;
  }

  #removeAt(list, index) {
    if (index < 0 || index >= list.length) return false;

    list.splice(index, 1);
    return true;
  }

  #buildTraitLookup() {
    const lookup = new Map();

    this.characters.forEach((entry) => {
      const label = `${entry.type === "mortal" ? "Mortal" : "Immortal"}: ${entry.name}`;
      lookup.set(entry.id, entry.id);
      lookup.set(label, entry.id);
      lookup.set(entry.name, entry.id);
    });
    this.skills.forEach((entry) => {
      lookup.set(entry.id, entry.id);
      lookup.set(`Skill: ${entry.name}`, entry.id);
      lookup.set(entry.name, entry.id);
    });
    this.resources.forEach((entry) => {
      lookup.set(entry.id, entry.id);
      lookup.set(`Resource: ${entry.name}`, entry.id);
      lookup.set(entry.name, entry.id);
    });
    this.marks.forEach((entry) => {
      lookup.set(entry.id, entry.id);
      lookup.set(`Mark: ${entry.name}`, entry.id);
      lookup.set(entry.name, entry.id);
    });

    return lookup;
  }
}

export {
  DEFAULT_MEMORY_SLOTS as MAX_MEMORIES,
  MAX_EXPERIENCES_PER_MEMORY,
  MAX_DIARY_MEMORIES,
  MIN_SKILLS,
  MIN_RESOURCES,
  MIN_MORTALS,
  MIN_IMMORTALS,
  MIN_MARKS,
};
