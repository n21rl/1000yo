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
      if (character.memorySlots >= 5 && !window.confirm("5 memory slots is the standard limit. Are you sure you want to add one?")) return;
      const didAddSlot = character.setMemorySlots(character.memorySlots + 1);
      if (!didAddSlot) {
        window.alert("Unable to add a new memory slot.");
        return;
      }
      markDirty();
    }
    const nextMemory = window.prompt("Add a memory", "");
    if (nextMemory === null) return;
    const didSave = character.addMemory(nextMemory, []);
    if (!didSave) return;
    collapsedCards.delete("memories");
    closeExperienceComposer();
    setActiveModal(null);
    markDirty();
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
    const memoryId = experienceComposer.target;
    if (!memoryId) {
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
  elements.decreaseMemorySlotsButton.addEventListener("click", () => {
    const memories = getCharacter().memories;
    const removableMemories = memories
      .map((memory, index) => ({ memory, index }))
      .filter(({ memory }) => memory && !memory.lost && !memory.storedInDiary);
    if (!removableMemories.length) {
      window.alert("No active memory available to remove.");
      return;
    }
    const options = removableMemories.map(({ index }) => `Memory ${index + 1}`).join(", ");
    const selected = window.prompt(`Which memory should be removed?\n${options}`, `${removableMemories.at(-1).index + 1}`);
    if (selected === null) return;
    const selectedNumber = Number.parseInt(selected, 10);
    if (!Number.isFinite(selectedNumber)) {
      window.alert("Enter a valid memory number.");
      return;
    }
    const removableIndex = removableMemories.find(({ index }) => index + 1 === selectedNumber)?.index;
    if (removableIndex === undefined) {
      window.alert("That memory cannot be removed.");
      return;
    }
    if (!window.confirm(`Remove Memory ${selectedNumber}?`)) return;
    const didSave = getCharacter().removeMemory(removableIndex);
    if (!didSave) {
      window.alert("Unable to remove memory.");
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
