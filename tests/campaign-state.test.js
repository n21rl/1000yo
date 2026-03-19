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
  });
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
