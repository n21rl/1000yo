export const bindPlayEvents = ({
  elements,
  promptState,
  rollDie,
  advanceToNextPromptEntry,
  collapseSettledRecords,
  persistCurrentCharacter,
  render,
  collapsedCards,
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
    const character = getCharacter();
    if (character.activeMemories.length >= character.memorySlots) {
      if (!window.confirm("No free memory slots. Add a new slot first?")) return;
      const didAddSlot = character.setMemorySlots(character.memorySlots + 1);
      if (!didAddSlot) {
        window.alert("Unable to add a new memory slot.");
        return;
      }
      markDirty();
    }
    collapsedCards.delete("memories");
    openExperienceComposer({ mode: "memory", target: null });
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
    const memoryId = experienceComposer.mode === "memory" ? null : experienceComposer.target;
    if (experienceComposer.mode !== "memory" && !memoryId) {
      window.alert("Select a memory target before adding an experience.");
      return;
    }
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
  elements.addMarkButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openTraitForm("mark");
  });
  elements.editPlayNameButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const nextName = window.prompt("Edit vampire name", getCharacter().name);
    if (nextName === null) return;
    const didSave = getCharacter().rename(nextName);
    if (!didSave) return;
    markDirty();
    render();
  });
  elements.increaseMemorySlotsButton.addEventListener("click", () => {
    if (!window.confirm("Add a memory slot?")) return;
    const didSave = getCharacter().setMemorySlots(getCharacter().memorySlots + 1);
    if (!didSave) return;
    markDirty();
    render();
  });
  elements.decreaseMemorySlotsButton.addEventListener("click", () => {
    const target = getCharacter().memorySlots - 1;
    if (target < 1) return;
    if (!window.confirm("Remove a memory slot? This can block new memories until slots are free.")) return;
    const didSave = getCharacter().setMemorySlots(target);
    if (!didSave) {
      window.alert("Cannot remove a slot while active memories exceed the target slot count.");
      return;
    }
    markDirty();
    render();
  });

  elements.playSkillForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingTrait = getEditingTrait();
    const isEditing = editingTrait?.kind === "skill";
    const didSave = editingTrait?.kind === "skill"
      ? getCharacter().updateSkill(editingTrait.index, elements.playSkillName.value, elements.playSkillDescription.value)
      : getCharacter().addSkill(elements.playSkillName.value, elements.playSkillDescription.value);
    if (!didSave) return;
    if (!isEditing) {
      const createdId = getCharacter().skills.at(-1)?.id;
      if (createdId) pendingExperienceTraitIds.add(createdId);
    }
    markDirty();
    setActiveModal(null);
    setEditingTrait(null);
    elements.playSkillForm.reset();
    render();
  });
  elements.playResourceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingTrait = getEditingTrait();
    const isEditing = editingTrait?.kind === "resource";
    const didSave = editingTrait?.kind === "resource"
      ? getCharacter().updateResource(
        editingTrait.index,
        elements.playResourceName.value,
        elements.playResourceDescription.value,
        elements.playResourceStationary.checked,
      )
      : getCharacter().addResource(elements.playResourceName.value, elements.playResourceDescription.value);
    if (!didSave) return;
    if (!isEditing) {
      const createdId = getCharacter().resources.at(-1)?.id;
      if (createdId) pendingExperienceTraitIds.add(createdId);
    }
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
  elements.playMemoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingTrait = getEditingTrait();
    if (editingTrait?.kind !== "memory") return;
    const values = [...elements.playMemoryExperienceFields.querySelectorAll("textarea")]
      .map((input) => input.value);
    const didSave = getCharacter().updateMemoryExperiences(editingTrait.index, values);
    if (!didSave) return;
    markDirty();
    setActiveModal(null);
    setEditingTrait(null);
    elements.playMemoryForm.reset();
    elements.playMemoryExperienceFields.replaceChildren();
    render();
  });
  elements.playCharacterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingTrait = getEditingTrait();
    const isEditing = editingTrait?.kind === "character";
    const didSave = editingTrait?.kind === "character"
      ? getCharacter().updateCharacter(editingTrait.index, elements.playCharacterName.value, elements.playCharacterDescription.value, elements.playCharacterType.value)
      : getCharacter().addCharacter(elements.playCharacterName.value, elements.playCharacterDescription.value, elements.playCharacterType.value);
    if (!didSave) return;
    if (!isEditing) {
      const createdId = getCharacter().characters.at(-1)?.id;
      if (createdId) pendingExperienceTraitIds.add(createdId);
    }
    markDirty();
    setActiveModal(null);
    setEditingTrait(null);
    elements.playCharacterForm.reset();
    render();
  });
  elements.playMarkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingTrait = getEditingTrait();
    const isEditing = editingTrait?.kind === "mark";
    const didSave = editingTrait?.kind === "mark"
      ? getCharacter().updateMark(editingTrait.index, elements.playMarkName.value, elements.playMarkDescription.value)
      : getCharacter().addMark(elements.playMarkName.value, elements.playMarkDescription.value);
    if (!didSave) return;
    if (!isEditing) {
      const createdId = getCharacter().marks.at(-1)?.id;
      if (createdId) pendingExperienceTraitIds.add(createdId);
    }
    markDirty();
    setActiveModal(null);
    setEditingTrait(null);
    elements.playMarkForm.reset();
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
  elements.playMemoryCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    setActiveModal(null);
    const editingTrait = getEditingTrait();
    setEditingTrait(editingTrait?.kind === "memory" ? null : editingTrait);
    elements.playMemoryForm.reset();
    elements.playMemoryExperienceFields.replaceChildren();
    render();
  });
  elements.playMarkCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    setActiveModal(null);
    const editingTrait = getEditingTrait();
    setEditingTrait(editingTrait?.kind === "mark" ? null : editingTrait);
    elements.playMarkForm.reset();
    render();
  });
};
