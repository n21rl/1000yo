const MAX_MEMORIES = 5;
const MAX_EXPERIENCES_PER_MEMORY = 3;
const CHARACTER_TYPES = new Set(["mortal", "immortal"]);

const cleanText = (value = "") => String(value).trim().replace(/\s+/g, " ");

const buildRequirement = (label, count, minimum) => ({
  label,
  count,
  minimum,
  met: count >= minimum,
});

const createExperience = (experience = {}) => ({
  text: cleanText(experience?.text),
  traits: Array.isArray(experience?.traits)
    ? experience.traits.map((trait) => cleanText(trait)).filter(Boolean)
    : [],
});

const createMemory = (memory = {}) => {
  const experiences = Array.isArray(memory?.experiences)
    ? memory.experiences.map(createExperience).filter((entry) => Boolean(entry.text))
    : [];

  return {
    experiences: experiences.slice(0, MAX_EXPERIENCES_PER_MEMORY),
    lost: Boolean(memory?.lost),
  };
};

const createTrackableItem = (item = {}) => ({
  name: cleanText(item?.name),
  description: cleanText(item?.description),
  used: Boolean(item?.used),
  lost: Boolean(item?.lost),
});

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
    character.memories = Array.isArray(data.memories)
      ? data.memories
        .map((memory) => {
          if (Array.isArray(memory?.experiences)) {
            return createMemory(memory);
          }

          if (memory?.text) {
            return createMemory({
              experiences: [
                {
                  text: memory.text,
                  traits: Array.isArray(memory?.traits) ? memory.traits : [],
                },
              ],
            });
          }

          return createMemory(memory);
        })
        .filter((memory) => memory.experiences.length > 0)
        .slice(0, MAX_MEMORIES)
      : [];
    character.skills = Array.isArray(data.skills)
      ? data.skills.map(createTrackableItem).filter((item) => Boolean(item.name))
      : [];
    character.resources = Array.isArray(data.resources)
      ? data.resources.map(createTrackableItem).filter((item) => Boolean(item.name))
      : [];
    character.characters = Array.isArray(data.characters)
      ? data.characters
        .map((entry) => ({
          ...createTrackableItem(entry),
          type: CHARACTER_TYPES.has(cleanText(entry?.type).toLowerCase())
            ? cleanText(entry?.type).toLowerCase()
            : null,
        }))
        .filter((entry) => Boolean(entry.name) && Boolean(entry.type))
      : [];
    character.marks = Array.isArray(data.marks)
      ? data.marks.map((item) => ({
        name: cleanText(item?.name),
        description: cleanText(item?.description),
      })).filter((item) => Boolean(item.name))
      : [];
    return character;
  }

  rename(name) {
    this.name = cleanText(name);
    return Boolean(this.name);
  }

  addMemory(experience, traits = [], memoryIndex = null) {
    const cleanedExperience = createExperience({ text: experience, traits });
    if (!cleanedExperience.text) return false;

    if (Number.isInteger(memoryIndex) && memoryIndex >= 0 && memoryIndex < this.memories.length) {
      const memory = this.memories[memoryIndex];
      if (memory.lost || memory.experiences.length >= MAX_EXPERIENCES_PER_MEMORY) return false;
      memory.experiences.push(cleanedExperience);
      return true;
    }

    if (this.memories.length >= MAX_MEMORIES) return false;
    this.memories.push({ experiences: [cleanedExperience], lost: false });
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
    return this.#addDetailItem(this.skills, name, description);
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
    return this.#addDetailItem(this.resources, name, description);
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
    this.marks.push({ name: cleanedName, description: cleanedDescription });
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

  get mortalCount() {
    return this.characters.filter((character) => character.type === "mortal").length;
  }

  get immortalCount() {
    return this.characters.filter((character) => character.type === "immortal").length;
  }

  #addDetailItem(list, name, description) {
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);

    if (!cleanedName) return false;

    list.push({
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
}

export { MAX_MEMORIES, MAX_EXPERIENCES_PER_MEMORY };
