import test from "node:test";
import assert from "node:assert/strict";
import { Character } from "../src/game.js";

test("Character adds non-empty memories", () => {
  const character = new Character("Aster");

  const result = character.addMemory("I remember the sea.");

  assert.equal(result, true);
  assert.deepEqual(character.memories, [{ text: "I remember the sea." }]);
});

test("Character rejects blank memories", () => {
  const character = new Character("Aster");

  const result = character.addMemory("   ");

  assert.equal(result, false);
  assert.equal(character.memories.length, 0);
});
