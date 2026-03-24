import test from "node:test";
import assert from "node:assert/strict";
import { clampPromptIndex, getPromptEntry, parseCsv, parsePromptDeck } from "../src/prompt-deck.js";

test("parseCsv handles quoted commas and escaped quotes", () => {
  const rows = parseCsv('a,b,c\n"one, two","said ""hi""",last');

  assert.deepEqual(rows, [
    ["a", "b", "c"],
    ["one, two", 'said "hi"', "last"],
  ]);
});

test("parsePromptDeck supports optional header and trims rows", () => {
  const withHeader = parsePromptDeck("a,b,c\n first , second , third \n,,\n");
  const withoutHeader = parsePromptDeck("first,second,third");

  assert.deepEqual(withHeader, [{ a: "first", b: "second", c: "third" }]);
  assert.deepEqual(withoutHeader, [{ a: "first", b: "second", c: "third" }]);
});

test("getPromptEntry and clampPromptIndex enforce prompt boundaries", () => {
  const prompt = { a: "A", b: "B", c: "C" };

  assert.equal(getPromptEntry(prompt, 1), "A");
  assert.equal(getPromptEntry(prompt, 3), "C");
  assert.equal(getPromptEntry(prompt, 4), "");
  assert.equal(clampPromptIndex(0, 10), 1);
  assert.equal(clampPromptIndex(12, 10), 10);
  assert.equal(clampPromptIndex(5, 0), 1);
});
