/* Campaign harness — plays 1000yo one prompt at a time through the real UI,
   pausing between prompts so an author (a Claude Code subagent) can decide
   what the drawn prompt actually instructs.

   There is no model in this process: the environment has no API credentials,
   so the loop is file-mediated. Each invocation

     1. restores the campaign from the app's own localStorage save,
     2. applies the pending turn plan (if any) through the real UI,
     3. declares the prompt resolved and rolls d10-d6,
     4. writes the next turn request and exits.

   The author's loop is: read turns/NNN-request.json, write turns/NNN-plan.json,
   run this script, repeat — until a request comes back with gameOver set.

   Resumption uses the app's own save rather than a snapshot format of its
   own, and rolls are seeded per turn (SEED + turn) so a turn replays
   identically without carrying PRNG state across processes.

   Usage:
     node campaign.mjs init     # build the character from campaign/character.json
     node campaign.mjs step     # apply the pending plan, roll, emit next request
     node campaign.mjs status   # print where the campaign stands
*/
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:4173/index.html";
const ROOT = process.env.CAMPAIGN_ROOT || path.join(import.meta.dirname, "campaign");
const EXEC = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SEED = 0x5eed1000;
const VIEWPORT = { width: 390, height: 844 };
const STORAGE_KEY = "1000yo.vampires";

/* Playwright is not a dependency of this repo — the app has no build step
   and nothing ships from here. Point PLAYWRIGHT_MODULE at an installed copy
   when it is not resolvable from this directory. */
const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = playwright.default ?? playwright;

const TURNS = path.join(ROOT, "turns");
const SCREENS = path.join(ROOT, "screens");
const STATE_FILE = path.join(ROOT, "state.json");
const LOG_FILE = path.join(ROOT, "log.jsonl");

const readJson = (file, fallback = null) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
};
const pad = (n) => String(n).padStart(3, "0");

/* Seeded per turn rather than per process: the harness exits between turns,
   so a PRNG carried in memory would reset anyway. */
const seedScript = (turn) => `
  (() => {
    let s = ${SEED} + ${turn} * 7919;
    Math.random = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
`;

/* The character sheet as the author needs to see it: every Memory's actual
   prose, every trait's state. Read from the app's save, not the DOM, so it
   is the engine's own view. */
const SHEET_SCRIPT = () => {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem("1000yo.vampires") || "[]"); } catch { return []; }
  })();
  const record = stored.filter((v) => v?.id !== "test-vampire").at(-1) ?? null;
  const d = record?.data ?? null;
  if (!d) return null;
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const label = (m, i) => m.title || `Memory ${ROMAN[(m.createdOrder ?? i + 1) - 1] ?? m.createdOrder}`;
  const trait = (t) => ({
    id: t.id, name: t.name, description: t.description ?? "",
    used: Boolean(t.used), lost: Boolean(t.lost),
    ...(t.type ? { type: t.type } : {}),
    ...(t.stationary ? { stationary: true } : {}),
  });
  const memories = (d.memories ?? []).map((m, i) => ({
    id: m.id,
    label: label(m, i),
    lost: Boolean(m.lost),
    lostReason: m.lostReason ?? null,
    storedInDiary: Boolean(m.storedInDiary),
    experiences: (m.experiences ?? []).map((e) => ({ text: e.text, prompt: e.prompt ?? null })),
  }));
  const skills = (d.skills ?? []).map(trait);
  const resources = (d.resources ?? []).map(trait);
  return {
    name: d.name,
    memorySlots: d.memorySlots,
    memories,
    characters: (d.characters ?? []).map(trait),
    skills,
    resources,
    marks: (d.marks ?? []).map(trait),
    diary: d.diary
      ? { exists: true, resourceId: d.diary.resourceId, memoryIds: d.diary.memoryIds ?? [] }
      : { exists: false, resourceId: null, memoryIds: [] },
    /* The rules end the game when a required check or loss cannot be made
       (refs/rules.txt:232), so the author needs to see what is left. */
    remaining: {
      uncheckedSkills: skills.filter((s) => !s.used && !s.lost).length,
      unlostSkills: skills.filter((s) => !s.lost).length,
      uncheckedResources: resources.filter((r) => !r.used && !r.lost).length,
      unlostResources: resources.filter((r) => !r.lost).length,
      freeMemorySlots: d.memorySlots - memories.filter((m) => !m.lost && !m.storedInDiary).length,
    },
  };
};

