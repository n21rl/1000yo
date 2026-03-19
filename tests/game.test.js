import test from "node:test";
import assert from "node:assert/strict";
import { Character } from "../src/game.js";

test("Character tracks memories as collections of experiences with stable trait IDs", () => {
  const character = new Character("Aster");
  character.addSkill("Swordplay");

  const result = character.addMemory("I was born beside the sea.", [character.skills[0].id]);

  assert.equal(result, true);
  assert.match(character.memories[0].id, /^memory-/);
  assert.deepEqual(character.memories, [
    {
      id: character.memories[0].id,
      experiences: [
        {
          text: "I was born beside the sea.",
          traitIds: [character.skills[0].id],
        },
      ],
      lost: false,
    },
  ]);
});

test("Character rejects blank required setup entries", () => {
  const character = new Character("Aster");

  assert.equal(character.addMemory("   "), false);
  assert.equal(character.addSkill("   "), false);
  assert.equal(character.addResource("   "), false);
  assert.equal(character.addMark("   "), false);
  assert.equal(character.addCharacter("   ", "A loyal sister.", "mortal"), false);

  assert.equal(character.memories.length, 0);
  assert.equal(character.skills.length, 0);
  assert.equal(character.resources.length, 0);
  assert.equal(character.characters.length, 0);
  assert.equal(character.marks.length, 0);
});

test("Character limits current memory slots to five", () => {
  const character = new Character("Aster");

  for (let index = 0; index < 5; index += 1) {
    assert.equal(character.addMemory(`Experience ${index + 1}`), true);
  }

  assert.equal(character.addMemory("Experience 6"), false);
  assert.equal(character.memories.length, 5);
});

test("Character appends experiences to existing memories up to three each", () => {
  const character = new Character("Aster");

  assert.equal(character.addMemory("First"), true);
  const memoryId = character.memories[0].id;
  character.addSkill("Swordplay");
  assert.equal(character.addMemory("Second", [character.skills[0].id], memoryId), true);
  assert.equal(character.addMemory("Third", [], memoryId), true);
  assert.equal(character.addMemory("Fourth", [], memoryId), false);

  assert.deepEqual(character.memories[0].experiences.map((experience) => experience.text), [
    "First",
    "Second",
    "Third",
  ]);
});

test("Character counts mortal and immortal setup characters separately", () => {
  const character = new Character("Aster");

  character.addCharacter("Rhea", "A sister who still trusts me.", "mortal");
  character.addCharacter("Marcus", "The priest who hunts me.", "mortal");
  character.addCharacter("Iscah", "The thing that turned me.", "immortal");

  assert.equal(character.mortalCount, 2);
  assert.equal(character.immortalCount, 1);
});

test("Character stores stable IDs plus optional descriptions and status flags for trackable traits", () => {
  const character = new Character("Aster");

  assert.equal(character.addSkill("Swordplay"), true);
  assert.equal(character.addResource("A warhorse", "A mount kept ready for flight."), true);
  assert.equal(character.addCharacter("Rhea", "A mortal ally.", "mortal"), true);
  assert.equal(character.addMark("Broken neck", "Always hidden beneath high collars."), true);

  character.setSkillUsed(0, true);
  character.setResourceLost(0, true);
  character.setCharacterUsed(0, true);
  character.setCharacterLost(0, true);

  assert.match(character.skills[0].id, /^skill-/);
  assert.match(character.resources[0].id, /^resource-/);
  assert.match(character.characters[0].id, /^character-/);
  assert.match(character.marks[0].id, /^mark-/);
  assert.deepEqual(character.skills, [{ id: character.skills[0].id, name: "Swordplay", description: "", used: true, lost: false }]);
  assert.deepEqual(character.resources, [
    { id: character.resources[0].id, name: "A warhorse", description: "A mount kept ready for flight.", used: false, lost: true },
  ]);
  assert.deepEqual(character.characters, [
    {
      id: character.characters[0].id,
      name: "Rhea",
      description: "A mortal ally.",
      type: "mortal",
      used: true,
      lost: true,
    },
  ]);
  assert.deepEqual(character.marks, [
    { id: character.marks[0].id, name: "Broken neck", description: "Always hidden beneath high collars." },
  ]);
});

test("Character migrates legacy experience trait labels to stable trait IDs", () => {
  const character = Character.from({
    skills: [{ name: "Swordplay" }],
    characters: [{ name: "Rhea", type: "mortal" }],
    marks: [{ name: "Broken neck" }],
    memories: [{
      text: "I remember the duel.",
      traits: ["Skill: Swordplay", "Mortal: Rhea", "Mark: Broken neck"],
    }],
  });

  assert.deepEqual(character.memories[0].experiences[0].traitIds, [
    character.skills[0].id,
    character.characters[0].id,
    character.marks[0].id,
  ]);
});

test("Character becomes ready for Prompt 1 after the full setup is complete", () => {
  const character = new Character("Aster");

  character.addMemory("I was born into a ruined noble line.");
  character.addSkill("Swordplay", "A talent carried over from mortal campaigns.");
  character.addSkill("Courtly etiquette");
  character.addSkill("Riding through the night");

  character.addResource("A warhorse");
  character.addResource("My family's signet ring");
  character.addResource("A chest of letters");

  character.addCharacter("Rhea", "My mortal sister and truest ally.", "mortal");
  character.addCharacter("Tomas", "A debt-ridden steward who fears me.", "mortal");
  character.addCharacter("Luc", "", "mortal");
  character.addCharacter("Baron Hollmueller", "The vampire who cursed me.", "immortal");

  character.addMark("My neck is permanently broken beneath my scarves.", "A visible reminder of the night I died.");

  character.addMemory("My sister carried my debts in silence.", [character.characters[0].id, character.skills[0].id]);
  character.addMemory("I learned to ride with soldiers at my back.");
  character.addMemory("My uncle hid the ledgers that proved my claim.");
  character.addMemory("I dueled a baron at dawn and did not die.", [character.characters[3].id, character.marks[0].id]);

  assert.equal(character.isReadyForPromptOne(), true);
  assert.deepEqual(
    character.getSetupRequirements().map((requirement) => requirement.met),
    [true, true, true, true, true, true],
  );
});
