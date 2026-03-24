const MAX_MEMORIES = 5;
const MAX_EXPERIENCES_PER_MEMORY = 3;
const MAX_DIARY_MEMORIES = 4;
const CHARACTER_TYPES = new Set(["mortal", "immortal"]);

const cleanText = (value = "") => String(value).trim().replace(/\s+/g, " ");
const createId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const buildRequirement = (label, count, minimum) => ({
  label,
  count,
  minimum,
  met: count >= minimum,
});

const createTrackableItem = (item = {}, prefix = "trait") => ({
  id: cleanText(item?.id) || createId(prefix),
  name: cleanText(item?.name),
  description: cleanText(item?.description),
  used: Boolean(item?.used),
  lost: Boolean(item?.lost),
});

const createMark = (item = {}) => ({
  id: cleanText(item?.id) || createId("mark"),
  name: cleanText(item?.name),
  description: cleanText(item?.description),
});

const createExperience = (experience = {}, traitLookup = new Map()) => {
  const traitIds = [
    ...(Array.isArray(experience?.traitIds) ? experience.traitIds : []),
    ...(Array.isArray(experience?.traits) ? experience.traits : []),
  ];

  return {
    text: cleanText(experience?.text),
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
    experiences: experiences.slice(0, MAX_EXPERIENCES_PER_MEMORY),
    lost: Boolean(memory?.lost),
    storedInDiary: Boolean(memory?.storedInDiary),
    lostReason: cleanText(memory?.lostReason),
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

export class Character {
  constructor(name = "") {
    this.name = cleanText(name);
    this.memories = [];
    this.skills = [];
    this.resources = [];
    this.characters = [];
    this.marks = [];
    this.diary = null;
  }

  static from(data = {}) {
    const character = new Character(data.name);
    character.skills = Array.isArray(data.skills)
      ? data.skills.map((item) => createTrackableItem(item, "skill")).filter((item) => Boolean(item.name))
      : [];
    character.resources = Array.isArray(data.resources)
      ? data.resources.map((item) => createTrackableItem(item, "resource")).filter((item) => Boolean(item.name))
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
        .slice(0, MAX_MEMORIES + MAX_DIARY_MEMORIES)
      : [];
    character.diary = createDiary(data.diary, character.resources);
    character.#syncDiaryState();
    return character;
  }

  rename(name) {
    this.name = cleanText(name);
    return Boolean(this.name);
  }

  addMemory(experience, traitIds = [], memoryId = null) {
    const cleanedExperience = createExperience({ text: experience, traitIds }, this.#buildTraitLookup());
    if (!cleanedExperience.text) return false;

    if (memoryId !== null) {
      const memory = this.memories.find((entry) => entry.id === memoryId);
      if (!memory || memory.lost || memory.storedInDiary || memory.experiences.length >= MAX_EXPERIENCES_PER_MEMORY) return false;
      memory.experiences.push(cleanedExperience);
      return true;
    }

    if (this.activeMemories.length >= MAX_MEMORIES) return false;
    this.memories.push({
      id: createId("memory"),
      experiences: [cleanedExperience],
      lost: false,
      storedInDiary: false,
      lostReason: "",
    });
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
    return this.#setBoolean(this.skills, index, "used", used);
  }

  setSkillLost(index, lost) {
    return this.#setBoolean(this.skills, index, "lost", lost);
  }

  addResource(name, description = "") {
    return this.#addDetailItem(this.resources, name, description, "resource");
  }

  updateResource(index, name, description = "") {
    return this.#updateTrackableItem(this.resources, index, name, description);
  }

  removeResource(index) {
    return this.#removeAt(this.resources, index);
  }

  setResourceUsed(index, used) {
    return this.#setBoolean(this.resources, index, "used", used);
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
    this.marks.push({ id: createId("mark"), name: cleanedName, description: cleanedDescription });
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
    return this.#setBoolean(this.characters, index, "used", used);
  }

  setCharacterLost(index, lost) {
    return this.#setBoolean(this.characters, index, "lost", lost);
  }

  getSetupRequirements() {
    return [
      buildRequirement("Memories", this.memories.length, MAX_MEMORIES),
      buildRequirement("Skills", this.skills.length, 3),
      buildRequirement("Resources", this.resources.length, 3),
      buildRequirement("Mortals", this.mortalCount, 3),
      buildRequirement("Immortals", this.immortalCount, 1),
      buildRequirement("Marks", this.marks.length, 1),
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

  #addDetailItem(list, name, description, prefix) {
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);

    if (!cleanedName) return false;

    list.push({
      id: createId(prefix),
      name: cleanedName,
      description: cleanedDescription,
      used: false,
      lost: false,
    });
    return true;
  }

  #updateTrackableItem(list, index, name, description) {
    const item = list[index];
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);
    if (!item || !cleanedName) return false;
    item.name = cleanedName;
    item.description = cleanedDescription;
    return true;
  }

  #setBoolean(list, index, key, value) {
    const item = list[index];
    if (!item) return false;
    item[key] = Boolean(value);
    return true;
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

export { MAX_MEMORIES, MAX_EXPERIENCES_PER_MEMORY, MAX_DIARY_MEMORIES };
