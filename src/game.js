const MAX_MEMORIES = 5;
const CHARACTER_TYPES = new Set(["mortal", "immortal"]);

const cleanText = (value = "") => String(value).trim().replace(/\s+/g, " ");

const buildRequirement = (label, count, minimum) => ({
  label,
  count,
  minimum,
  met: count >= minimum,
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
        .map((memory) => ({
          text: cleanText(memory?.text),
          traits: Array.isArray(memory?.traits)
            ? memory.traits.map((trait) => cleanText(trait)).filter(Boolean)
            : [],
        }))
        .filter((memory) => Boolean(memory.text))
        .slice(0, MAX_MEMORIES)
      : [];
    character.skills = Array.isArray(data.skills)
      ? data.skills
        .map((item) => ({
          name: cleanText(item?.name),
          description: cleanText(item?.description),
        }))
        .filter((item) => Boolean(item.name))
      : [];
    character.resources = Array.isArray(data.resources)
      ? data.resources
        .map((item) => ({
          name: cleanText(item?.name),
          description: cleanText(item?.description),
        }))
        .filter((item) => Boolean(item.name))
      : [];
    character.characters = Array.isArray(data.characters)
      ? data.characters
        .map((entry) => ({
          name: cleanText(entry?.name),
          description: cleanText(entry?.description),
          type: CHARACTER_TYPES.has(cleanText(entry?.type).toLowerCase())
            ? cleanText(entry?.type).toLowerCase()
            : null,
        }))
        .filter((entry) => Boolean(entry.name) && Boolean(entry.type))
      : [];
    character.marks = Array.isArray(data.marks)
      ? data.marks
        .map((item) => ({
          name: cleanText(item?.name),
          description: cleanText(item?.description),
        }))
        .filter((item) => Boolean(item.name))
      : [];
    return character;
  }

  rename(name) {
    this.name = cleanText(name);
    return Boolean(this.name);
  }

  addMemory(memory, traits = []) {
    if (this.memories.length >= MAX_MEMORIES) return false;

    const cleanedMemory = cleanText(memory);
    const cleanedTraits = traits.map((trait) => cleanText(trait)).filter(Boolean);

    if (!cleanedMemory) return false;

    this.memories.push({
      text: cleanedMemory,
      traits: cleanedTraits,
    });
    return true;
  }

  removeMemory(index) {
    return this.#removeAt(this.memories, index);
  }

  addSkill(name, description = "") {
    return this.#addDetailItem(this.skills, name, description);
  }

  removeSkill(index) {
    return this.#removeAt(this.skills, index);
  }

  addResource(name, description = "") {
    return this.#addDetailItem(this.resources, name, description);
  }

  removeResource(index) {
    return this.#removeAt(this.resources, index);
  }

  addMark(name, description = "") {
    return this.#addDetailItem(this.marks, name, description);
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
    });
    return true;
  }

  removeCharacter(index) {
    return this.#removeAt(this.characters, index);
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
    });
    return true;
  }

  #removeAt(list, index) {
    if (index < 0 || index >= list.length) return false;

    list.splice(index, 1);
    return true;
  }
}
