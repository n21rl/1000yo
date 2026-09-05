/* Drives a full 1000yo playthrough through the real app in a real browser,
   once per viewport profile, recording every action and every resulting
   screen as structured data.

   Outputs, per profile, under design/playthrough/<profile>/:
     screens/NN-slug.png   one frame per screen change
     actions.jsonl         append-only action log, one JSON object per line
     run.json              run metadata + every step + final storage state

   Rolls are seeded so both profiles draw the same prompt sequence and the
   two screenshot sets line up frame for frame. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:4173/index.html";
const OUT_ROOT = process.env.OUT_ROOT || "/home/user/1000yo/design/playthrough";
const EXEC = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SEED = 0x9e3779b9;

const PROFILES = {
  mobile: {
    label: "Mobile (iPhone-class, 390x844)",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    fullPage: true,
    layout: "bottom-tab phone layout (<640px)",
  },
  desktop: {
    label: "Desktop (1440x900)",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    fullPage: false,
    layout: "three-column desktop grid (>=1100px)",
  },
};

const SEED_SCRIPT = `
  (() => {
    let s = ${SEED};
    Math.random = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
`;

const CHARACTER = {
  name: "Iolanthe Vess",
  identityMemory: "I was the harbour physician of Kalos, and I set a boy's broken arm by lamplight while the fleet burned.",
  mortals: [
    ["Marek Vess", "My younger brother, a rope-maker who never learned to swim."],
    ["Sister Ilka", "The nun who taught me letters and kept my father's debts quiet."],
    ["Captain Doru", "Harbourmaster, and the only man who ever called me a liar to my face."],
  ],
  skills: [
    ["Physician", "Twenty years of setting bones and cutting fevers out of sailors."],
    ["Reads the Tide", "I can tell from the smell of the water when a ship will not come back."],
    ["Patient", "I learned to wait beside deathbeds without moving."],
  ],
  resources: [
    ["The Lamp Room", "A stone chamber above the harbour where I kept my instruments."],
    ["Father's Ledger", "Every debt in Kalos, written in a hand I can still forge."],
    ["A Case of Silver Knives", "Sharp, cold, and the only thing I carried out of the city."],
  ],
  laterMemories: [
    "The plague year: I kept the lamp room burning and let no one in, and Marek stood in the street calling my name until dawn.",
    "I forged my father's ledger to buy Sister Ilka's silence, and she blessed me for it without knowing what she blessed.",
    "Captain Doru dragged me to the water's edge and made me name the ships that would not return; every one of them sank.",
  ],
  immortal: ["The Salt Lady", "She came up the harbour steps dripping, and she has never once been dry since."],
  mark: ["Wet Footprints", "The floor is always damp where I have stood, whatever the weather."],
  curseMemory: "The Salt Lady opened my throat with one of my own silver knives and held me under the harbour until the burning stopped.",
};

const EXPERIENCES = [
  "I opened Marek's door at midnight and did not knock first.",
  "I sealed the lamp room from the inside and listened to the city drown.",
  "I told Sister Ilka the ledger was honest and watched her believe me.",
  "The Salt Lady taught me to hold my breath for a hundred years at a time.",
  "I carried Captain Doru's name in my mouth like a stone until it dissolved.",
  "I burned the ledger page by page and warmed my hands at my father's debts.",
];

/* Read straight off the live DOM and the live character, so a step's
   record is what the app actually showed, not what the script intended. */
