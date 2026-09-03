import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceToNextPromptEntry,
  createPromptState,
  ensurePromptVisit,
  formatPromptStamp,
  getPromptPanelViewModel,
  isPromptResolved,
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
  assert.deepEqual(getPromptPanelViewModel(state), {
    disabled: true,
    rollDisabled: true,
    resolved: false,
    statusLabel: "",
    text: "Loading prompts...",
  });

  state.isLoading = false;
  state.loadError = "oops";
  assert.deepEqual(getPromptPanelViewModel(state), {
    disabled: true,
    rollDisabled: true,
    resolved: false,
    statusLabel: "",
    text: "oops",
  });

  state.loadError = "";
  state.deck = [{ a: "A", b: "B", c: "C" }];
  state.visits.set(1, 1);
  assert.deepEqual(getPromptPanelViewModel(state), {
    disabled: false,
    rollDisabled: true,
    resolved: false,
    statusLabel: "Prompt unresolved",
    text: "A",
  });
  assert.deepEqual(getPromptPanelViewModel(state, { resolved: true }), {
    disabled: false,
    rollDisabled: false,
    resolved: true,
    statusLabel: "Prompt resolved",
    text: "A",
  });
});

test("formatPromptStamp maps visit counts to a/b/c letters", () => {
  assert.equal(formatPromptStamp(1, 1), "1a");
  assert.equal(formatPromptStamp(14, 2), "14b");
  assert.equal(formatPromptStamp(7, 3), "7c");
  assert.equal(formatPromptStamp(7, 4), "7");
});

test("isPromptResolved checks for a stamped experience matching the current prompt+visit", () => {
  const state = createPromptState();
  state.currentPrompt = 14;
  state.visits.set(14, 2);

  const noExperiences = { memories: [] };
  assert.equal(isPromptResolved(state, noExperiences), false);

  const wrongStamp = { memories: [{ experiences: [{ prompt: "14a" }] }] };
  assert.equal(isPromptResolved(state, wrongStamp), false);

  const matchingStamp = { memories: [{ experiences: [{ prompt: "7a" }, { prompt: "14b" }] }] };
  assert.equal(isPromptResolved(state, matchingStamp), true);

  assert.equal(isPromptResolved(state, null), false);
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
