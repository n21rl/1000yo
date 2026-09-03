export const WIZARD_STEP_LABELS = [
  "Identity",
  "Mortals",
  "Skills",
  "Resources",
  "Memories",
  "Immortal",
  "Mark",
  "Curse",
];

export const renderStep = ({ elements, currentStep, totalSteps, canAdvanceFromStep }) => {
  elements.stepPanels.forEach((panel, index) => {
    panel.hidden = currentStep !== index;
  });
  elements.stepProgress.textContent = `${currentStep + 1} / ${totalSteps}`;
  if (elements.wizardStepLabel) elements.wizardStepLabel.textContent = WIZARD_STEP_LABELS[currentStep] ?? "";
  if (elements.stepProgressFill) elements.stepProgressFill.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;
  elements.backButton.disabled = currentStep === 0;
  elements.nextButton.textContent = currentStep === totalSteps - 1 ? "Save & Play" : "Next";
  elements.nextButton.disabled = !canAdvanceFromStep(currentStep);
};

export const renderCreation = ({
  character,
  elements,
  selectedLaterTraitIds,
  selectedCurseTraitIds,
  syncSelectedTraits,
  renderMemoryList,
  renderCharacterList,
  renderDetailList,
  renderTraitSelector,
  hasSavedSetup,
  renderStep,
}) => {
  syncSelectedTraits(selectedLaterTraitIds);
  syncSelectedTraits(selectedCurseTraitIds);
  elements.nameInput.value = character.name;
  renderMemoryList(elements.identityMemoryList, 0, 1);
  renderCharacterList(elements.mortalList, "mortal");
  renderDetailList(elements.skillList, character.skills, (index) => character.removeSkill(index));
  renderDetailList(elements.resourceList, character.resources, (index) => character.removeResource(index));
  renderMemoryList(elements.laterMemoryList, 1, 4);
  renderCharacterList(elements.immortalList, "immortal");
  renderDetailList(elements.markList, character.marks, (index) => character.removeMark(index));
  renderMemoryList(elements.curseMemoryList, 4, 5);
  renderTraitSelector(elements.memoryTraitsLater, selectedLaterTraitIds);
  renderTraitSelector(elements.memoryTraitsCurse, selectedCurseTraitIds);
  elements.saveConfirmation.hidden = !hasSavedSetup;
  renderStep();
};
