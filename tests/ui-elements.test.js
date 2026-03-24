import test from "node:test";
import assert from "node:assert/strict";
import { ELEMENT_SELECTORS } from "../src/ui/elements.js";

test("ELEMENT_SELECTORS defines stable selectors for core screens and controls", () => {
  assert.equal(ELEMENT_SELECTORS.menuScreen, "#menu-screen");
  assert.equal(ELEMENT_SELECTORS.creationScreen, "#creation-screen");
  assert.equal(ELEMENT_SELECTORS.playScreen, "#play-screen");
  assert.equal(ELEMENT_SELECTORS.promptButton, "#next-prompt-button");
  assert.equal(ELEMENT_SELECTORS.playExperienceForm, "#play-experience-form");
});