const launch = async (turn) => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await context.addInitScript(seedScript(turn));
  const page = await context.newPage();
  const diagnostics = { pageErrors: [], consoleErrors: [] };
  page.on("pageerror", (e) => diagnostics.pageErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") diagnostics.consoleErrors.push(m.text()); });
  return { browser, page, diagnostics };
};

const restore = async (page, storage) => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(([key, value]) => {
    localStorage.clear();
    if (value) localStorage.setItem(key, value);
  }, [STORAGE_KEY, storage]);
  await page.goto(`${BASE}#/menu`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(250);
};

const enterPlay = async (page) => {
  await page.click("#menu-continue-button");
  await page.waitForSelector("#play-screen:not([hidden])");
  await page.waitForFunction(() => {
    const t = document.getElementById("prompt-text")?.textContent ?? "";
    return t && !t.includes("Loading");
  }, null, { timeout: 15000 });
};

const saveStorage = (page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

class Shots {
  constructor(turn) { this.turn = turn; this.n = 0; this.files = []; }
  async take(page, label) {
    this.n += 1;
    const file = `t${pad(this.turn)}-${pad(this.n)}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}.png`;
    fs.mkdirSync(SCREENS, { recursive: true });
    await page.waitForTimeout(110);
    await page.screenshot({ path: path.join(SCREENS, file), fullPage: true, caret: "hide" });
    this.files.push(file);
    return file;
  }
}

/* ---------------------------------------------------------------- helpers */

const sheetOf = (page) => page.evaluate(SHEET_SCRIPT);

const goTab = async (page, tab) => {
  await page.click(`.play-bottom-tab[data-play-tab='${tab}']`);
  await page.waitForTimeout(120);
};
const goSubtab = async (page, sub) => {
  await page.click(`.play-trait-subtab[data-trait-subtab='${sub}']`);
  await page.waitForTimeout(120);
};
const sheetItem = (page, label) => page.locator(".app-action-sheet-item", { hasText: label }).first();

const PANEL = { character: "characters", skill: "skills", resource: "resources", mark: "marks" };
const LIST = { character: "#play-character-list", skill: "#play-skill-list", resource: "#play-resource-list", mark: "#play-mark-list" };

/* Rows carry no id in the DOM and the list is sorted, so a trait is found by
   its visible name. Names are checked for uniqueness when created. */
const traitRow = (page, kind, name) =>
  page.locator(`${LIST[kind]} li`).filter({ has: page.locator(".play-trait-name", { hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }) }).first();

const openTraitsFor = async (page, kind) => { await goTab(page, "traits"); await goSubtab(page, PANEL[kind]); };

const openMemory = async (page, label) => {
  await goTab(page, "memories");
  const row = page.locator("#play-memory-list .play-memory-row, #play-lost-memory-list .play-memory-row")
    .filter({ has: page.locator(".play-memory-name", { hasText: new RegExp(`^${label}`) }) }).first();
  await row.click();
  await page.waitForSelector("#play-memory-detail-view:not([hidden])");
};

const nameOf = (sheet, kind, id) => {
  const bucket = { character: "characters", skill: "skills", resource: "resources", mark: "marks" }[kind];
  const found = (sheet[bucket] ?? []).find((t) => t.id === id);
  if (!found) throw new Error(`no ${kind} with id ${id}`);
  return found.name;
};
const memoryOf = (sheet, id) => {
  const found = sheet.memories.find((m) => m.id === id);
  if (!found) throw new Error(`no memory with id ${id}`);
  return found;
};

/* ------------------------------------------------------------- operations */

const OPS = {
  async create_character(page, op) {
    await openTraitsFor(page, "character");
    await page.click("#add-character-button");
    await page.fill("#play-character-name", op.name);
    await page.fill("#play-character-description", op.description ?? "");
    await page.selectOption("#play-character-type", op.type ?? "mortal");
    await page.click("#play-character-submit");
  },
  async create_skill(page, op) {
    await openTraitsFor(page, "skill");
    await page.click("#add-skill-button");
    await page.fill("#play-skill-name", op.name);
    await page.fill("#play-skill-description", op.description ?? "");
    await page.click("#play-skill-submit");
  },
  async create_resource(page, op) {
    await openTraitsFor(page, "resource");
    await page.click("#add-resource-button");
    await page.fill("#play-resource-name", op.name);
    await page.fill("#play-resource-description", op.description ?? "");
    if (op.stationary) await page.check("#play-resource-stationary");
    await page.click("#play-resource-submit");
  },
  async create_mark(page, op) {
    await openTraitsFor(page, "mark");
    await page.click("#add-mark-button");
    await page.fill("#play-mark-name", op.name);
    await page.fill("#play-mark-description", op.description ?? "");
    await page.click("#play-mark-submit");
  },
  async check(page, op, sheet) {
    const name = nameOf(sheet, op.kind, op.id);
    await openTraitsFor(page, op.kind);
    await traitRow(page, op.kind, name).locator(".play-trait-action", { hasText: /^Check$/ }).first().click();
  },
  async strike(page, op, sheet) {
    const name = nameOf(sheet, op.kind, op.id);
    await openTraitsFor(page, op.kind);
    await traitRow(page, op.kind, name).locator(".play-trait-action", { hasText: "Strike out" }).first().click();
  },
  async edit_trait(page, op, sheet) {
    const name = nameOf(sheet, op.kind, op.id);
    await openTraitsFor(page, op.kind);
    await traitRow(page, op.kind, name).locator(".play-trait-action", { hasText: "More" }).first().click();
    await sheetItem(page, "Edit").click();
    const k = op.kind;
    if (op.name !== undefined) await page.fill(`#play-${k}-name`, op.name);
    if (op.description !== undefined) await page.fill(`#play-${k}-description`, op.description);
    if (k === "character" && op.type !== undefined) await page.selectOption("#play-character-type", op.type);
    if (k === "resource" && op.stationary !== undefined) await page.setChecked("#play-resource-stationary", op.stationary);
    await page.click(`#play-${k}-submit`);
  },
  async delete_trait(page, op, sheet) {
    const name = nameOf(sheet, op.kind, op.id);
    await openTraitsFor(page, op.kind);
    await traitRow(page, op.kind, name).locator(".play-trait-action", { hasText: "More" }).first().click();
    await sheetItem(page, "Delete").click();
    await page.click(".app-dialog-confirm");
  },
  async add_memory(page, op) {
    await goTab(page, "memories");
    await page.click("#add-memory-button");
    await page.fill("#app-dialog-root input", op.text);
    await page.click(".app-dialog-confirm");
  },
  async add_experience(page, op, sheet) {
    await openMemory(page, memoryOf(sheet, op.memoryId).label);
    await page.fill("#play-experience-text", op.text);
    await page.click("#play-experience-submit");
  },
  async forget_memory(page, op, sheet) {
    await openMemory(page, memoryOf(sheet, op.memoryId).label);
    await page.click("#play-memory-detail-more");
    await sheetItem(page, "Forget").click();
  },
  async move_memory_to_diary(page, op, sheet) {
    await openMemory(page, memoryOf(sheet, op.memoryId).label);
    await page.click("#play-memory-detail-more");
    await sheetItem(page, "Move to Diary").click();
    if (await page.locator("#play-diary-form:not([hidden])").count()) {
      await page.fill("#play-diary-description", op.diaryDescription ?? "A diary.");
      await page.click("#play-diary-submit");
    }
  },
  async delete_experience(page, op, sheet) {
    await openMemory(page, memoryOf(sheet, op.memoryId).label);
    await page.locator("#play-memory-experience-list .play-experience-more").nth(op.index).click();
    await sheetItem(page, "Delete").click();
    await page.click(".app-dialog-confirm");
  },
  async edit_experience(page, op, sheet) {
    await openMemory(page, memoryOf(sheet, op.memoryId).label);
    await page.locator("#play-memory-experience-list .play-experience-more").nth(op.index).click();
    await sheetItem(page, "Edit").click();
    await page.click(".app-dialog-confirm");
    const fields = page.locator("#play-memory-experience-fields textarea");
    await fields.nth(op.index).fill(op.text);
    await page.click("#play-memory-submit");
  },
  async add_memory_slot(page) {
    await goTab(page, "memories");
    await page.click("#memory-slots-more-button");
    await sheetItem(page, "Add memory slot").click();
    await page.click(".app-dialog-confirm");
  },
  async remove_memory_slot(page) {
    await goTab(page, "memories");
    await page.click("#memory-slots-more-button");
    await sheetItem(page, "Remove memory slot").click();
    await page.click(".app-dialog-confirm");
  },
  async no_mechanical_change() { /* recorded, nothing driven */ },
};

const applyOperation = async (page, op, shots) => {
  const sheet = await sheetOf(page);
  const kindOps = { check_skill: ["check", "skill"], check_resource: ["check", "resource"], check_character: ["check", "character"],
    strike_skill: ["strike", "skill"], strike_resource: ["strike", "resource"], strike_character: ["strike", "character"], strike_mark: ["strike", "mark"],
    edit_skill: ["edit_trait", "skill"], edit_resource: ["edit_trait", "resource"], edit_character: ["edit_trait", "character"], edit_mark: ["edit_trait", "mark"],
    delete_skill: ["delete_trait", "skill"], delete_resource: ["delete_trait", "resource"], delete_character: ["delete_trait", "character"], delete_mark: ["delete_trait", "mark"] };

  let handler = OPS[op.op];
  let payload = op;
  if (!handler && kindOps[op.op]) {
    const [name, kind] = kindOps[op.op];
    handler = OPS[name];
    payload = { ...op, kind };
  }
  if (!handler) throw new Error(`unknown operation "${op.op}"`);

  await handler(page, payload, sheet);
  await page.waitForTimeout(160);
  await shots.take(page, op.op);
};

/* ------------------------------------------------------------------ turns */

const promptView = (page) => page.evaluate(() => ({
  stamp: document.getElementById("prompt-stamp-label")?.textContent?.trim() ?? "",
  text: document.getElementById("prompt-text")?.textContent?.trim() ?? "",
  resolved: document.getElementById("prompt-status-label")?.textContent?.trim() === "Prompt resolved",
}));

const writeRequest = async (page, turn, extra = {}) => {
  const view = await promptView(page);
  const sheet = await sheetOf(page);
  const stamp = view.stamp.replace(/^PROMPT\s*/i, "").toLowerCase();
  const terminal = /the game is over|the game has ended/i.test(view.text);
  const request = {
    turn,
    stamp,
    promptText: view.text,
    terminalPrompt: terminal,
    sheet,
    /* Everything the author may return. Anything else is rejected. */
    availableOperations: Object.keys(OPS).filter((k) => k !== "check" && k !== "strike" && k !== "edit_trait" && k !== "delete_trait")
      .concat(["check_skill", "check_resource", "check_character", "strike_skill", "strike_resource", "strike_character",
        "edit_skill", "edit_resource", "edit_character", "edit_mark", "delete_skill", "delete_resource", "delete_character", "delete_mark"]),
    ...extra,
  };
  writeJson(path.join(TURNS, `${pad(turn)}-request.json`), request);
  return request;
};

const runInit = async () => {
  const character = readJson(path.join(ROOT, "character.json"));
  if (!character) throw new Error(`author the character first at ${path.join(ROOT, "character.json")}`);
  const { browser, page, diagnostics } = await launch(0);
  const shots = new Shots(0);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}#/menu`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(200);
  await page.click("#new-vampire-button");

  await page.fill("#name", character.name);
  await page.fill("#memory-identity", character.firstMemory);
  await shots.take(page, "step1-identity");
  await page.click("#next-button");

  const addAll = async (items, fill, submit, tag) => {
    for (const item of items) {
      await fill(item);
      await page.click(submit);
      await page.waitForTimeout(90);
    }
    await shots.take(page, tag);
    await page.click("#next-button");
  };
  await addAll(character.mortals, async (m) => {
    await page.fill("#mortal-name", m.name); await page.fill("#mortal-description", m.description ?? "");
  }, "#mortal-form button[type=submit]", "step2-mortals");
  await addAll(character.skills, async (s) => {
    await page.fill("#skill-name", s.name); await page.fill("#skill-description", s.description ?? "");
  }, "#skill-form button[type=submit]", "step3-skills");
  await addAll(character.resources, async (r) => {
    await page.fill("#resource-name", r.name); await page.fill("#resource-description", r.description ?? "");
  }, "#resource-form button[type=submit]", "step4-resources");

  for (const memory of character.laterMemories) {
    await page.fill("#memory-later", memory.text);
    for (const label of memory.traits) {
      await page.locator("#memory-traits-later .trait-select-pill", { hasText: new RegExp(`^${label}$`) }).first().click();
    }
    await page.click("#memory-form-later button[type=submit]");
    await page.waitForTimeout(90);
  }
  await shots.take(page, "step5-memories");
  await page.click("#next-button");

  await page.fill("#immortal-name", character.immortal.name);
  await page.fill("#immortal-description", character.immortal.description ?? "");
  await page.click("#immortal-form button[type=submit]");
  await shots.take(page, "step6-immortal");
  await page.click("#next-button");

  await page.fill("#mark-input", character.mark.name);
  await page.fill("#mark-description", character.mark.description ?? "");
  await page.click("#mark-form button[type=submit]");
  await shots.take(page, "step7-mark");
  await page.click("#next-button");

  await page.fill("#memory-curse", character.curseMemory.text);
  for (const label of character.curseMemory.traits) {
    await page.locator("#memory-traits-curse .trait-select-pill", { hasText: new RegExp(`^${label}$`) }).first().click();
  }
  await shots.take(page, "step8-curse");
  await page.click("#next-button");

  await page.waitForSelector("#play-screen:not([hidden])");
  await page.waitForFunction(() => {
    const t = document.getElementById("prompt-text")?.textContent ?? "";
    return t && !t.includes("Loading");
  }, null, { timeout: 15000 });
  await shots.take(page, "play-prompt-1");

  const storage = await saveStorage(page);
  const request = await writeRequest(page, 1);
  writeJson(STATE_FILE, { turn: 1, storage, createdAt: new Date().toISOString() });
  fs.writeFileSync(LOG_FILE, "");
  await browser.close();

  console.log(`init complete — ${character.name} created, ${shots.files.length} frames`);
  console.log(`prompt ${request.stamp}: ${request.promptText.slice(0, 120)}`);
  console.log(`\nauthor turns/${pad(1)}-plan.json, then: node campaign.mjs step`);
  if (diagnostics.pageErrors.length) console.log("PAGE ERRORS:", diagnostics.pageErrors);
};

