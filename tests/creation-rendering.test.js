import test from "node:test";
import assert from "node:assert/strict";
import { renderStep } from "../src/features/creation/rendering.js";

test("renderStep updates controls for current step", () => {
  const elements = {
    stepPanels: [{ hidden: false }, { hidden: false }, { hidden: false }],
    stepProgress: { textContent: "" },
    stepProgressFill: { style: { width: "" } },
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
  assert.equal(elements.stepProgress.textContent, "2 / 3");
  assert.equal(elements.stepProgressFill.style.width, "66.66666666666666%");
  assert.equal(elements.backButton.disabled, false);
  assert.equal(elements.nextButton.textContent, "Next");
  assert.equal(elements.nextButton.disabled, true);
});

test("renderStep labels the final step's Next button as Save & Play", () => {
  const elements = {
    stepPanels: [{ hidden: false }],
    stepProgress: { textContent: "" },
    backButton: { disabled: false },
    nextButton: { textContent: "", disabled: false },
  };

  renderStep({
    elements,
    currentStep: 7,
    totalSteps: 8,
    canAdvanceFromStep: () => true,
  });

  assert.equal(elements.nextButton.textContent, "Save & Play");
});
