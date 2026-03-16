const MAX_MEMORIES = 5;
const MEMORY_EXPERIENCE_LIMIT = 3;
const CHARACTER_TYPES = new Set(["mortal", "immortal"]);

const cleanText = (value) => value.trim().replace(/\s+/g, " ");

const buildRequirement = (label, count, minimum) => ({
  label,
  count,
  minimum,
  met: count >= minimum,
});

export class Character {
  constructor(name = "Unnamed Vampire") {
    this.name = cleanText(name) || "Unnamed Vampire";
    this.memories = [];
    this.skills = [];
    this.resources = [];
    this.characters = [];
    this.marks = [];
  }

  rename(name) {
    const cleaned = cleanText(name);
    if (!cleaned) return false;

    this.name = cleaned;
    return true;
  }

  addMemory(title, experience) {
    if (this.memories.length >= MAX_MEMORIES) return false;

    const cleanedTitle = cleanText(title);
    const cleanedExperience = cleanText(experience);

    if (!cleanedTitle || !cleanedExperience) return false;

    this.memories.push({
      title: cleanedTitle,
      experiences: [cleanedExperience],
    });
    return true;
  }

  removeMemory(index) {
    return this.#removeAt(this.memories, index);
  }

  addExperienceToMemory(index, experience) {
    const memory = this.memories[index];
    const cleanedExperience = cleanText(experience);

    if (!memory || !cleanedExperience) return false;
    if (memory.experiences.length >= MEMORY_EXPERIENCE_LIMIT) return false;

    memory.experiences.push(cleanedExperience);
    return true;
  }

  addSkill(skill) {
    return this.#addListItem(this.skills, skill);
  }

  removeSkill(index) {
    return this.#removeAt(this.skills, index);
  }

  addResource(resource) {
    return this.#addListItem(this.resources, resource);
  }

  removeResource(index) {
    return this.#removeAt(this.resources, index);
  }

  addMark(mark) {
    return this.#addListItem(this.marks, mark);
  }

  removeMark(index) {
    return this.#removeAt(this.marks, index);
  }

  addCharacter(name, description, type = "mortal") {
    const cleanedName = cleanText(name);
    const cleanedDescription = cleanText(description);
    const cleanedType = cleanText(type).toLowerCase();

    if (!cleanedName || !cleanedDescription) return false;
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

  #addListItem(list, value) {
    const cleaned = cleanText(value);
    if (!cleaned) return false;

    list.push(cleaned);
    return true;
  }

  #removeAt(list, index) {
    if (index < 0 || index >= list.length) return false;

    list.splice(index, 1);
    return true;
  }
}