const CAPTURE_STATE = () => {
  const visible = (id) => { const el = document.getElementById(id); return el && !el.hidden; };
  const text = (sel) => document.querySelector(sel)?.textContent?.trim() ?? "";
  const screenId = ["menu-screen", "saves-screen", "creation-screen", "play-screen"].find(visible) || "unknown";
  const screen = { "menu-screen": "home", "saves-screen": "saves", "creation-screen": "creation", "play-screen": "play" }[screenId] || "unknown";

  const dialogRoot = document.getElementById("app-dialog-root");
  const dialogOpen = Boolean(dialogRoot && !dialogRoot.hidden);
  const modal = document.getElementById("play-trait-modal");

  const stored = (() => {
    try { return JSON.parse(localStorage.getItem("1000yo.vampires") || "[]"); } catch { return []; }
  })();
  const played = stored.filter((v) => v?.id !== "test-vampire").at(-1) ?? null;
  const data = played?.data ?? null;
  const memories = data?.memories ?? [];

  return {
    screen,
    route: location.hash,
    creation: screen === "creation"
      ? {
        step: text("#step-progress"),
        title: text(".step-panel:not([hidden]) .wizard-step-title"),
        nextEnabled: !document.getElementById("next-button")?.disabled,
      }
      : null,
    play: screen === "play"
      ? {
        stamp: text("#prompt-stamp-label"),
        promptText: text("#prompt-text"),
        resolved: text("#prompt-status-label") === "Prompt resolved",
        rollVisible: !document.getElementById("next-prompt-button")?.hidden,
        resolveVisible: !document.getElementById("prompt-resolve-button")?.hidden,
        activeTab: document.querySelector(".play-bottom-tab.active")?.dataset.playTab ?? "",
        activeTraitSubtab: document.querySelector(".play-trait-subtab.active")?.dataset.traitSubtab ?? "",
        memoryDetailOpen: visible("play-memory-detail-view"),
        memoryDetailTitle: text("#play-memory-detail-title"),
        memorySlots: text("#memory-slots-meta"),
        composerBlocked: visible("play-experience-blocked") ? text("#play-experience-blocked") : "",
        taggedTraitChips: [...document.querySelectorAll(".play-tagged-trait-chip")].map((c) => c.textContent.trim()),
      }
      : null,
    overlay: {
      dialogOpen,
      dialogTitle: dialogOpen ? text("#app-dialog-root .app-dialog-title") : "",
      dialogKind: dialogOpen
        ? (document.querySelector("#app-dialog-root .app-action-sheet") ? "action-sheet"
          : document.querySelector("#app-dialog-root .app-dialog-field") ? "prompt"
            : "confirm")
        : "",
      dialogOptions: dialogOpen ? [...document.querySelectorAll("#app-dialog-root .app-action-sheet-item")].map((b) => b.textContent.trim()) : [],
      dialogBody: dialogOpen ? [...document.querySelectorAll("#app-dialog-root .app-dialog-body, #app-dialog-root .app-dialog-list li")].map((b) => b.textContent.trim()) : [],
      modalOpen: Boolean(modal && !modal.hidden),
      modalTitle: modal && !modal.hidden ? text("#play-trait-modal .modal-form:not([hidden]) .modal-form-title") : "",
    },
    character: data
      ? {
        name: data.name,
        memorySlots: data.memorySlots,
        /* Diary memories stay in `memories` with storedInDiary set, so
           the in-mind count has to exclude them as well as lost ones. */
        memoriesInMind: memories.filter((m) => !m.lost && !m.storedInDiary).length,
        lostMemories: memories.filter((m) => m.lost).length,
        experiences: memories.reduce((t, m) => t + (m.experiences?.length ?? 0), 0),
        diaryMemories: memories.filter((m) => m.storedInDiary && !m.lost).length,
        hasDiary: Boolean(data.diary?.resourceId),
        characters: (data.characters ?? []).length,
        skills: (data.skills ?? []).length,
        resources: (data.resources ?? []).length,
        marks: (data.marks ?? []).length,
        checked: [...(data.characters ?? []), ...(data.skills ?? []), ...(data.resources ?? []), ...(data.marks ?? [])].filter((t) => t.used).length,
        struckOut: [...(data.characters ?? []), ...(data.skills ?? []), ...(data.resources ?? []), ...(data.marks ?? [])].filter((t) => t.lost).length,
      }
      : null,
    campaign: played?.campaign
      ? {
        currentPrompt: played.campaign.currentPrompt,
        visits: played.campaign.visits,
        resolved: played.campaign.resolved,
      }
      : null,
    savesCount: stored.length,
    isComplete: played?.isComplete ?? null,
  };
};

class Recorder {
  constructor(profileName, dir) {
    this.profileName = profileName;
    this.dir = dir;
    this.screensDir = path.join(dir, "screens");
    this.n = 0;
    this.steps = [];
    this.prev = null;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(this.screensDir, { recursive: true });
    this.jsonl = path.join(dir, "actions.jsonl");
    fs.writeFileSync(this.jsonl, "");
  }

