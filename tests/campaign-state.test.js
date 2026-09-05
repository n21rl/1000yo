import test from "node:test";
import assert from "node:assert/strict";
import { restoreCampaignState, serializeCampaignState } from "../src/campaign-state.js";

test("serializeCampaignState stores current prompt and ordered visit counts", () => {
  const serialized = serializeCampaignState({
    currentPrompt: 7,
    visits: new Map([
      [4, 2],
      [1, 1],
      [9, 3],
    ]),
  });

  assert.deepEqual(serialized, {
    currentPrompt: 7,
    visits: [
      [1, 1],
      [4, 2],
      [9, 3],
    ],
    resolved: [],
    signature: null,
  });
});

test("serializeCampaignState round-trips declared resolutions and the signature", () => {
  const signature = { traits: 8, used: 2, lost: 1, experiences: 6 };
  const serialized = serializeCampaignState({
    currentPrompt: 2,
    visits: new Map([[2, 1]]),
    resolved: new Set(["1a", "2a"]),
    signature,
  });

  assert.deepEqual(serialized.resolved, ["1a", "2a"]);
  assert.deepEqual(serialized.signature, signature);

  const restored = restoreCampaignState(serialized);
  assert.equal(restored.resolved.has("2a"), true);
  assert.equal(restored.resolved.has("9c"), false);
  assert.deepEqual(restored.signature, signature);
});

test("restoreCampaignState defaults resolutions and signature for an old save", () => {
  const restored = restoreCampaignState({ currentPrompt: 3, visits: [[3, 1]] });
  assert.equal(restored.resolved.size, 0);
  assert.equal(restored.signature, null);
});

test("restoreCampaignState ignores invalid entries and rebuilds a Map", () => {
  const restored = restoreCampaignState({
    currentPrompt: "4",
    visits: [
      [3, 2],
      ["bad", 8],
      [5, 0],
      [8, "1"],
    ],
  });

  assert.equal(restored.currentPrompt, 4);
  assert.deepEqual([...restored.visits.entries()], [
    [3, 2],
    [8, 1],
  ]);
});

test("restoreCampaignState falls back to the first saved prompt or prompt one", () => {
  const restoredFromVisits = restoreCampaignState({
    currentPrompt: 0,
    visits: [
      [6, 1],
      [2, 3],
    ],
  });
  const restoredEmpty = restoreCampaignState({});

  assert.equal(restoredFromVisits.currentPrompt, 6);
  assert.deepEqual([...restoredFromVisits.visits.entries()], [
    [6, 1],
    [2, 3],
  ]);
  assert.equal(restoredEmpty.currentPrompt, 1);
  assert.deepEqual([...restoredEmpty.visits.entries()], []);
});
