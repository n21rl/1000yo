export const bindCreationEvents = ({
  elements,
  getCharacter,
  markDirty,
  render,
  renderStep,
  getSelectedTraitLabels,
  selectedLaterTraitIds,
  selectedCurseTraitIds,
  minMemoryTraits,
  saveIdentityStep,
  saveImmortalStep,
  saveMarkStep,
  saveCurseMemoryStep,
  getCurrentStep,
  setCurrentStep,
  totalSteps,
  isStepComplete,
  setHasSavedSetup,
  persistCurrentCharacter,
  startPlay,
  startNewVampire,
}) => {
  elements.newVampireButton.addEventListener("click", () => startNewVampire());
  elements.nameInput.addEventListener("input", () => {
    markDirty();
    getCharacter().rename(elements.nameInput.value);
    renderStep();
  });
  elements.identityMemoryInput.addEventListener("input", () => {
    markDirty();
    renderStep();
  });
  elements.memoryCurse.addEventListener("input", () => {
    markDirty();
    renderStep();
  });

  elements.mortalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (getCharacter().addCharacter(elements.mortalName.value, elements.mortalDescription.value, "mortal")) {
      markDirty();
      elements.mortalForm.reset();
      render();
    }
  });

  elements.skillForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (getCharacter().addSkill(elements.skillName.value, elements.skillDescription.value)) {
      markDirty();
      elements.skillForm.reset();
      render();
    }
  });

  elements.resourceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (getCharacter().addResource(elements.resourceName.value, elements.resourceDescription.value)) {
      markDirty();
      elements.resourceForm.reset();
      render();
    }
  });

  elements.memoryFormLater.addEventListener("submit", (event) => {
    event.preventDefault();
    if (getCharacter().memories.length < 1 || getCharacter().memories.length >= 4) return;
    if (selectedLaterTraitIds.size < minMemoryTraits) return;
    if (getCharacter().addMemory(elements.memoryLater.value, getSelectedTraitLabels(selectedLaterTraitIds))) {
      markDirty();
      elements.memoryFormLater.reset();
      selectedLaterTraitIds.clear();
      render();
    }
  });

  elements.immortalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (getCharacter().addCharacter(elements.immortalName.value, elements.immortalDescription.value, "immortal")) {
      markDirty();
      elements.immortalForm.reset();
      render();
    }
  });

  elements.markForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (getCharacter().addMark(elements.markInput.value, elements.markDescription.value)) {
      markDirty();
      elements.markForm.reset();
      render();
    }
  });

  elements.memoryFormCurse.addEventListener("submit", (event) => {
    event.preventDefault();
    if (getCharacter().memories.length !== 4) return;
    if (selectedCurseTraitIds.size < minMemoryTraits) return;
    if (getCharacter().addMemory(elements.memoryCurse.value, getSelectedTraitLabels(selectedCurseTraitIds))) {
      markDirty();
      elements.memoryFormCurse.reset();
      selectedCurseTraitIds.clear();
      render();
    }
  });

  elements.backButton.addEventListener("click", () => {
    setCurrentStep(Math.max(0, getCurrentStep() - 1));
    renderStep();
  });

  elements.nextButton.addEventListener("click", () => {
    const currentStep = getCurrentStep();
    if (currentStep === 0) {
      if (!saveIdentityStep()) return;
      setCurrentStep(1);
      render();
      return;
    }
    if (currentStep === 5) {
      if (!saveImmortalStep()) return;
      setCurrentStep(6);
      render();
      return;
    }
    if (currentStep === 6) {
      if (!saveMarkStep()) return;
      setCurrentStep(7);
      render();
      return;
    }
    if (currentStep === 7) {
      if (!saveCurseMemoryStep()) return;
      setHasSavedSetup(getCharacter().isReadyForPromptOne());
      persistCurrentCharacter();
      if (!getCharacter().isReadyForPromptOne()) {
        render();
        return;
      }
      void startPlay();
      return;
    }
    if (!isStepComplete(currentStep)) return;
    setCurrentStep(Math.min(totalSteps - 1, currentStep + 1));
    render();
  });
};