  /* One record per screen change: what was done, where, with what value,
     the frame it produced, and the app state that frame is showing. */
  async record(page, { phase, action, note = "" }) {
    this.n += 1;
    const slug = String(this.n).padStart(3, "0") + "-" +
      action.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55);
    const file = `${slug}.png`;
    await page.waitForTimeout(110);
    await page.screenshot({
      path: path.join(this.screensDir, file),
      fullPage: PROFILES[this.profileName].fullPage,
    });
    const state = await page.evaluate(CAPTURE_STATE);

    const changed = {};
    if (this.prev) {
      const flat = (o, p = "") => Object.entries(o ?? {}).flatMap(([k, v]) =>
        v && typeof v === "object" && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [[`${p}${k}`, Array.isArray(v) ? JSON.stringify(v) : v]]);
      const before = Object.fromEntries(flat(this.prev));
      const after = Object.fromEntries(flat(state));
      for (const [k, v] of Object.entries(after)) {
        if (before[k] !== v) changed[k] = { from: before[k] ?? null, to: v };
      }
    }

    const step = {
      step: this.n,
      profile: this.profileName,
      phase,
      action: { type: action.type, target: action.target ?? null, value: action.value ?? null, label: action.label },
      note,
      screenshot: `screens/${file}`,
      state,
      changed,
    };
    this.steps.push(step);
    this.prev = state;
    fs.appendFileSync(this.jsonl, JSON.stringify(step) + "\n");
    console.log(`  [${this.profileName}] ${String(this.n).padStart(3, "0")} ${action.type.padEnd(8)} ${action.label}`);
    return step;
  }
}

