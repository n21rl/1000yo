import test from "node:test";
import assert from "node:assert/strict";
import { serializeCampaignState } from "../src/campaign-state.js";
import { Character } from "../src/game.js";
import {
  createStoredRecord,
  parseRouteId,
  sanitizeStoredVampires,
} from "../src/storage.js";

test("sanitizeStoredVampires keeps the most recently updated duplicate by normalized name", () => {
  const records = sanitizeStoredVampires([
    {
      id: "old-id",
      updatedAt: "2024-01-01T00:00:00.000Z",
      data: { name: "Élodie St. Clair" },
    },
    {
      id: "new-id",
      updatedAt: "2024-02-01T00:00:00.000Z",
      data: { name: "Elodie St Clair" },
    },
    {
      id: "unique-id",
      updatedAt: "2024-01-15T00:00:00.000Z",
      data: { name: "Lucien" },
    },
  ]);

  assert.deepEqual(records.map((record) => record.id), ["elodie-st-clair", "lucien"]);
  assert.equal(records[0].data.name, "Elodie St Clair");
});

test("parseRouteId decodes route ids and strips the legacy prefix", () => {
  assert.equal(parseRouteId("1000yo.Ana%20Mar%C3%ADa"), "Ana María");
  assert.equal(parseRouteId("plain-route"), "plain-route");
});

test("createStoredRecord serializes character and campaign state together", () => {
  const character = new Character("Aster");
  character.addMemory("A first memory");
  character.addSkill("Swordplay");

  const record = createStoredRecord({
    selectedVampireId: "aster",
    character,
    serializeCampaignState,
    promptState: {
      currentPrompt: 4,
      visits: new Map([[4, 2]]),
    },
  });

  assert.equal(record.id, "aster");
  assert.equal(record.data.name, "Aster");
  assert.equal(record.data.memories.length, 1);
  assert.deepEqual(record.campaign, {
    currentPrompt: 4,
    visits: [[4, 2]],
  });
});
