import test from "node:test";
import assert from "node:assert/strict";
import {
  createStoredRecord,
  ensurePresetRecord,
  getLatestCompleteVampire,
  getLatestIncompleteVampire,
  getStoredVampires,
  saveStoredVampires,
  sortVampiresByUpdatedAt,
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
  assert.deepEqual(record.campaign, { currentPrompt: 3, visits: [[3, 1]], resolved: [], signature: null });
});

test("createStoredRecord keeps isComplete sticky once a previous record was already complete", () => {
  const character = {
    isReadyForPromptOne: () => false,
    name: "Aster",
    memories: [],
    skills: [],
    resources: [],
    characters: [],
    marks: [],
    diary: null,
  };
  const promptState = { currentPrompt: 3, visits: new Map() };

  const record = createStoredRecord({
    selectedVampireId: "v-1",
    character,
    promptState,
    serializeCharacter: (currentCharacter) => ({ name: currentCharacter.name }),
    previousRecord: { id: "v-1", isComplete: true },
  });

  assert.equal(record.isComplete, true);
});

test("createStoredRecord still gates on the live check when there is no previous record", () => {
  const character = {
    isReadyForPromptOne: () => false,
    name: "Aster",
    memories: [],
    skills: [],
    resources: [],
    characters: [],
    marks: [],
    diary: null,
  };
  const promptState = { currentPrompt: 1, visits: new Map() };

  const record = createStoredRecord({
    selectedVampireId: "v-1",
    character,
    promptState,
    serializeCharacter: (currentCharacter) => ({ name: currentCharacter.name }),
  });

  assert.equal(record.isComplete, false);
});

test("sortVampiresByUpdatedAt orders newest first without mutating input", () => {
  const vampires = [
    { id: "v-1", updatedAt: "2024-01-01T00:00:00.000Z" },
    { id: "v-2", updatedAt: "2024-03-01T00:00:00.000Z" },
    { id: "v-3", updatedAt: "2024-02-01T00:00:00.000Z" },
  ];

  const sorted = sortVampiresByUpdatedAt(vampires);

  assert.deepEqual(sorted.map((entry) => entry.id), ["v-2", "v-3", "v-1"]);
  assert.deepEqual(vampires.map((entry) => entry.id), ["v-1", "v-2", "v-3"]);
});

test("getLatestCompleteVampire returns the most recently updated finished save, excluding a given id and unfinished saves", () => {
  const vampires = [
    { id: "preset", updatedAt: "2024-06-01T00:00:00.000Z", isComplete: true },
    { id: "v-1", updatedAt: "2024-05-01T00:00:00.000Z", isComplete: false },
    { id: "v-2", updatedAt: "2024-03-01T00:00:00.000Z", isComplete: true },
    { id: "v-3", updatedAt: "2024-01-01T00:00:00.000Z", isComplete: false },
  ];

  assert.equal(getLatestCompleteVampire(vampires, "preset")?.id, "v-2");
  assert.equal(getLatestCompleteVampire(vampires)?.id, "preset");
  assert.equal(getLatestCompleteVampire([{ id: "v-1", isComplete: false }]), null);
  assert.equal(getLatestCompleteVampire([], "preset"), null);
});

test("getLatestIncompleteVampire ignores complete saves and a given id", () => {
  const vampires = [
    { id: "preset", updatedAt: "2024-06-01T00:00:00.000Z", isComplete: false },
    { id: "v-1", updatedAt: "2024-05-01T00:00:00.000Z", isComplete: true },
    { id: "v-2", updatedAt: "2024-02-01T00:00:00.000Z", isComplete: false },
    { id: "v-3", updatedAt: "2024-04-01T00:00:00.000Z", isComplete: false },
  ];

  assert.equal(getLatestIncompleteVampire(vampires, "preset")?.id, "v-3");
  assert.equal(getLatestIncompleteVampire([{ id: "v-1", isComplete: true }]), null);
});
