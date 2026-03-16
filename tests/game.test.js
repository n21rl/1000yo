import test from "node:test";
import assert from "node:assert/strict";
import { Character } from "../src/game.js";

test("Character tracks memory titles and first experiences", () => {
  const character = new Character("Aster");

  const result = character.addMemory("Mortal life", "I was born beside the sea.");

  assert.equal(result, true);
  assert.deepEqual(character.memories, [
    {
      title: "Mortal life",
      experiences: ["I was born beside the sea."],
    },
  ]);
});

test("Character rejects blank setup entries", () => {
  const character = new Character("Aster");

  assert.equal(character.addMemory("   ", "I remember."), false);
  assert.equal(character.addSkill("   "), false);
  assert.equal(character.addResource("   "), false);
  assert.equal(character.addMark("   "), false);
  assert.equal(character.addCharacter("Ari", "   ", "mortal"), false);

  assert.equal(character.memories.length, 0);
  assert.equal(character.skills.length, 0);
  assert.equal(character.resources.length, 0);
  assert.equal(character.characters.length, 0);
  assert.equal(character.marks.length, 0);
});

test("Character limits current memory slots to five", () => {
  const character = new Character("Aster");

  for (let index = 0; index < 5; index += 1) {
    assert.equal(
      character.addMemory(`Memory ${index + 1}`, `Experience ${index + 1}`),
      true,
    );
  }

  assert.equal(character.addMemory("Memory 6", "Experience 6"), false);
  assert.equal(character.memories.length, 5);
});

test("Character counts mortal and immortal setup characters separately", () => {
  const character = new Character("Aster");

  character.addCharacter("Rhea", "A sister who still trusts me.", "mortal");
  character.addCharacter("Marcus", "The priest who hunts me.", "mortal");
  character.addCharacter("Iscah", "The thing that turned me.", "immortal");

  assert.equal(character.mortalCount, 2);
  assert.equal(character.immortalCount, 1);
});

test("Character becomes ready for Prompt 1 after the full setup is complete", () => {
  const character = new Character("Aster");

  character.addMemory("Mortal life", "I was born into a ruined noble line.");
  character.addMemory("Family duty", "My sister carried my debts in silence.");
  character.addMemory("War service", "I learned to ride with soldiers at my back.");
  character.addMemory("Lost inheritance", "My uncle hid the ledgers that proved my claim.");
  character.addMemory("The curse", "I dueled a baron at dawn and did not die.");

  character.addSkill("Swordplay");
  character.addSkill("Courtly etiquette");
  character.addSkill("Riding through the night");

  character.addResource("A warhorse");
  character.addResource("My family's signet ring");
  character.addResource("A chest of letters");

  character.addCharacter("Rhea", "My mortal sister and truest ally.", "mortal");
  character.addCharacter("Tomas", "A debt-ridden steward who fears me.", "mortal");
  character.addCharacter("Luc", "My first lover, now aging without me.", "mortal");
  character.addCharacter("Baron Hollmueller", "The vampire who cursed me.", "immortal");

  character.addMark("My neck is permanently broken beneath my scarves.");

  assert.equal(character.isReadyForPromptOne(), true);
  assert.deepEqual(
    character.getSetupRequirements().map((requirement) => requirement.met),
    [true, true, true, true, true, true],
  );
});
