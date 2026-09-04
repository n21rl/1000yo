/* Wiring shared by all three desktop layout mockups.

   Every variation uses the same markup hooks (`data-mk-*`) and the same
   sample content, so the only thing that differs between the three files
   is the layout: where each region sits and how wide it is. Behaviour
   that genuinely differs is expressed as one option — `detailMode`:

   - "replace": the mobile behaviour, kept. Opening a memory replaces the
     memory list in place and the header grows a "← Back".
   - "pane": the list and the memory detail are on screen at once, so
     opening a memory only changes what the detail region shows.

   Classic script, not an ES module — these files open over file://. */

const MKScreens = (() => {
  const { el, icon, data } = MK;

  const state = {
    detailMode: "replace",
    activeMemoryId: null,
    activeTab: "memories",
    activeSubtab: "characters",
    step: 1,
    promptOpen: true,
  };

  const hydrateIcons = (root = document) => {
    root.querySelectorAll("[data-mk-icon]").forEach((node) => {
      node.replaceChildren(icon(node.dataset.mkIcon));
    });
    root.querySelectorAll("[data-mk-icon-prefix]").forEach((node) => {
      if (node.dataset.mkIconDone) return;
      node.dataset.mkIconDone = "true";
      node.prepend(icon(node.dataset.mkIconPrefix));
    });
  };

  const all = (selector) => [...document.querySelectorAll(selector)];
  const one = (selector) => document.querySelector(selector);

  /* --- Memories --- */

  const renderMemoryLists = () => {
    all("[data-mk-memories]").forEach((list) => {
      list.replaceChildren();
      for (let index = 0; index < data.memorySlots; index += 1) {
        const memory = data.memories[index];
        list.append(
          memory
            ? MK.memoryRow(memory, {
                onSelect: selectMemory,
                selected: state.detailMode === "pane" && memory.id === state.activeMemoryId,
              })
            : MK.emptyMemorySlot(),
        );
      }
    });

    all("[data-mk-lost-memories]").forEach((list) => {
      list.replaceChildren();
      data.lostMemories.forEach((memory) => list.append(MK.memoryRow(memory, { lost: true })));
    });

    all("[data-mk-slots]").forEach((node) => {
      node.textContent = `${data.memories.length}/${data.memorySlots}`;
    });
  };

  const renderComposerChips = () => {
    const checked = MK.allTraits().filter((item) => item.used && !item.lost);
    all("[data-mk-composer-chips]").forEach((node) => {
      node.replaceChildren();
      if (checked.length) node.append(MK.taggedTraitChips(checked));
    });
  };

  const renderMemoryDetail = () => {
    const memory = data.memories.find((entry) => entry.id === state.activeMemoryId);
    const hasMemory = Boolean(memory);

    all("[data-mk-memory-detail]").forEach((node) => {
      node.hidden = state.detailMode === "replace" ? !hasMemory : false;
    });
    all("[data-mk-memory-detail-empty]").forEach((node) => {
      node.hidden = hasMemory;
    });
    all("[data-mk-memory-detail-body]").forEach((node) => {
      node.hidden = !hasMemory;
    });
    all("[data-mk-memory-list-view]").forEach((node) => {
      node.hidden = state.detailMode === "replace" && hasMemory;
    });
    all("[data-mk-detail-back], [data-mk-detail-more]").forEach((node) => {
      node.hidden = state.detailMode !== "replace" || !hasMemory;
    });
    /* Same swap the app makes: the hamburger gives up its slot to the
       back button while a memory detail is open. */
    all("[data-mk-hamburger]").forEach((node) => {
      node.hidden = state.detailMode === "replace" && hasMemory;
    });

    if (!hasMemory) return;

    all("[data-mk-detail-title]").forEach((node) => {
      node.textContent = memory.title;
    });
    all("[data-mk-experiences]").forEach((list) => {
      list.replaceChildren();
      memory.experiences.forEach((experience, index) => list.append(MK.experienceItem(experience, index)));
    });
    renderComposerChips();
  };

  const selectMemory = (memory) => {
    state.activeMemoryId = memory.id;
    renderMemoryLists();
    renderMemoryDetail();
  };

  const closeMemoryDetail = () => {
    state.activeMemoryId = null;
    renderMemoryLists();
    renderMemoryDetail();
  };

  /* --- Traits --- */

  const KIND_BY_GROUP = { characters: "character", skills: "skill", resources: "resource", marks: "mark" };

  const renderTraits = () => {
    all("[data-mk-traits]").forEach((list) => {
      const group = list.dataset.mkTraits;
      list.replaceChildren(MK.traitList(KIND_BY_GROUP[group], data.traits[group]));
    });
  };

  const setSubtab = (group) => {
    state.activeSubtab = group;
    all("[data-mk-subtab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.mkSubtab === group);
    });
    all("[data-mk-trait-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.mkTraitPanel !== group;
    });
  };

  /* --- Tabs --- */

  const setTab = (tab) => {
    state.activeTab = tab;
    all("[data-mk-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.mkTab === tab);
    });
    all("[data-mk-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.mkPanel !== tab;
    });
  };

  /* --- Diary --- */

  const renderDiary = () => {
    all("[data-mk-diary-description]").forEach((node) => {
      node.textContent = data.diary.description;
    });
    all("[data-mk-diary-memories]").forEach((list) => {
      list.replaceChildren();
      data.diary.memories.forEach((memory) => list.append(MK.memoryRow(memory)));
    });
  };

  /* --- Saves --- */

  const renderSaves = () => {
    all("[data-mk-saves-list]").forEach((list) => {
      list.replaceChildren();
      data.saves.forEach((vampire) => list.append(MK.savesRow(vampire)));
    });
  };

  /* --- Creation wizard --- */

  const renderStep = () => {
    const index = state.step - 1;
    const step = MK.wizardStepContent[index];
    const total = MK.wizardStepContent.length;

    all("[data-mk-step-label]").forEach((node) => {
      node.textContent = data.wizardSteps[index];
    });
    all("[data-mk-step-count]").forEach((node) => {
      node.textContent = `${state.step} / ${total}`;
    });
    all("[data-mk-step-fill]").forEach((node) => {
      node.style.width = `${(state.step / total) * 100}%`;
    });

    all("[data-mk-step-panel]").forEach((panel) => {
      panel.replaceChildren();
      panel.append(el("h2", "wizard-step-title", step.title), el("p", "wizard-step-hint", step.hint));
      const form = el("form", "wizard-form");
      form.addEventListener("submit", (event) => event.preventDefault());
      form.append(MK.wizardFields(step));
      if (step.addLabel) {
        const add = el("button", "wizard-add-button", step.addLabel);
        add.type = "submit";
        form.append(add);
      }
      panel.append(form);
      if (!panel.hasAttribute("data-mk-step-panel-no-list")) panel.append(MK.wizardAddedList(step));
    });

    /* The sheet pane in layouts B and C shows everything added so far,
       grouped under the step names the wizard already uses as copy —
       not just the current step's list. */
    all("[data-mk-step-added]").forEach((node) => {
      node.replaceChildren();
      MK.wizardStepContent.slice(0, state.step).forEach((entry, entryIndex) => {
        if (!entry.added.length) return;
        node.append(el("div", "wizard-step-label", data.wizardSteps[entryIndex]), MK.wizardAddedList(entry));
      });
    });

    all("[data-mk-step-rail]").forEach((rail) => {
      rail.replaceChildren();
      const stepClass = rail.dataset.mkStepClass || "a-step";
      data.wizardSteps.forEach((label, stepIndex) => {
        const button = el("button", stepClass);
        button.type = "button";
        if (stepIndex + 1 === state.step) button.classList.add("current");
        else if (stepIndex + 1 < state.step) button.classList.add("done");
        button.append(
          el("span", `${stepClass}-number`, String(stepIndex + 1).padStart(2, "0")),
          el("span", null, label),
        );
        button.addEventListener("click", () => {
          state.step = stepIndex + 1;
          renderStep();
        });
        rail.append(button);
      });
    });

    all("[data-mk-step-back]").forEach((button) => {
      button.disabled = state.step === 1;
    });
    hydrateIcons();
  };

  /* --- Prompt card --- */

  const setPromptOpen = (open) => {
    state.promptOpen = open;
    all("[data-mk-prompt-body]").forEach((node) => {
      node.hidden = !open;
    });
    all("[data-mk-prompt-toggle]").forEach((node) => {
      node.setAttribute("aria-expanded", String(open));
    });
  };

  const init = ({ variation, detailMode = "replace", initialScreen = "play" } = {}) => {
    state.detailMode = detailMode;
    if (detailMode === "pane") state.activeMemoryId = data.memories[0].id;

    all("[data-mk-prompt-text]").forEach((node) => {
      node.textContent = data.prompt.text;
    });

    renderSaves();
    renderMemoryLists();
    renderTraits();
    renderDiary();
    renderMemoryDetail();
    renderStep();
    hydrateIcons();

    all("[data-mk-tab]").forEach((button) => {
      button.addEventListener("click", () => setTab(button.dataset.mkTab));
    });
    all("[data-mk-subtab]").forEach((button) => {
      button.addEventListener("click", () => setSubtab(button.dataset.mkSubtab));
    });
    all("[data-mk-prompt-toggle]").forEach((node) => {
      node.addEventListener("click", () => setPromptOpen(!state.promptOpen));
    });
    all("[data-mk-detail-back]").forEach((button) => {
      button.addEventListener("click", closeMemoryDetail);
    });
    all("[data-mk-step-next]").forEach((button) => {
      button.addEventListener("click", () => {
        state.step = Math.min(MK.wizardStepContent.length, state.step + 1);
        renderStep();
      });
    });
    all("[data-mk-step-back]").forEach((button) => {
      button.addEventListener("click", () => {
        state.step = Math.max(1, state.step - 1);
        renderStep();
      });
    });

    /* Checking a trait re-renders the trait lists and the composer's
       tagged-trait chips, the way the app's render() does. */
    document.addEventListener("mk:trait-change", () => {
      renderTraits();
      renderComposerChips();
      hydrateIcons();
    });

    setTab(state.activeTab);
    setSubtab(state.activeSubtab);
    setPromptOpen(true);
    MK.mountChrome({ current: variation, initialScreen });
  };

  return { init, state };
})();