const runStep = async () => {
  const state = readJson(STATE_FILE);
  if (!state) throw new Error("no campaign state — run `node campaign.mjs init` first");
  const turn = state.turn;
  const planFile = path.join(TURNS, `${pad(turn)}-plan.json`);
  const plan = readJson(planFile);
  if (!plan) throw new Error(`no plan for turn ${turn} — author ${planFile}`);

  const { browser, page, diagnostics } = await launch(turn);
  const shots = new Shots(turn);
  await restore(page, state.storage);
  await enterPlay(page);

  const before = await promptView(page);
  const stamp = before.stamp.replace(/^PROMPT\s*/i, "").toLowerCase();
  if (plan.stamp && plan.stamp !== stamp) {
    await browser.close();
    throw new Error(`plan is for ${plan.stamp} but the campaign is at ${stamp}`);
  }
  await shots.take(page, "prompt");

  const applied = [];
  const failures = [];
  for (const op of plan.operations ?? []) {
    try {
      await applyOperation(page, op, shots);
      applied.push(op);
    } catch (error) {
      failures.push({ op, error: String(error.message ?? error) });
      break;
    }
  }

  if (failures.length) {
    const storage = await saveStorage(page);
    await browser.close();
    writeJson(path.join(TURNS, `${pad(turn)}-error.json`), { turn, stamp, applied, failures });
    console.log(`TURN ${turn} FAILED after ${applied.length} operation(s):`);
    failures.forEach((f) => console.log(`  ${f.op.op}: ${f.error}`));
    console.log(`state NOT advanced; fix ${path.basename(planFile)} and re-run. Partial storage discarded.`);
    process.exitCode = 1;
    return;
  }

  /* The player declares the prompt answered; the app only warns. Warnings
     are recorded rather than dismissed silently — they are the app's own
     signal that a turn looks unanswered. */
  await page.click("#prompt-resolve-button");
  let warnings = [];
  if (await page.locator("#app-dialog-root:not([hidden])").count()) {
    warnings = await page.evaluate(() =>
      [...document.querySelectorAll("#app-dialog-root .app-dialog-list li, #app-dialog-root .app-dialog-body")].map((n) => n.textContent.trim()));
    await shots.take(page, "resolution-warnings");
    await page.click(".app-dialog-confirm");
  }
  await shots.take(page, "resolved");

  const sheetAfter = await sheetOf(page);
  const gameOver = Boolean(plan.gameEnded) || before.text.match(/the game is over|the game has ended/i);

  let next = null;
  if (!gameOver) {
    await page.click("#next-prompt-button");
    await page.waitForTimeout(200);
    await shots.take(page, "rolled");
    next = await promptView(page);
  }

  const storage = await saveStorage(page);
  const entry = {
    turn,
    stamp,
    promptText: before.text,
    reasoning: plan.reasoning ?? "",
    operations: plan.operations ?? [],
    warnings,
    sheetAfter,
    screenshots: shots.files,
    gameOver: Boolean(gameOver),
    gameEndedReason: plan.gameEndedReason ?? "",
    rolledTo: next ? next.stamp.replace(/^PROMPT\s*/i, "").toLowerCase() : null,
    diagnostics,
    at: new Date().toISOString(),
  };
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");

  if (gameOver) {
    writeJson(STATE_FILE, { turn, storage, gameOver: true, finishedAt: new Date().toISOString() });
    await browser.close();
    console.log(`turn ${turn} (${stamp}) applied — THE GAME IS OVER: ${plan.gameEndedReason || "terminal prompt"}`);
    return;
  }

  writeJson(STATE_FILE, { turn: turn + 1, storage, at: new Date().toISOString() });
  const request = await writeRequest(page, turn + 1);
  await browser.close();

  console.log(`turn ${turn} (${stamp}) applied: ${(plan.operations ?? []).map((o) => o.op).join(", ") || "no operations"}`);
  if (warnings.length) console.log(`  app warned: ${warnings.join(" / ")}`);
  console.log(`rolled to ${request.stamp} — author turns/${pad(turn + 1)}-plan.json, then: node campaign.mjs step`);
  if (request.terminalPrompt) console.log("  NOTE: this is a terminal prompt — the game ends here.");
  if (diagnostics.pageErrors.length) console.log("PAGE ERRORS:", diagnostics.pageErrors);
};

const runStatus = () => {
  const state = readJson(STATE_FILE);
  if (!state) { console.log("no campaign yet — run `node campaign.mjs init`"); return; }
  const log = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
  console.log(`turn ${state.turn}${state.gameOver ? " — GAME OVER" : ""}, ${log.length} turns played`);
  console.log(`prompts: ${log.map((e) => e.stamp).join(" → ")}`);
  const last = log.at(-1);
  if (last) console.log(`sheet: ${JSON.stringify(last.sheetAfter.remaining)}`);
};

const mode = process.argv[2] ?? "step";
if (mode === "init") await runInit();
else if (mode === "step") await runStep();
else if (mode === "status") runStatus();
else { console.error(`unknown mode "${mode}" — use init | step | status`); process.exitCode = 1; }