const runPlaythrough = async (profileName) => {
  const profile = PROFILES[profileName];
  const dir = path.join(OUT_ROOT, profileName);
  const rec = new Recorder(profileName, dir);
  const browser = await chromium.launch({ executablePath: EXEC });
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
  });
  await context.addInitScript(SEED_SCRIPT);
  const page = await context.newPage();

  const diagnostics = { pageErrors: [], consoleErrors: [], failedRequests: [] };
  page.on("pageerror", (err) => diagnostics.pageErrors.push(String(err)));
  page.on("console", (msg) => { if (msg.type() === "error") diagnostics.consoleErrors.push(msg.text()); });
  page.on("requestfailed", (req) => diagnostics.failedRequests.push({ url: req.url(), error: req.failure()?.errorText }));
  page.on("response", (res) => { if (res.status() >= 400) diagnostics.failedRequests.push({ url: res.url(), status: res.status() }); });

  let phase = "setup";
  const setPhase = (value) => { phase = value; };

  const shot = (label, note = "", extra = {}) =>
    rec.record(page, { phase, action: { type: "observe", label, ...extra }, note });
  const tap = async (selector, label, note = "") => {
    await page.click(selector);
    return rec.record(page, { phase, action: { type: "tap", target: selector, label }, note });
  };
  const tapText = async (selector, text, label, note = "") => {
    await page.locator(selector, { hasText: text }).first().click();
    return rec.record(page, { phase, action: { type: "tap", target: `${selector} :text("${text}")`, label }, note });
  };
  const typeInto = async (selector, value, label, note = "") => {
    await page.fill(selector, value);
    return rec.record(page, { phase, action: { type: "type", target: selector, value, label }, note });
  };
  const fillSilently = async (selector, value) => { await page.fill(selector, value); };

  // ---------------------------------------------------------------- HOME
  setPhase("home");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await shot("Home screen, no saves", "Fresh localStorage: Continue is hidden, only New Vampire and Saves");

  await tap("#menu-saves-button", "Open Saves from Home", "Saves lists every stored vampire including the preset Test Vampire");
  await tap("#saves-back-button", "Back to Home");

  // ------------------------------------------------------------ CREATION
  setPhase("creation");
  await tap("#new-vampire-button", "New Vampire", "No in-progress save exists, so creation starts blank at step 1");

  await fillSilently("#name", CHARACTER.name);
  await typeInto("#memory-identity", CHARACTER.identityMemory, "Step 1: name and first memory", `Name: ${CHARACTER.name}`);
  await tap("#next-button", "Next to step 2 (Mortals)");

  for (const [name, desc] of CHARACTER.mortals) {
    await fillSilently("#mortal-name", name);
    await fillSilently("#mortal-description", desc);
    await rec.record(page, { phase, action: { type: "type", target: "#mortal-form", value: `${name} — ${desc}`, label: `Draft mortal ${name}` } });
    await tap("#mortal-form button[type=submit]", `Add mortal ${name}`);
  }
  await tap("#next-button", "Next to step 3 (Skills)");

  for (const [name, desc] of CHARACTER.skills) {
    await fillSilently("#skill-name", name);
    await fillSilently("#skill-description", desc);
    await tap("#skill-form button[type=submit]", `Add skill ${name}`, desc);
  }
  await tap("#next-button", "Next to step 4 (Resources)");

  for (const [name, desc] of CHARACTER.resources) {
    await fillSilently("#resource-name", name);
    await fillSilently("#resource-description", desc);
    await tap("#resource-form button[type=submit]", `Add resource ${name}`, desc);
  }
  await tap("#next-button", "Next to step 5 (More Memories)", "Needs 3 more memories, each tagged with at least 2 traits");

  for (let i = 0; i < CHARACTER.laterMemories.length; i += 1) {
    await fillSilently("#memory-later", CHARACTER.laterMemories[i]);
    const pills = page.locator("#memory-traits-later .trait-select-pill");
    const total = await pills.count();
    const picks = [i % total, (i + 3) % total];
    const labels = [];
    for (const p of picks) {
      labels.push((await pills.nth(p).textContent()).trim());
      await pills.nth(p).click();
    }
    await rec.record(page, {
      phase,
      action: { type: "type", target: "#memory-form-later", value: CHARACTER.laterMemories[i], label: `Draft memory ${i + 2} tagged ${labels.join(" + ")}` },
      note: "Two traits are the minimum for a creation memory",
    });
    await tap("#memory-form-later button[type=submit]", `Add memory ${i + 2}`);
  }
  await tap("#next-button", "Next to step 6 (The Immortal)");

  await fillSilently("#immortal-name", CHARACTER.immortal[0]);
  await fillSilently("#immortal-description", CHARACTER.immortal[1]);
  await tap("#immortal-form button[type=submit]", `Add immortal ${CHARACTER.immortal[0]}`, CHARACTER.immortal[1]);
  await tap("#next-button", "Next to step 7 (Your Mark)");

  await fillSilently("#mark-input", CHARACTER.mark[0]);
  await fillSilently("#mark-description", CHARACTER.mark[1]);
  await tap("#mark-form button[type=submit]", `Add mark ${CHARACTER.mark[0]}`, CHARACTER.mark[1]);
  await tap("#next-button", "Next to step 8 (The Curse)");

  await fillSilently("#memory-curse", CHARACTER.curseMemory);
  {
    const pills = page.locator("#memory-traits-curse .trait-select-pill");
    const total = await pills.count();
    const labels = [];
    for (const idx of [total - 1, Math.max(0, total - 4)]) {
      labels.push((await pills.nth(idx).textContent()).trim());
      await pills.nth(idx).click();
    }
    await rec.record(page, {
      phase,
      action: { type: "type", target: "#memory-form-curse", value: CHARACTER.curseMemory, label: `Draft curse memory tagged ${labels.join(" + ")}` },
      note: "Save & Play unlocks once the curse memory has text and 2 traits",
    });
  }
  await page.click("#next-button");

  // ---------------------------------------------------------------- PLAY
  setPhase("play");
  await page.waitForSelector("#play-screen:not([hidden])");
  await page.waitForFunction(() => !document.getElementById("prompt-text").textContent.includes("Loading"));
  await rec.record(page, {
    phase,
    action: { type: "tap", target: "#next-button", label: "Save & Play — enter play at prompt 1a" },
    note: "startPlay() gate passed: 5 memories, 3 skills, 3 resources, 3 mortals, 1 immortal, 1 mark",
  });

  const openMemory = async (index, label, note = "") => {
    await page.locator("#play-memory-list .play-memory-row").nth(index).click();
    await page.waitForSelector("#play-memory-detail-view:not([hidden])");
    return rec.record(page, { phase, action: { type: "tap", target: `#play-memory-list .play-memory-row[${index}]`, label }, note });
  };
  const backToMemoryList = async () => {
    if (profileName === "mobile") await tap("#play-header-back", "Back to memory list");
    else await tap(".play-bottom-tab[data-play-tab='memories']", "Memories column (desktop keeps list and detail together)");
  };
  const writeExperience = async (text, note = "") => {
    await fillSilently("#play-experience-text", text);
    await rec.record(page, { phase, action: { type: "type", target: "#play-experience-text", value: text, label: "Compose experience" }, note });
    await tap("#play-experience-submit", "Save Experience", "Stamped with the current prompt");
  };
  const resolveAndRoll = async () => {
    const stampBefore = (await page.textContent("#prompt-stamp-label")).trim();
    await page.click("#prompt-resolve-button");
    if (await page.locator("#app-dialog-root:not([hidden])").count()) {
      await rec.record(page, {
        phase,
        action: { type: "tap", target: "#prompt-resolve-button", label: `Mark ${stampBefore} as resolved — warnings shown` },
        note: "Permissive-and-warn: the app lists what looks unusual and lets the player through",
      });
      await tap(".app-dialog-confirm", "Confirm resolution despite warnings");
    } else {
      await rec.record(page, { phase, action: { type: "tap", target: "#prompt-resolve-button", label: `Mark ${stampBefore} as resolved` } });
    }
    await page.click("#next-prompt-button");
    await page.waitForTimeout(160);
    const stamp = (await page.textContent("#prompt-stamp-label")).trim();
    await rec.record(page, {
      phase,
      action: { type: "tap", target: "#next-prompt-button", label: `Roll d10-d6 → ${stamp}` },
      note: (await page.textContent("#prompt-text")).trim(),
    });
    return stamp;
  };

  const isDesktop = profileName === "desktop";
  /* The traits tab button is display:none above 1100px — the traits
     column is already on screen — so the desktop run records the column
     instead of tapping a control that isn't there. */
  const goToTraits = async (label = "Traits") => {
    if (isDesktop) return shot(`${label} (column always open on desktop)`);
    return tap(".play-bottom-tab[data-play-tab='traits']", label);
  };
  /* Records rather than throws when a control this profile cannot reach
     is needed — the point of running the same script on both layouts. */
  const openMemoryMoreMenu = async (label, note = "") => {
    const reachable = await page.locator("#play-memory-detail-more").isVisible();
    if (!reachable) {
      await rec.record(page, {
        phase,
        action: { type: "blocked", target: "#play-memory-detail-more", label: `${label} — control not reachable` },
        note: "#play-memory-detail-more is display:none above 1100px, so Forget / Move to Diary / Delete have no entry point on this layout"
          + (note ? ` (wanted: ${note})` : ""),
      });
      return false;
    }
    await tap("#play-memory-detail-more", label, note);
    return true;
  };

  // Cycle 1 — check a trait, then spend it tagging an experience
  await goToTraits("Traits tab (Characters)");
  await tapText("#play-character-list .play-trait-action", "Check", "Check the first character", "Checking queues the trait for the next experience");
  await tap(".play-bottom-tab[data-play-tab='memories']", "Memories tab", "5 of 5 slots full after creation");
  await openMemory(0, "Open memory 1", "Composer carries the checked trait as a chip");
  await writeExperience(EXPERIENCES[0]);
  await backToMemoryList();
  await resolveAndRoll();

  // Cycle 2 — the prompt asks for a new Skill, so create one in play
  await goToTraits("Traits");
  await tap(".play-trait-subtab[data-trait-subtab='skills']", "Skills sub-tab");
  await tap("#add-skill-button", "Add Skill (opens modal)");
  await fillSilently("#play-skill-name", "Bloodthirsty");
  await fillSilently("#play-skill-description", "The hunger arrives before the thought does.");
  await tap("#play-skill-submit", "Create skill Bloodthirsty", "A trait created in play auto-tags the next experience");
  await tap(".play-bottom-tab[data-play-tab='memories']", "Memories tab");
  await openMemory(1, "Open memory 2");
  await writeExperience(EXPERIENCES[1]);
  await backToMemoryList();
  await resolveAndRoll();

  // Cycle 3 — strike out a Resource
  await goToTraits("Traits");
  await tap(".play-trait-subtab[data-trait-subtab='resources']", "Resources sub-tab");
  await tapText("#play-resource-list .play-trait-action", "Strike out", "Strike out the first resource", "Struck traits move to a permanent section rather than collapsing");
  await tap(".play-bottom-tab[data-play-tab='memories']", "Memories tab");
  await openMemory(2, "Open memory 3");
  await writeExperience(EXPERIENCES[2]);
  await backToMemoryList();
  await resolveAndRoll();

  // Cycle 4 — fill a memory to its 3-experience limit
  await openMemory(3, "Open memory 4");
  await writeExperience(EXPERIENCES[3]);
  await fillSilently("#play-experience-text", EXPERIENCES[4]);
  await tap("#play-experience-submit", "Save a second experience into the same memory", "Memory reaches 3 of 3 — the composer is replaced by its blocked reason");
  await backToMemoryList();
  await resolveAndRoll();

  // Diary — created by moving the full memory into it
  setPhase("diary");
  await tap(".play-bottom-tab[data-play-tab='diary']", "Diary tab", "Empty until a memory is moved in");
  await tap(".play-bottom-tab[data-play-tab='memories']", "Memories tab");
  await openMemory(3, "Open the full memory");
  const canUseMemoryMenu = await openMemoryMoreMenu("Memory ⋮ menu", "Forget / Move to Diary / Delete");
  if (canUseMemoryMenu) {
    await tapText(".app-action-sheet-item", "Move to Diary", "Choose Move to Diary");
    await fillSilently("#play-diary-description", "A sea-swollen logbook, kept in oilcloth beneath the third harbour stone.");
    await tap("#play-diary-submit", "Create the Diary and move the memory in", "The first move creates the Diary resource");
    await tap(".play-bottom-tab[data-play-tab='diary']", "Diary tab populated");
    await tap(".play-bottom-tab[data-play-tab='memories']", "Memories tab", "A slot is free again: 4 of 5");
  }

  setPhase("play");
  if (await page.locator("#add-memory-button").isEnabled()) {
    await page.click("#add-memory-button");
    await fillSilently("#app-dialog-root input", EXPERIENCES[5]);
    await rec.record(page, { phase, action: { type: "type", target: "#app-dialog-root input", value: EXPERIENCES[5], label: "Add memory dialog" } });
    await tap(".app-dialog-confirm", "Save the new memory", "Its first experience is stamped with the current prompt");
  } else {
    await rec.record(page, {
      phase,
      action: { type: "blocked", target: "#add-memory-button", label: "Add memory — disabled, all slots full" },
      note: "No memory could be moved to the Diary or forgotten on this layout, so no slot is free",
    });
  }
  await resolveAndRoll();

  // Forget a memory
  await openMemory(0, "Open memory 1 again");
  if (await openMemoryMoreMenu("Memory ⋮ menu")) {
    await tapText(".app-action-sheet-item", "Forget", "Forget this memory", "Lost memories stay listed in their own permanent section");
  }

  // Memory slots — non-standard play, confirmed in both directions
  await tap("#memory-slots-more-button", "Memory slots ⋮", "Slot changes live beside the count, not in the header menu");
  await tapText(".app-action-sheet-item", "Add memory slot", "Add memory slot");
  await tap(".app-dialog-confirm", "Confirm adding a 6th slot", "Warns that 5 is the standard limit");
  await tap("#memory-slots-more-button", "Memory slots ⋮ again");
  await tapText(".app-action-sheet-item", "Remove memory slot", "Remove memory slot");
  await tap(".app-dialog-confirm", "Confirm removing the slot", "Confirms in both directions, not just past 5");
  await resolveAndRoll();

  // Marks and identity
  await goToTraits("Traits");
  await tap(".play-trait-subtab[data-trait-subtab='marks']", "Marks sub-tab", "Marks carry no Check or Strike out, only More");
  await tap("#play-avatar-button", "Avatar → identity menu", "Right slot is identity: Rename vampire / Change picture");
  await page.keyboard.press("Escape");
  await shot("Dismiss identity menu", "Escape closes any dialog");

  // ---------------------------------------------------- SAVES + RE-ENTRY
  setPhase("saves");
  await tap("#play-hamburger-button", "Hamburger → session menu", "Left slot is navigation: Home / Saves / Delete save");
  await tapText(".app-action-sheet-item", "Saves", "Go to Saves");
  await page.locator("#saves-vampire-list li button").last().click();
  await shot("Saves row ⋮ menu", "Per-row rename/delete, same action-sheet pattern as Play");
  await tapText(".app-action-sheet-item", "Rename", "Rename this save");
  await fillSilently("#app-dialog-root input", "Iolanthe of the Wet Stones");
  await rec.record(page, { phase, action: { type: "type", target: "#app-dialog-root input", value: "Iolanthe of the Wet Stones", label: "Type the new name" } });
  await tap(".app-dialog-confirm", "Confirm rename");

  await page.locator("#saves-vampire-list .play-memory-row, #saves-vampire-list li > button").first().click();
  await page.waitForTimeout(220);
  await shot("Re-enter play from a Saves row", "startPlay() restores prompt position and visit counts");

  setPhase("home");
  await tap("#play-hamburger-button", "Hamburger menu");
  await tapText(".app-action-sheet-item", "Home", "Return Home", "Continue now targets the finished save");
  await page.click("#menu-continue-button");
  await page.waitForSelector("#play-screen:not([hidden])");
  await page.waitForFunction(() => !document.getElementById("prompt-text").textContent.includes("Loading"));
  await rec.record(page, { phase, action: { type: "tap", target: "#menu-continue-button", label: "Continue resumes the same save" } });

  setPhase("persistence");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(450);
  await shot("Full page reload", "Route, character and campaign state restored from localStorage");

  const storage = await page.evaluate(() => JSON.parse(localStorage.getItem("1000yo.vampires") || "[]"));
  await browser.close();

  const run = {
    profile: profileName,
    label: profile.label,
    layout: profile.layout,
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    fullPageScreenshots: profile.fullPage,
    baseUrl: BASE,
    seed: SEED,
    recordedAt: new Date().toISOString(),
    stepCount: rec.steps.length,
    promptSequence: rec.steps
      .filter((s) => s.action.label.startsWith("Roll d10-d6"))
      .map((s) => ({ step: s.step, stamp: s.state.play?.stamp, prompt: s.state.play?.promptText })),
    finalState: rec.steps.at(-1).state,
    storage,
    diagnostics,
    steps: rec.steps,
  };
  fs.writeFileSync(path.join(dir, "run.json"), JSON.stringify(run, null, 2));
  return run;
};

