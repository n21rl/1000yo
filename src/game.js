export class Character {
  constructor(name = "Unnamed Vampire") {
    this.name = name;
    this.memories = [];
  }

  addMemory(text) {
    const cleaned = text.trim();
    if (!cleaned) return false;

    this.memories.push({ text: cleaned });
    return true;
  }

  rename(name) {
    const cleaned = name.trim();
    if (!cleaned) return false;

    this.name = cleaned;
    return true;
  }
}
