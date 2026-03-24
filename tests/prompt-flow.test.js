import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceToNextPromptEntry,
  createPromptState,
  ensurePromptVisit,
  getPromptPanelViewModel,
  normalizeLoadedPromptState,
} from "../src/features/prompt-flow.js";

test("createPromptState initializes empty prompt state", () => {
  const state = createPromptState();
  assert.equal(state.currentPrompt, 1);
  assert.equal(state.deck.length, 0);
  assert.equal(state.visits.size, 0);
});

test("advanceToNextPromptEntry increments visits and selects first available entry", () => {
  const state = createPromptState();
  state.deck = [
    { a: "", b: "", c: "" },
    { a: "Prompt 2A", b: "", c: "" },
  ];

  const result = advanceToNextPromptEntry(state, 1);

  assert.deepEqual(result, { prompt: 2, visit: 1 });
  assert.equal(state.currentPrompt, 2);
  assert.equal(state.visits.get(1), 1);
  assert.equal(state.visits.get(2), 1);
});

test("getPromptPanelViewModel reports loading, errors, and prompt text", () => {
  const state = createPromptState();
  state.isLoading = true;
  assert.deepEqual(getPromptPanelViewModel(state), { disabled: true, text: "Loading prompts..." });

  state.isLoading = false;
  state.loadError = "oops";
  assert.deepEqual(getPromptPanelViewModel(state), { disabled: true, text: "oops" });

  state.loadError = "";
  state.deck = [{ a: "A", b: "B", c: "C" }];
  state.visits.set(1, 1);
  assert.deepEqual(getPromptPanelViewModel(state), { disabled: false, text: "A" });
});

test("normalizeLoadedPromptState and ensurePromptVisit seed current visit", () => {
  const state = createPromptState();
  state.deck = [{ a: "A", b: "", c: "" }];
  state.currentPrompt = 9;

  normalizeLoadedPromptState(state);
  assert.equal(state.currentPrompt, 1);
  assert.equal(state.visits.get(1), 1);

  const changed = ensurePromptVisit(state);
  assert.equal(changed, false);
});
