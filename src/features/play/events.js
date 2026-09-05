import { formatPromptStamp, getPlaySignature } from "../prompt-flow.js";
import { openActionSheet, openAlertDialog, openConfirmDialog, openPromptDialog } from "../../ui/dialog.js";

export const bindPlayEvents = ({
  elements,
  promptState,
  rollDie,
  advanceToNextPromptEntry,
  persistCurrentCharacter,
  render,
  setActiveModal,
  getCharacter,
  pendingExperienceTraitIds,
  markDirty,
  closeExperienceComposer,
  openTraitForm,
  getEditingTrait,
  setEditingTrait,
  setPendingDiaryMemoryId,
  getPendingDiaryMemoryId,
  updatePlayExperienceActionState,
  getActivePlayTab,
  setActivePlayTab,
  getActiveTraitSubtab,
  setActiveTraitSubtab,
  getActiveMemoryDetailId,
  setActiveMemoryDetailId,
  toggleTraitSortRecent,
  loadStoredVampires,
  persistStoredVampires,
  setScreen,
  getSelectedVampireId,
  setSelectedVampireId,
  testVampireId,
  openMemoryMoreMenu,
  openIdentityMenu,
  resolveCurrentPrompt,
}) => {
  const currentPromptStamp = () =>
    formatPromptStamp(promptState.currentPrompt, promptState.visits.get(promptState.currentPrompt) ?? 1);

  elements.promptResolveButton.addEventListener("click", () => {
    resolveCurrentPrompt();
  });

  elements.promptButton.addEventListener("click", () => {
    if (promptState.isLoading || promptState.loadError || !promptState.deck.length) return;
    const delta = rollDie(10) - rollDie(6);
    const target = promptState.currentPrompt + delta;
    advanceToNextPromptEntry(promptState, target);
    /* The next prompt starts from here, so anything changed from now on
       counts as its answer (see getResolutionWarnings). */
    promptState.signature = getPlaySignature(getCharacter());
    persistCurrentCharacter();
    render();
  });

  elements.playBottomTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActivePlayTab(tab.dataset.playTab);
      setActiveMemoryDetailId(null);
      render();
    });
  });

  elements.traitSubtabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTraitSubtab(button.dataset.traitSubtab);
      render();
    });
  });

  elements.traitSortButton.addEventListener("click", () => {
    toggleTraitSortRecent();
    render();
  });

  elements.playHeaderBack.addEventListener("click", () => {
    setActiveMemoryDetailId(null);
    render();
  });

  elements.addMemoryButton.addEventListener("click", async () => {
    const character = getCharacter();
    /* The full slate is surfaced when it's in the way, rather than by a
       standing note under the list. The button is only aria-disabled, so
       the press still lands here and can say what to do about it. */
    if (character.activeMemories.length >= character.memorySlots) {
      await openAlertDialog({
        title: "Every slot is full",
        body: "A new memory needs a free slot. Open a memory and use its ⋮ to forget it or move it to the Diary.",
      });
      return;
    }
    const text = await openPromptDialog({ title: "Add a memory", label: "First experience" });
    if (text === null) return;
    const didSave = character.addMemory(text, [], null, currentPromptStamp());
    if (!didSave) return;
    markDirty();
    render();
  });


  elements.playHamburgerButton.addEventListener("click", async () => {
    const character = getCharacter();
    const choice = await openActionSheet({
      title: "Menu",
      actions: [
        { id: "home", label: "Home" },
        { id: "saves", label: "Saves" },
        { id: "delete", label: "Delete save", danger: true },
      ],
    });

    if (choice === "home") {
      setScreen("menu", { updateRoute: true });
      render();
      return;
    }
    if (choice === "saves") {
      setScreen("saves", { updateRoute: true });
      render();
      return;
    }
    if (choice === "delete") {
      const confirmed = await openConfirmDialog({
        title: "Delete save?",
        body: `Delete ${character.name || "this vampire"}? This cannot be undone.`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (!confirmed) return;
      const vampireId = getSelectedVampireId();
      const remaining = loadStoredVampires().filter((entry) => entry.id !== vampireId && entry.id !== testVampireId);
      persistStoredVampires(remaining);
      setSelectedVampireId("");
      setScreen("menu", { updateRoute: true });
      render();
    }
  });

  elements.playAvatarButton.addEventListener("click", () => {
    void openIdentityMenu();
  });

  elements.memorySlotsMoreButton.addEventListener("click", async () => {
    const character = getCharacter();
    const choice = await openActionSheet({
      title: "Memory slots",
      actions: [
        { id: "add-slot", label: "Add memory slot" },
        { id: "remove-slot", label: "Remove memory slot" },
      ],
    });

    if (choice === "add-slot") {
      const confirmed = await openConfirmDialog({
        title: "Add memory slot?",
        body: "5 memory slots is the standard limit. This isn't standard play, but some prompts can require it.",
        confirmLabel: "Add slot",
      });
      if (!confirmed) return;
      if (!character.setMemorySlots(character.memorySlots + 1)) return;
      markDirty();
      render();
      return;
    }
    if (choice === "remove-slot") {
      const confirmed = await openConfirmDialog({
        title: "Remove memory slot?",
        body: "This isn't standard play, but some prompts can require it.",
      });
      if (!confirmed) return;
      if (!character.setMemorySlots(character.memorySlots - 1)) {
        await openConfirmDialog({
          title: "Unable to remove slot",
          body: "Forget or move a memory first to free up room.",
          confirmLabel: "OK",
          cancelLabel: "OK",
        });
        return;
      }
      markDirty();
      render();
    }
  });

  elements.playMemoryDetailMoreButton.addEventListener("click", () => {
    const memoryId = getActiveMemoryDetailId();
    const memory = getCharacter().memories.find((entry) => entry.id === memoryId);
    if (!memory) return;
    openMemoryMoreMenu(memory);
  });

  elements.playExperienceText.addEventListener("input", () => {
    updatePlayExperienceActionState();
  });

  elements.playExperienceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const memoryId = getActiveMemoryDetailId();
    if (!memoryId) return;
    const didSave = getCharacter().addMemory(elements.playExperienceText.value, [...pendingExperienceTraitIds], memoryId, currentPromptStamp());
    if (!didSave) return;
    markDirty();
    closeExperienceComposer();
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
    const character = getCharacter();
    const didSave = pendingDiaryMemoryId
      ? character.moveMemoryToDiary(pendingDiaryMemoryId, elements.playDiaryDescription.value)
      : character.createDiary(elements.playDiaryDescription.value);
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
