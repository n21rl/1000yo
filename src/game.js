const MAX_MEMORIES = 5;
const MAX_EXPERIENCES_PER_MEMORY = 3;
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
  };
};

export class Character {
  constructor(name = "") {
    this.name = cleanText(name);
    this.memories = [];
    this.skills = [];
    this.resources = [];
    this.characters = [];
    this.marks = [];
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
        .slice(0, MAX_MEMORIES)
      : [];
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
      if (!memory || memory.lost || memory.experiences.length >= MAX_EXPERIENCES_PER_MEMORY) return false;
      memory.experiences.push(cleanedExperience);
      return true;
    }

    if (this.memories.length >= MAX_MEMORIES) return false;
    this.memories.push({ id: createId("memory"), experiences: [cleanedExperience], lost: false });
    return true;
  }

  removeMemory(index) {
    return this.#removeAt(this.memories, index);
  }

  setMemoryLost(index, lost) {
    const memory = this.memories[index];
    if (!memory) return false;
    memory.lost = Boolean(lost);
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
    return this.#setBoolean(this.resources, index, "lost", lost);
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
    if (characterEntry) return `${characterEntry.type === "mortal" ? "Mortal" : "Immortal"}: ${characterEntry.name}`;

    const skill = this.skills.find((entry) => entry.id === cleanedId);
    if (skill) return `Skill: ${skill.name}`;

    const resource = this.resources.find((entry) => entry.id === cleanedId);
    if (resource) return `Resource: ${resource.name}`;

    const mark = this.marks.find((entry) => entry.id === cleanedId);
    if (mark) return `Mark: ${mark.name}`;

    return "";
  }

  get mortalCount() {
    return this.characters.filter((character) => character.type === "mortal").length;
  }

  get immortalCount() {
    return this.characters.filter((character) => character.type === "immortal").length;
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
    });
    this.skills.forEach((entry) => {
      lookup.set(entry.id, entry.id);
      lookup.set(`Skill: ${entry.name}`, entry.id);
    });
    this.resources.forEach((entry) => {
      lookup.set(entry.id, entry.id);
      lookup.set(`Resource: ${entry.name}`, entry.id);
    });
    this.marks.forEach((entry) => {
      lookup.set(entry.id, entry.id);
      lookup.set(`Mark: ${entry.name}`, entry.id);
    });

    return lookup;
  }
}

export { MAX_MEMORIES, MAX_EXPERIENCES_PER_MEMORY };
