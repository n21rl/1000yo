import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPERIENCE_BLOCKED,
  advanceToNextPromptEntry,
  createPromptState,
  ensurePromptVisit,
  formatPromptStamp,
  getExperienceAvailability,
  getPlaySignature,
  getPromptPanelViewModel,
  getResolutionWarnings,
  isStampResolved,
  markPromptResolved,
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
    statusLabel: "",
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

const memory = (overrides = {}) => ({
  lost: false,
  storedInDiary: false,
  experiences: [],
  ...overrides,
});

test("getExperienceAvailability allows an experience regardless of the prompt cycle", () => {
  const result = getExperienceAvailability(memory(), { maxExperiences: 3 });
  assert.equal(result.allowed, true);
  assert.equal(result.reason, null);
});

test("getExperienceAvailability blocks a lost or full memory outright", () => {
  assert.equal(getExperienceAvailability(memory({ lost: true }), { maxExperiences: 3 }).reason, EXPERIENCE_BLOCKED.LOST);
  assert.equal(
    getExperienceAvailability(memory({ experiences: [{}, {}, {}] }), { maxExperiences: 3 }).reason,
    EXPERIENCE_BLOCKED.FULL,
  );
});

test("getExperienceAvailability treats the Diary as a block a prompt can override", () => {
  const shelved = memory({ storedInDiary: true });
  assert.equal(getExperienceAvailability(shelved, { maxExperiences: 3 }).reason, EXPERIENCE_BLOCKED.DIARY);
  assert.equal(getExperienceAvailability(shelved, { maxExperiences: 3, allowDiary: true }).allowed, true);
});

test("getExperienceAvailability keeps a full memory blocked even with the Diary override", () => {
  const full = memory({ storedInDiary: true, experiences: [{}, {}, {}] });
  assert.equal(getExperienceAvailability(full, { maxExperiences: 3, allowDiary: true }).reason, EXPERIENCE_BLOCKED.FULL);
});

test("getExperienceAvailability handles a missing memory", () => {
  const result = getExperienceAvailability(null, { maxExperiences: 3 });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, null);
});

test("resolution is declared, not derived", () => {
  const state = createPromptState();
  assert.equal(isStampResolved(state, "2a"), false);
  markPromptResolved(state, "2a");
  assert.equal(isStampResolved(state, "2a"), true);
  assert.equal(isStampResolved(state, "2b"), false);
});

const characterWith = (experiences = [], traits = {}) => ({
  memories: [{ lost: false, experiences }],
  characters: traits.characters ?? [],
  skills: traits.skills ?? [],
  resources: traits.resources ?? [],
  marks: traits.marks ?? [],
});

test("getResolutionWarnings warns when no Experience carries this prompt's stamp", () => {
  const warnings = getResolutionWarnings(characterWith([]), { stamp: "2a" });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^Experience: none/);
});

test("getResolutionWarnings warns when several Experiences carry it", () => {
  const character = characterWith([{ prompt: "2a" }, { prompt: "2a" }]);
  const warnings = getResolutionWarnings(character, { stamp: "2a" });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^Experience: 2 recorded/);
});

test("getResolutionWarnings stays silent for exactly one Experience and a trait change", () => {
  const before = { traits: 1, used: 0, lost: 0, experiences: 0 };
  const character = characterWith([{ prompt: "2a" }], { skills: [{ used: true }] });
  const warnings = getResolutionWarnings(character, { stamp: "2a", signature: before });
  assert.deepEqual(warnings, []);
});

test("getResolutionWarnings warns when no Trait was touched since the prompt began", () => {
  const character = characterWith([{ prompt: "2a" }], { skills: [{ used: false }] });
  const before = getPlaySignature(character);
  const warnings = getResolutionWarnings(character, { stamp: "2a", signature: before });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^Traits: none/);
});