const runs = [];
for (const name of (process.env.PROFILES || "mobile,desktop").split(",").map((s) => s.trim())) {
  console.log(`\n=== ${name} ===`);
  runs.push(await runPlaythrough(name));
}

const onDisk = Object.keys(PROFILES)
  .map((name) => path.join(OUT_ROOT, name, "run.json"))
  .filter((file) => fs.existsSync(file))
  .map((file) => JSON.parse(fs.readFileSync(file, "utf8")));

fs.writeFileSync(path.join(OUT_ROOT, "manifest.json"), JSON.stringify({
  recordedAt: new Date().toISOString(),
  app: { baseUrl: BASE, seed: SEED, promptDeck: "refs/prompts.csv" },
  character: CHARACTER.name,
  profiles: onDisk.map((r) => ({
    profile: r.profile,
    label: r.label,
    layout: r.layout,
    viewport: r.viewport,
    steps: r.stepCount,
    screens: `${r.profile}/screens/`,
    actionLog: `${r.profile}/actions.jsonl`,
    run: `${r.profile}/run.json`,
    promptSequence: r.promptSequence.map((p) => p.stamp),
    finalCharacter: r.finalState.character,
    finalCampaign: r.finalState.campaign,
    diagnostics: {
      pageErrors: r.diagnostics.pageErrors.length,
      consoleErrors: r.diagnostics.consoleErrors.length,
      failedRequests: [...new Set(r.diagnostics.failedRequests.map((f) => f.url))],
    },
  })),
}, null, 2));

for (const r of runs) {
  console.log(`\n${r.profile}: ${r.stepCount} steps, prompts ${r.promptSequence.map((p) => p.stamp).join(" → ")}`);
  console.log(`  page errors: ${r.diagnostics.pageErrors.length}; failed requests: ${[...new Set(r.diagnostics.failedRequests.map((f) => f.url))].join(", ") || "none"}`);
  console.log(`  final: ${JSON.stringify(r.finalState.character)}`);
}
