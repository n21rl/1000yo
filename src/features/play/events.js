export const bindPlayEvents = ({
  elements,
  promptState,
  rollDie,
  advanceToNextPromptEntry,
  collapseSettledRecords,
  persistCurrentCharacter,
  render,
  collapsedCards,
  maxMemories,
  setActiveModal,
  openExperienceComposer,
  getCharacter,
  getExperienceComposer,
  pendingExperienceTraitIds,
  markDirty,
  closeExperienceComposer,
  openTraitForm,
  getEditingTrait,
  setEditingTrait,
  getActiveModal,
  setPendingDiaryMemoryId,
  getPendingDiaryMemoryId,
}) => {
  elements.promptButton.addEventListener("click", () => {
    if (promptState.isLoading || promptState.loadError || !promptState.deck.length) return;
    const delta = rollDie(10) - rollDie(6);
    const target = promptState.currentPrompt + delta;
    advanceToNextPromptEntry(promptState, target);
    collapseSettledRecords();
    persistCurrentCharacter();
    render();
  });

  elements.addMemoryButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (getCharacter().memories.length >= maxMemories) return;
    collapsedCards.delete("memories");
    setActiveModal("memory");
    openExperienceComposer("new");
    render();
  });

  elements.lostMemoriesToggle.addEventListener("click", () => {
    if (collapsedCards.has("lost-memories")) collapsedCards.delete("lost-memories");
    else collapsedCards.add("lost-memories");
    render();
  });

  elements.playExperienceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const experienceComposer = getExperienceComposer();
    const memoryId = experienceComposer.target === "new" ? null : experienceComposer.target;
    const didSave = getCharacter().addMemory(elements.playExperienceText.value, [...pendingExperienceTraitIds], memoryId);
    if (!didSave) return;
    markDirty();
    closeExperienceComposer();
    setActiveModal(null);
    render();
  });

  elements.playExperienceCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    closeExperienceComposer();
    setActiveModal(null);
    render();
  });

  elements.addSkillButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openTraitForm("skill");
  });
  elements.addResourceButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openTraitForm("resource");
  });
  elements.addCharacterButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openTraitForm("character");
  });

  elements.playSkillForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingTrait = getEditingTrait();
    const didSave = editingTrait?.kind === "skill"
      ? getCharacter().updateSkill(editingTrait.index, elements.playSkillName.value, elements.playSkillDescription.value)
      : getCharacter().addSkill(elements.playSkillName.value, elements.playSkillDescription.value);
    if (!didSave) return;
    markDirty();
    setActiveModal(null);
    setEditingTrait(null);
    elements.playSkillForm.reset();
    render();
  });
  elements.playResourceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingTrait = getEditingTrait();
    const didSave = editingTrait?.kind === "resource"
      ? getCharacter().updateResource(editingTrait.index, elements.playResourceName.value, elements.playResourceDescription.value)
      : getCharacter().addResource(elements.playResourceName.value, elements.playResourceDescription.value);
    if (!didSave) return;
    markDirty();
    setActiveModal(null);
    setEditingTrait(null);
    elements.playResourceForm.reset();
    render();
  });
  elements.playDiaryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const pendingDiaryMemoryId = getPendingDiaryMemoryId();
    if (!pendingDiaryMemoryId) return;
    const didSave = getCharacter().moveMemoryToDiary(pendingDiaryMemoryId, elements.playDiaryDescription.value);
    if (!didSave) return;
    markDirty();
    setActiveModal(null);
    setPendingDiaryMemoryId("");
    elements.playDiaryForm.reset();
    render();
  });
  elements.playCharacterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingTrait = getEditingTrait();
    const didSave = editingTrait?.kind === "character"
      ? getCharacter().updateCharacter(editingTrait.index, elements.playCharacterName.value, elements.playCharacterDescription.value, elements.playCharacterType.value)
      : getCharacter().addCharacter(elements.playCharacterName.value, elements.playCharacterDescription.value, elements.playCharacterType.value);
    if (!didSave) return;
    markDirty();
    setActiveModal(null);
    setEditingTrait(null);
    elements.playCharacterForm.reset();
    render();
  });

  elements.playSkillCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    setActiveModal(null);
    const editingTrait = getEditingTrait();
    setEditingTrait(editingTrait?.kind === "skill" ? null : editingTrait);
    elements.playSkillForm.reset();
    render();
  });
  elements.playResourceCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    setActiveModal(null);
    const editingTrait = getEditingTrait();
    setEditingTrait(editingTrait?.kind === "resource" ? null : editingTrait);
    elements.playResourceForm.reset();
    render();
  });
  elements.playCharacterCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    setActiveModal(null);
    const editingTrait = getEditingTrait();
    setEditingTrait(editingTrait?.kind === "character" ? null : editingTrait);
    elements.playCharacterForm.reset();
    render();
  });
  elements.playDiaryCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    setActiveModal(null);
    setPendingDiaryMemoryId("");
    elements.playDiaryForm.reset();
    render();
  });
};
