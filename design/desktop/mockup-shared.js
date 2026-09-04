/* Shared scaffolding for the desktop layout mockups in this folder.

   These files are throwaway design mockups, not app code: they link the
   real `src/styles.css` so component styling can't drift from the app,
   and each variation adds only the CSS its desktop *layout* needs. This
   file supplies the sample content and the row builders, so all three
   variations show identical content and only the layout differs.

   Classic script (not an ES module) on purpose: these open straight from
   the filesystem, and module scripts are blocked over file://. */

(function (global) {
  /* Copied from src/ui/icons.js (subset used by the mockups). */
  const ICON_NODES = {
    add: [["path", { d: "M12 5v14" }], ["path", { d: "M5 12h14" }]],
    close: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
    check_box_outline_blank: [["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2.5" }]],
    check_box: [
      ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2.5" }],
      ["path", { d: "m8.5 12 2.5 2.5 4.5-5" }],
    ],
    menu_book: [
      ["path", { d: "M6 5.5A2.5 2.5 0 0 1 8.5 3H20v17H8.5A2.5 2.5 0 0 0 6 22" }],
      ["path", { d: "M6 5.5V22" }],
      ["path", { d: "M9.5 7H16" }],
    ],
    book_2: [
      ["path", { d: "M5 5.5A2.5 2.5 0 0 1 7.5 3H19v17H7.5A2.5 2.5 0 0 0 5 20" }],
      ["path", { d: "M5 5.5V20" }],
      ["path", { d: "M8.5 8H15" }],
      ["path", { d: "M8.5 12H15" }],
    ],
    delete: [
      ["path", { d: "M5 7h14" }],
      ["path", { d: "M9 7V5h6v2" }],
      ["path", { d: "M8 7l1 12h6l1-12" }],
      ["path", { d: "M10 10.5v5.5" }],
      ["path", { d: "M14 10.5v5.5" }],
    ],
    keyboard_arrow_down: [["path", { d: "m7 10 5 5 5-5" }]],
    sticky_note_2: [
      ["path", { d: "M6 4h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" }],
      ["path", { d: "M14 4v5h5" }],
    ],
    cognition: [
      ["path", { d: "M9.5 7a3.5 3.5 0 0 0-3.5 3.5c0 1 .42 1.9 1.1 2.54A3 3 0 0 0 9 18h1" }],
      ["path", { d: "M14.5 7a3.5 3.5 0 0 1 3.5 3.5c0 1-.42 1.9-1.1 2.54A3 3 0 0 1 15 18h-1" }],
      ["path", { d: "M12 6v12" }],
      ["path", { d: "M9 10.5h6" }],
      ["path", { d: "M9.5 14.5h5" }],
    ],
    person: [["circle", { cx: "12", cy: "8", r: "3" }], ["path", { d: "M6 19a6 6 0 0 1 12 0" }]],
    bolt: [["path", { d: "M13 3 6.5 13H11l-1 8 6.5-10H12z" }]],
    deployed_code: [
      ["path", { d: "m8.5 9-3 3 3 3" }],
      ["path", { d: "m15.5 9 3 3-3 3" }],
      ["path", { d: "M10 19h4" }],
      ["path", { d: "M12 5v10" }],
      ["path", { d: "M8 5h8" }],
    ],
    local_fire_department: [
      ["path", { d: "M12 3c1.5 2.5 4.5 4.4 4.5 8.1A4.5 4.5 0 1 1 7.5 11c0-1.8.8-3.2 2.3-4.8.2 1.5 1 2.4 2.2 3.1C13 7.8 13 5.7 12 3z" }],
    ],
    chevron_right: [["path", { d: "m9 18 6-6-6-6" }]],
    more_vert: [
      ["circle", { cx: "12", cy: "5", r: "1", fill: "currentColor", stroke: "none" }],
      ["circle", { cx: "12", cy: "12", r: "1", fill: "currentColor", stroke: "none" }],
      ["circle", { cx: "12", cy: "19", r: "1", fill: "currentColor", stroke: "none" }],
    ],
    sort: [["path", { d: "M3 6h18M3 12h12M3 18h6" }]],
    menu: [["path", { d: "M3 6h18M3 12h18M3 18h18" }]],
    skull: [
      ["path", { d: "M12 2a9 9 0 0 0-9 9c0 3.6 2.2 6.7 5 8.1V22h8v-2.9c2.8-1.4 5-4.5 5-8.1a9 9 0 0 0-9-9z" }],
      ["path", { d: "M9 14h.01" }],
      ["path", { d: "M15 14h.01" }],
    ],
    grid_view: [
      ["rect", { x: "3", y: "3", width: "7", height: "7" }],
      ["rect", { x: "14", y: "3", width: "7", height: "7" }],
      ["rect", { x: "3", y: "14", width: "7", height: "7" }],
      ["rect", { x: "14", y: "14", width: "7", height: "7" }],
    ],
  };

  const icon = (name) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("material-icon");
    (ICON_NODES[name] ?? []).forEach(([tag, attrs]) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      svg.append(node);
    });
    return svg;
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const MAX_EXPERIENCES = 3;

  const data = {
    vampire: { name: "Sister Alazne" },
    prompt: {
      stamp: "PROMPT 2A",
      status: "Prompt unresolved",
      text: "Horrified at your new nature, you withdraw from society. Where do you hide? How do you feed? Create a stationary Resource which shelters you.",
    },
    memorySlots: 5,
    memories: [
      {
        id: "m1",
        title: "The Cloister Fire",
        experiences: [
          { text: "I carried the psalter out through the smoke and left the novices behind the burning door.", prompt: "1a" },
          { text: "The abbey bell went on ringing long after there was anyone left to ring it.", prompt: "3b" },
          { text: "I buried what was left of Tomás under the cold frame and told the others he had run.", prompt: "4a" },
        ],
      },
      {
        id: "m2",
        title: "Bread and Ash",
        experiences: [
          { text: "Mireille left bread on the sill for a month before she understood what came for it.", prompt: "5a" },
          { text: "I learned to take only from the dying, and to call that mercy.", prompt: "7c" },
        ],
      },
      {
        id: "m3",
        title: "What the River Kept",
        experiences: [{ text: "The river gave back the boy's coat and nothing else.", prompt: "9b" }],
      },
      {
        id: "m4",
        title: "The Long Winter",
        experiences: [
          { text: "Three months of frozen ground, and the abbey stores went to the living first.", prompt: "11a" },
          { text: "Brother Anselm stopped asking where I slept.", prompt: "12a" },
        ],
      },
    ],
    lostMemories: [{ id: "m5", title: "Her Mother's Name", reason: "Lost from Mind" }],
    diary: {
      description: "A ledger of abbey accounts, rewritten between the columns in a hand no one living can read.",
      memories: [
        { id: "d1", title: "The Novice's Question", experiences: [{}, {}, {}] },
        { id: "d2", title: "Salt and Latin", experiences: [{}, {}] },
      ],
    },
    traits: {
      characters: [
        { id: "c1", name: "Brother Anselm", typeLabel: "mortal", iconName: "person", description: "Keeps the abbey accounts and asks nothing.", used: false },
        { id: "c2", name: "Mireille", typeLabel: "mortal", iconName: "person", description: "The baker's widow, who leaves the door unlatched.", used: true },
        { id: "c3", name: "The Grey Abbot", typeLabel: "immortal", iconName: "skull", description: "Older than the foundation stone. Waiting for something.", used: false },
        { id: "c4", name: "Tomás", typeLabel: "mortal", iconName: "person", description: "A novice, buried under the cold frame.", used: false, lost: true },
      ],
      skills: [
        { id: "s1", name: "Bloodthirsty", iconName: "bolt", description: "Taken the night of the fire.", used: false },
        { id: "s2", name: "Latin", iconName: "bolt", description: "Twelve years of it, before the change.", used: true },
        { id: "s3", name: "Stonecraft", iconName: "bolt", description: "Learned rebuilding the south wall by night.", used: false },
      ],
      resources: [
        { id: "r1", name: "The Old Cloister", typeLabel: "stationary", iconName: "deployed_code", description: "Roofless, but the crypt below is dry.", used: false },
        { id: "r2", name: "A Silver Psalter", iconName: "deployed_code", description: "Carried out of the fire. Worth a year of quiet.", used: false },
        { id: "r3", name: "Coin from the Abbey", iconName: "deployed_code", description: "Enough to buy silence twice.", used: true },
      ],
      marks: [
        { id: "k1", name: "Eyes that do not close", iconName: "local_fire_department", description: "Even in sleep. Especially in sleep." },
      ],
    },
    saves: [
      { id: "v1", name: "Sister Alazne", complete: true },
      { id: "v2", name: "Isabeau de Rouvre", complete: false },
      { id: "test", name: "Test Vampire", complete: true, preset: true },
    ],
    wizardSteps: ["Identity", "Mortals", "Skills", "Resources", "Memories", "Immortal", "Mark", "Curse"],
  };

  /* --- Row builders: same DOM the app's render functions produce --- */

  const memoryRow = (memory, { lost = false, onSelect = null, selected = false } = {}) => {
    const row = el("li");
    const button = el("button", "play-memory-row");
    button.type = "button";
    if (selected) button.classList.add("mk-row-selected");

    const iconSlot = el("span", "play-memory-icon");
    iconSlot.append(icon("menu_book"));

    const info = el("span", "play-memory-info");
    info.append(el("span", "play-memory-name", memory.title));
    info.append(
      el(
        "span",
        "play-memory-subtitle",
        lost ? memory.reason : `${memory.experiences.length} / ${MAX_EXPERIENCES} experiences`,
      ),
    );

    const chevron = el("span", "play-memory-chevron");
    chevron.append(icon("chevron_right"));

    button.append(iconSlot, info, chevron);
    if (onSelect) button.addEventListener("click", () => onSelect(memory));
    row.append(button);
    return row;
  };

  const emptyMemorySlot = () => {
    const row = el("li");
    const inner = el("div", "play-memory-row play-memory-row-empty");
    const iconSlot = el("span", "play-memory-icon");
    iconSlot.append(icon("menu_book"));
    const info = el("span", "play-memory-info");
    info.append(el("span", "play-memory-name", "Empty slot"));
    inner.append(iconSlot, info);
    row.append(inner);
    return row;
  };

  const experienceItem = (experience, index) => {
    const item = el("li", "play-experience-item");
    item.append(el("span", "play-experience-index", String(index + 1).padStart(2, "0")));

    const body = el("div", "play-experience-body");
    body.append(el("p", "play-experience-text", experience.text));
    if (experience.prompt) body.append(el("span", "play-experience-stamp", `Prompt ${experience.prompt}`));

    const more = el("button", "play-experience-more");
    more.type = "button";
    more.setAttribute("aria-label", "Experience options");
    more.append(icon("more_vert"));

    item.append(body, more);
    return item;
  };

  const traitRow = (kind, item) => {
    const li = el("li", item.lost ? "play-trait-row play-trait-row-struck" : "play-trait-row");

    const iconSlot = el("span", "play-trait-icon");
    iconSlot.append(icon(item.iconName));

    const body = el("div", "play-trait-body");
    const titleRow = el("div", "play-trait-title-row");
    titleRow.append(el("span", "play-trait-name", item.name));
    if (item.typeLabel) titleRow.append(el("span", "play-trait-type-label", item.typeLabel));
    body.append(titleRow);
    if (item.description) body.append(el("p", "play-trait-description", item.description));

    if (item.lost) {
      const restore = el("button", "play-trait-restore", "Restore");
      restore.type = "button";
      li.append(iconSlot, body, restore);
      return li;
    }

    const actions = el("div", "play-trait-actions");
    if (kind !== "mark") {
      const check = el("button", "play-trait-action");
      check.type = "button";
      check.setAttribute("aria-pressed", String(Boolean(item.used)));
      check.append(icon(item.used ? "check_box" : "check_box_outline_blank"), document.createTextNode(item.used ? "Checked" : "Check"));
      check.addEventListener("click", () => {
        item.used = !item.used;
        li.dispatchEvent(new CustomEvent("mk:trait-change", { bubbles: true, detail: { item } }));
      });
      actions.append(check);

      const strike = el("button", "play-trait-action", "Strike out");
      strike.type = "button";
      actions.append(strike);
    }
    const more = el("button", "play-trait-action", "More");
    more.type = "button";
    actions.append(more);

    li.append(iconSlot, body, actions);
    return li;
  };

  const traitList = (kind, items) => {
    const fragment = document.createDocumentFragment();
    const active = items.filter((entry) => !entry.lost);
    const struck = items.filter((entry) => entry.lost);
    active.forEach((entry) => fragment.append(traitRow(kind, entry)));
    if (struck.length) {
      fragment.append(el("li", "play-trait-panel-label", "Struck Out"));
      struck.forEach((entry) => fragment.append(traitRow(kind, entry)));
    }
    return fragment;
  };

  const savesRow = (vampire) => {
    const item = el("li", "menu-vampire-item");
    const row = el("button", "menu-vampire-row");
    row.type = "button";

    const iconSlot = el("span", "menu-vampire-icon");
    iconSlot.append(icon("person"));

    const info = el("span", "menu-vampire-info");
    info.append(el("span", "menu-vampire-name", vampire.name));
    if (!vampire.complete) info.append(el("span", "menu-vampire-status", "Unfinished"));

    const chevron = el("span", "menu-vampire-chevron");
    chevron.append(icon("chevron_right"));

    row.append(iconSlot, info, chevron);
    item.append(row);

    if (!vampire.preset) {
      const more = el("button", "menu-vampire-more");
      more.type = "button";
      more.setAttribute("aria-label", `${vampire.name} options`);
      more.append(icon("more_vert"));
      item.append(more);
    }
    return item;
  };

  const taggedTraitChips = (items) => {
    const wrap = el("div", "play-tagged-traits");
    const chips = el("div", "play-tagged-trait-chips");
    items.forEach((item) => {
      const chip = el("span", "play-tagged-trait-chip");
      chip.append(el("span", null, item.name));
      const state = el("span", item.used ? "play-tagged-trait-tick" : "play-tagged-trait-cross", item.used ? "✓" : "—");
      chip.append(state);
      chips.append(chip);
    });
    wrap.append(chips);
    return wrap;
  };

  const allTraits = () => [
    ...data.traits.characters,
    ...data.traits.skills,
    ...data.traits.resources,
    ...data.traits.marks,
  ];

  /* --- Creation wizard content, transcribed from index.html --- */

  const wizardStepContent = [
    {
      title: "Name your vampire",
      hint: "Choose a name and write your first defining memory.",
      fields: [
        { kind: "input", label: "Vampire name *", placeholder: "Enter vampire name", value: "Sister Alazne" },
        { kind: "textarea", label: "First memory *", placeholder: "Describe the first defining memory" },
      ],
      added: [{ title: "The Cloister Fire", text: "I carried the psalter out through the smoke." }],
    },
    {
      title: "Mortals",
      hint: "Add at least 3 mortals — people from your human life.",
      fields: [
        { kind: "input", label: "Mortal name *", placeholder: "Enter mortal name" },
        { kind: "textarea", label: "Description", placeholder: "How they relate to the vampire" },
      ],
      addLabel: "Add mortal",
      added: [
        { title: "Brother Anselm", text: "Keeps the abbey accounts and asks nothing." },
        { title: "Mireille", text: "The baker's widow, who leaves the door unlatched." },
        { title: "Tomás", text: "A novice, and the first one lost." },
      ],
    },
    {
      title: "Skills",
      hint: "Add at least 3 skills your vampire has acquired.",
      fields: [
        { kind: "input", label: "Skill *", placeholder: "Enter skill name" },
        { kind: "textarea", label: "Description", placeholder: "How this skill was learned or used" },
      ],
      addLabel: "Add skill",
      added: [
        { title: "Latin", text: "Twelve years of it, before the change." },
        { title: "Stonecraft", text: "Learned rebuilding the south wall by night." },
      ],
    },
    {
      title: "Resources",
      hint: "Add at least 3 resources your vampire possesses.",
      fields: [
        { kind: "input", label: "Resource *", placeholder: "Enter resource name" },
        { kind: "textarea", label: "Description", placeholder: "Why this resource matters" },
      ],
      addLabel: "Add resource",
      added: [
        { title: "The Old Cloister", text: "Roofless, but the crypt below is dry." },
        { title: "A Silver Psalter", text: "Carried out of the fire." },
      ],
    },
    {
      title: "More Memories",
      hint: "Add 3 more memories. Tag each with at least 2 traits.",
      fields: [
        { kind: "textarea", label: "Memory *", placeholder: "Describe another major memory" },
        { kind: "traits", label: "Traits *", hint: "Select at least 2 traits this memory combines." },
      ],
      addLabel: "Add memory",
      added: [{ title: "Bread and Ash", text: "Mireille left bread on the sill for a month." }],
    },
    {
      title: "The Immortal",
      hint: "Add at least 1 immortal — another vampire or eternal being.",
      fields: [
        { kind: "input", label: "Immortal name *", placeholder: "Enter immortal name" },
        { kind: "textarea", label: "Description", placeholder: "How they relate to the vampire" },
      ],
      addLabel: "Add immortal",
      added: [{ title: "The Grey Abbot", text: "Older than the foundation stone." }],
    },
    {
      title: "Your Mark",
      hint: "Add at least 1 mark — something that sets you apart.",
      fields: [
        { kind: "input", label: "Mark *", placeholder: "Enter mark" },
        { kind: "textarea", label: "Description", placeholder: "How the mark appears or affects them" },
      ],
      addLabel: "Add mark",
      added: [{ title: "Eyes that do not close", text: "Even in sleep. Especially in sleep." }],
    },
    {
      title: "The Curse",
      hint: "Write the memory of becoming a vampire. Tag at least 2 traits.",
      fields: [
        { kind: "textarea", label: "Curse memory *", placeholder: "Describe the memory of becoming a vampire" },
        { kind: "traits", label: "Traits *", hint: "Select at least 2 traits this memory combines." },
      ],
      addLabel: "Add curse memory",
      added: [],
    },
  ];

  const traitPills = () => {
    const groups = el("div", "trait-groups");
    const pills = el("div", "trait-pills");
    ["Brother Anselm", "Mireille", "Latin", "Stonecraft", "The Old Cloister", "A Silver Psalter"].forEach((name, index) => {
      const pill = el("button", index < 2 ? "record-tag trait-select-pill selected-trait" : "record-tag trait-select-pill", name);
      pill.type = "button";
      pill.addEventListener("click", () => pill.classList.toggle("selected-trait"));
      pills.append(pill);
    });
    groups.append(pills);
    return groups;
  };

  const wizardFields = (step) => {
    const fragment = document.createDocumentFragment();
    step.fields.forEach((field) => {
      const wrap = el("div", "wizard-field");
      wrap.append(el("label", null, field.label));
      if (field.kind === "input") {
        const input = el("input");
        input.placeholder = field.placeholder;
        if (field.value) input.value = field.value;
        wrap.append(input);
      } else if (field.kind === "textarea") {
        const textarea = el("textarea");
        textarea.rows = 4;
        textarea.placeholder = field.placeholder;
        wrap.append(textarea);
      } else {
        wrap.append(el("p", "wizard-step-hint wizard-trait-hint", field.hint), traitPills());
      }
      fragment.append(wrap);
    });
    return fragment;
  };

  const wizardAddedList = (step) => {
    const list = el("ul", "wizard-added-list");
    step.added.forEach((entry, index) => {
      const item = el("li", "wizard-added-item");
      item.append(el("span", "wizard-added-index", String(index + 1).padStart(2, "0")));
      const body = el("div", "wizard-added-body");
      body.append(el("span", "wizard-added-title", entry.title));
      if (entry.text) body.append(el("p", "wizard-added-text", entry.text));
      const remove = el("button", "wizard-added-remove");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove");
      remove.append(icon("close"));
      item.append(body, remove);
      list.append(item);
    });
    return list;
  };

  /* --- Mockup chrome: screen switcher + links to the sibling variations --- */

  const VARIATIONS = [
    { file: "variation-a-nav-rail.html", label: "A · Nav rail" },
    { file: "variation-b-master-detail.html", label: "B · Master–detail" },
    { file: "variation-c-workbench.html", label: "C · Workbench" },
    { file: "variation-d-split-workbench.html", label: "D · Split workbench" },
  ];

  const SCREENS = [
    { id: "menu", label: "Home" },
    { id: "saves", label: "Saves" },
    { id: "create", label: "Creation" },
    { id: "play", label: "Play" },
  ];

  const mountChrome = ({ current, initialScreen = "play" }) => {
    const bar = el("div", "mk-bar");

    const group = el("div", "mk-group");
    group.append(el("span", "mk-group-label", "Layout"));
    VARIATIONS.forEach((variation) => {
      if (variation.file === current) {
        group.append(el("span", "mk-chip mk-chip-current", variation.label));
        return;
      }
      const link = el("a", "mk-chip", variation.label);
      link.href = variation.file;
      group.append(link);
    });
    bar.append(group);

    const screens = el("div", "mk-group");
    screens.append(el("span", "mk-group-label", "Screen"));
    const sections = new Map(
      SCREENS.map((screen) => [screen.id, document.querySelector(`[data-mk-screen="${screen.id}"]`)]),
    );

    const showScreen = (id) => {
      sections.forEach((section, key) => {
        if (section) section.hidden = key !== id;
      });
      [...screens.querySelectorAll(".mk-chip")].forEach((chip) => {
        chip.classList.toggle("mk-chip-current", chip.dataset.mkScreenButton === id);
      });
      window.location.hash = `#${id}`;
    };

    SCREENS.forEach((screen) => {
      if (!sections.get(screen.id)) return;
      const chip = el("button", "mk-chip", screen.label);
      chip.type = "button";
      chip.dataset.mkScreenButton = screen.id;
      chip.addEventListener("click", () => showScreen(screen.id));
      screens.append(chip);
    });
    bar.append(screens);

    document.body.append(bar);
    const fromHash = window.location.hash.replace("#", "");
    showScreen(sections.has(fromHash) ? fromHash : initialScreen);
  };

  global.MK = {
    icon,
    el,
    data,
    MAX_EXPERIENCES,
    memoryRow,
    emptyMemorySlot,
    experienceItem,
    traitRow,
    traitList,
    savesRow,
    taggedTraitChips,
    allTraits,
    wizardStepContent,
    wizardFields,
    wizardAddedList,
    traitPills,
    mountChrome,
  };
})(window);
