import test from "node:test";
import assert from "node:assert/strict";
import { getPromptEntry, loadPromptDeck, moveToNextAvailablePrompt, parsePromptDeck } from "../src/prompts.js";

test("parsePromptDeck ignores an a/b/c header row", () => {
  const deck = parsePromptDeck('a,b,c\nOne,Two,Three\nFour,,Six');

  assert.deepEqual(deck, [
    { a: "One", b: "Two", c: "Three" },
    { a: "Four", b: "", c: "Six" },
  ]);
});

test("moveToNextAvailablePrompt advances until it finds an unused entry", () => {
  const promptState = {
    deck: [
      { a: "Prompt 1A", b: "", c: "" },
      { a: "Prompt 2A", b: "Prompt 2B", c: "" },
    ],
    currentPrompt: 1,
    visits: new Map([[1, 1]]),
  };

  const result = moveToNextAvailablePrompt(promptState, 1);

  assert.deepEqual(result, { prompt: 2, visit: 1 });
  assert.equal(getPromptEntry(promptState.deck[1], result.visit), "Prompt 2A");
  assert.deepEqual([...promptState.visits.entries()], [
    [1, 2],
    [2, 1],
  ]);
});

test("loadPromptDeck uses the provided fetch implementation and lifecycle hooks", async () => {
  const promptState = {
    deck: [],
    isLoading: false,
    loadError: "",
    currentPrompt: 1,
    visits: new Map(),
  };
  const calls = [];

  await loadPromptDeck({
    promptState,
    fetchImpl: async (url) => {
      calls.push(`fetch:${url}`);
      return {
        ok: true,
        text: async () => "a,b,c\nOne,Two,Three",
      };
    },
    onLoading: () => calls.push("loading"),
    onLoaded: () => calls.push("loaded"),
  });

  assert.deepEqual(calls, ["loading", "fetch:/refs/prompts.csv", "loaded"]);
  assert.deepEqual(promptState.deck, [{ a: "One", b: "Two", c: "Three" }]);
  assert.equal(promptState.isLoading, false);
  assert.equal(promptState.loadError, "");
});

test("loadPromptDeck records a load error when fetch fails", async () => {
  const promptState = {
    deck: [],
    isLoading: false,
    loadError: "",
    currentPrompt: 1,
    visits: new Map(),
  };
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await loadPromptDeck({
      promptState,
      fetchImpl: async () => ({ ok: false, status: 503 }),
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(promptState.isLoading, false);
  assert.equal(promptState.loadError, "Unable to load prompt data from refs/prompts.csv.");
  assert.deepEqual(promptState.deck, []);
});
