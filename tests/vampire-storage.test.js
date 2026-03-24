import test from "node:test";
import assert from "node:assert/strict";
import {
  createStoredRecord,
  ensurePresetRecord,
  getStoredVampires,
  saveStoredVampires,
  upsertVampireRecord,
} from "../src/vampire-storage.js";

test("ensurePresetRecord prepends preset record when missing", () => {
  const createPresetRecord = () => ({ id: "preset" });
  const result = ensurePresetRecord([{ id: "custom" }], "preset", createPresetRecord);

  assert.deepEqual(result.map((entry) => entry.id), ["preset", "custom"]);
});

test("getStoredVampires parses storage and preserves preset", () => {
  const storage = {
    getItem: () => JSON.stringify([{ id: "preset" }, { id: "custom-1" }]),
  };
  const createPresetRecord = () => ({ id: "preset" });

  const result = getStoredVampires(storage, "1000yo.vampires", "preset", createPresetRecord);

  assert.deepEqual(result.map((entry) => entry.id), ["preset", "custom-1"]);
});

test("saveStoredVampires serializes vampire records", () => {
  const writes = [];
  const storage = {
    setItem(key, value) {
      writes.push([key, value]);
      return true;
    },
  };

  saveStoredVampires(storage, "1000yo.vampires", [{ id: "v-1" }]);

  assert.deepEqual(writes, [["1000yo.vampires", JSON.stringify([{ id: "v-1" }])]]);
});

test("upsertVampireRecord replaces existing record or appends new record", () => {
  const existing = [{ id: "v-1", updatedAt: "old" }];
  const replaced = upsertVampireRecord(existing, { id: "v-1", updatedAt: "new" });
  const appended = upsertVampireRecord(existing, { id: "v-2", updatedAt: "new" });

  assert.deepEqual(replaced, [{ id: "v-1", updatedAt: "new" }]);
  assert.deepEqual(appended.map((entry) => entry.id), ["v-1", "v-2"]);
});

test("createStoredRecord assembles serializable campaign save data", () => {
  const character = {
    isReadyForPromptOne: () => true,
    name: "Aster",
    memories: [],
    skills: [],
    resources: [],
    characters: [],
    marks: [],
    diary: null,
  };
  const promptState = {
    currentPrompt: 3,
    visits: new Map([[3, 1]]),
  };

  const record = createStoredRecord({
    selectedVampireId: "v-1",
    character,
    promptState,
    serializeCharacter: (currentCharacter) => ({ name: currentCharacter.name }),
  });

  assert.equal(record.id, "v-1");
  assert.equal(record.isComplete, true);
  assert.deepEqual(record.data, { name: "Aster" });
  assert.deepEqual(record.campaign, { currentPrompt: 3, visits: [[3, 1]] });
});
