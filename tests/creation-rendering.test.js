import test from "node:test";
import assert from "node:assert/strict";
import { renderStep } from "../src/features/creation/rendering.js";

test("renderStep updates controls for current step", () => {
  const elements = {
    stepPanels: [{ hidden: false }, { hidden: false }, { hidden: false }],
    stepProgress: { textContent: "" },
    backButton: { disabled: false },
    nextButton: { textContent: "", disabled: false },
  };

  renderStep({
    elements,
    currentStep: 1,
    totalSteps: 3,
    canAdvanceFromStep: () => false,
  });

  assert.equal(elements.stepPanels[0].hidden, true);
  assert.equal(elements.stepPanels[1].hidden, false);
  assert.equal(elements.stepPanels[2].hidden, true);
  assert.equal(elements.stepProgress.textContent, "2/3");
  assert.equal(elements.backButton.disabled, false);
  assert.equal(elements.nextButton.textContent, "Next");
  assert.equal(elements.nextButton.disabled, true);
});
