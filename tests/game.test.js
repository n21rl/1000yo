import test from "node:test";
import assert from "node:assert/strict";
import { Character } from "../src/game.js";

test("Character tracks memories as collections of experiences", () => {
  const character = new Character("Aster");

  const result = character.addMemory("I was born beside the sea.", ["Skill: Swordplay"]);

  assert.equal(result, true);
  assert.deepEqual(character.memories, [
    {
      experiences: [
        {
          text: "I was born beside the sea.",
          traits: ["Skill: Swordplay"],
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
  assert.equal(character.addMemory("Second", ["Skill: Swordplay"], 0), true);
  assert.equal(character.addMemory("Third", [], 0), true);
  assert.equal(character.addMemory("Fourth", [], 0), false);

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

test("Character stores optional descriptions and status flags for trackable traits", () => {
  const character = new Character("Aster");

  assert.equal(character.addSkill("Swordplay"), true);
  assert.equal(character.addResource("A warhorse", "A mount kept ready for flight."), true);
  assert.equal(character.addCharacter("Rhea", "A mortal ally.", "mortal"), true);
  assert.equal(character.addMark("Broken neck", "Always hidden beneath high collars."), true);

  character.setSkillUsed(0, true);
  character.setResourceLost(0, true);
  character.setCharacterUsed(0, true);
  character.setCharacterLost(0, true);

  assert.deepEqual(character.skills, [{ name: "Swordplay", description: "", used: true, lost: false }]);
  assert.deepEqual(character.resources, [
    { name: "A warhorse", description: "A mount kept ready for flight.", used: false, lost: true },
  ]);
  assert.deepEqual(character.characters, [
    {
      name: "Rhea",
      description: "A mortal ally.",
      type: "mortal",
      used: true,
      lost: true,
    },
  ]);
  assert.deepEqual(character.marks, [
    { name: "Broken neck", description: "Always hidden beneath high collars." },
  ]);
});

test("Character becomes ready for Prompt 1 after the full setup is complete", () => {
  const character = new Character("Aster");

  character.addMemory("I was born into a ruined noble line.");
  character.addMemory("My sister carried my debts in silence.", ["Mortal: Rhea", "Skill: Swordplay"]);
  character.addMemory("I learned to ride with soldiers at my back.");
  character.addMemory("My uncle hid the ledgers that proved my claim.");
  character.addMemory("I dueled a baron at dawn and did not die.", ["Immortal: Baron Hollmueller", "Mark: Broken neck"]);

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

  assert.equal(character.isReadyForPromptOne(), true);
  assert.deepEqual(
    character.getSetupRequirements().map((requirement) => requirement.met),
    [true, true, true, true, true, true],
  );
});
