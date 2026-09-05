/* Turns the recorded runs into readable indexes: one actions.md table per
   profile, plus the top-level README. Regenerate after any re-run. */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.OUT_ROOT || "/home/user/1000yo/design/playthrough";
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
const clip = (s, n) => { const t = esc(s); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

const stateCell = (state) => {
  if (state.overlay.dialogOpen) return `dialog: ${esc(state.overlay.dialogTitle) || state.overlay.dialogKind}`;
  if (state.overlay.modalOpen) return `modal: ${esc(state.overlay.modalTitle)}`;
  if (state.screen === "creation") return `creation ${esc(state.creation.step)} — ${esc(state.creation.title)}`;
  if (state.screen === "play") {
    const bits = [esc(state.play.stamp).toLowerCase()];
    if (state.play.resolved) bits.push("resolved");
    bits.push(state.play.memoryDetailOpen ? `detail: ${esc(state.play.memoryDetailTitle)}` : state.play.activeTab);
    if (state.play.activeTab === "traits" || state.play.activeTraitSubtab) bits.push(state.play.activeTraitSubtab);
    return bits.filter(Boolean).join(" · ");
  }
  return state.screen;
};

const countsCell = (c) => c
  ? `${c.memoriesInMind}m/${c.memorySlots} · ${c.experiences}exp · ${c.diaryMemories}diary · ${c.lostMemories}lost · ${c.characters}/${c.skills}/${c.resources}/${c.marks}`
  : "—";

for (const profile of manifest.profiles) {
  const run = JSON.parse(fs.readFileSync(path.join(ROOT, profile.profile, "run.json"), "utf8"));
  const rows = run.steps.map((s) => [
    `[${String(s.step).padStart(3, "0")}](${s.screenshot})`,
    s.phase,
    s.action.type,
    clip(s.action.label, 62),
    clip(s.action.target ?? "", 40),
    clip(stateCell(s.state), 46),
    countsCell(s.state.character),
  ]);

  const lines = [
    `# ${run.label} — action log`,
    "",
    `${run.stepCount} recorded screen changes. One row per action; the step number links to the frame it produced.`,
    `Machine-readable equivalents: \`actions.jsonl\` (one JSON object per step) and \`run.json\` (whole run, including per-step state diffs).`,
    "",
    `- Viewport: ${run.viewport.width}x${run.viewport.height} @${run.deviceScaleFactor}x, touch ${run.hasTouch ? "on" : "off"}`,
    `- Layout under test: ${run.layout}`,
    `- Screenshots: ${run.fullPageScreenshots ? "full page" : "viewport"}`,
    `- Seeded rolls: \`Math.random\` replaced with mulberry32(0x${run.seed.toString(16)}) so the prompt sequence is identical across profiles`,
    `- Prompts drawn: ${run.promptSequence.map((p) => p.stamp.toLowerCase().replace("prompt ", "")).join(" → ")}`,
    "",
    "Counts column: memories-in-mind/slots · experiences · diary · lost · characters/skills/resources/marks.",
    "",
    "| # | Phase | Action | What was done | Target | Resulting screen | Counts |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((r) => `| ${r.join(" | ")} |`),
    "",
  ];
  fs.writeFileSync(path.join(ROOT, profile.profile, "actions.md"), lines.join("\n"));
  console.log(`wrote ${profile.profile}/actions.md (${rows.length} rows)`);
}

const [mobile, desktop] = ["mobile", "desktop"].map((n) => manifest.profiles.find((p) => p.profile === n));
const runFor = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, name, "run.json"), "utf8"));
const blockedFor = (name) => runFor(name).steps.filter((s) => s.action.type === "blocked");
/* Link the same moment in both runs by step number rather than by a
   filename, which changes whenever a step's label does. */
const frameLink = (name, step) => {
  const match = runFor(name).steps.find((s) => s.step === step);
  return match ? `[${name}/${String(step).padStart(3, "0")}](${name}/${match.screenshot})` : `${name} step ${step}`;
};
const firstBlockedStep = blockedFor("desktop")[0]?.step ?? 0;

const readme = `# Playthrough simulation

A complete campaign played through the real app in a real browser, once at
phone width and once at desktop width, with every screen change captured as
a screenshot and every action recorded as structured data.

Recorded ${manifest.recordedAt.slice(0, 10)} against \`${manifest.app.baseUrl}\`
(\`npm run dev\`), prompt deck \`${manifest.app.promptDeck}\`.

## What is here

\`\`\`text
manifest.json          index of both runs: viewports, prompt sequence, final state, diagnostics
playthrough.mjs        the harness — drives the app and writes everything below
report.mjs             regenerates actions.md and this README from the recorded runs
<profile>/run.json     the whole run: metadata, every step, per-step state and diff, final localStorage
<profile>/actions.jsonl one JSON object per step, append-only, in order
<profile>/actions.md   the same log as a readable table, each row linking to its frame
<profile>/screens/     NNN-slug.png, one frame per screen change
\`\`\`

Every step record carries: step number, phase, action (\`tap\`/\`type\`/\`observe\`/\`blocked\`,
its target selector and any value typed), the screenshot it produced, a snapshot
of app state read off the live DOM and \`localStorage\`, and a \`changed\` diff
against the previous step.

| Profile | Viewport | Layout | Steps | Screens | Log |
| --- | --- | --- | --- | --- | --- |
${manifest.profiles.map((p) => `| ${p.profile} | ${p.viewport.width}x${p.viewport.height} | ${p.layout} | ${p.steps} | [\`${p.profile}/screens/\`](${p.profile}/screens/) | [\`actions.md\`](${p.profile}/actions.md) |`).join("\n")}

## The playthrough

Same script, same seed, both profiles: home → Saves → New Vampire → the
8-step wizard (${manifest.character}) → play. In play: check a trait and spend
it tagging an Experience, create a Skill mid-prompt, strike out a Resource,
fill a Memory to 3/3, move a Memory into the Diary, add and forget Memories,
add and remove a Memory slot, mark each prompt resolved and roll d10−d6.
Then Saves → rename → re-enter, Home → Continue, and a full page reload to
check persistence.

\`Math.random\` is replaced with a seeded generator before the app loads, so
both runs draw the same prompts: **${mobile.promptSequence.map((s) => s.toLowerCase().replace("prompt ", "")).join(" → ")}**.
Nothing else about the app is stubbed.

## What the two runs ended with

| | mobile | desktop |
| --- | --- | --- |
${["memoriesInMind", "memorySlots", "lostMemories", "experiences", "diaryMemories", "hasDiary", "characters", "skills", "resources", "marks", "checked", "struckOut"]
    .map((k) => `| ${k} | ${mobile.finalCharacter[k]} | ${desktop.finalCharacter[k]} |`).join("\n")}

Both runs attempted the same actions in the same order; the desktop run has
five fewer steps because three of them could not be performed. Everything the
final states disagree on traces back to one cause.

## Findings

### 1. On desktop the memory ⋮ menu has no entry point, and the play loop dead-ends (blocking)

\`styles.css\` hides \`#play-memory-detail-more\` above 1100px:

\`\`\`css
/* The memory detail is a column of its own now, so the header controls
   that exist to get back out of it aren't needed. */
#play-header-back,
#play-memory-detail-more {
  display: none !important;
}
\`\`\`

\`#play-header-back\` belongs in that rule — list and detail share the screen,
so there is nothing to go back from. \`#play-memory-detail-more\` does not: it
is not a back control, and it is the **only** entry point to
\`openMemoryMoreMenu\` (\`src/features/play/events.js:177\`), which is the only
way to reach **Forget**, **Move to Diary**, **Delete**, and the 43c
write-into-the-Diary override.

The consequence compounds. With no way to move a Memory to the Diary or
forget one, memory slots stay at 5/5, so \`#add-memory-button\` is disabled
too, and a prompt that says "create a Memory" cannot be answered. The Diary
tab can never become non-empty on desktop, and the Diary Resource is never
created. That is what the table above is showing: no diary, no lost memory,
one fewer Resource, one fewer Experience.

Recorded as \`blocked\` steps in the desktop log:

${blockedFor("desktop").map((s) => `- step [${s.step}](desktop/${s.screenshot}) — ${esc(s.action.label)}`).join("\n")}

Frames ${frameLink("mobile", firstBlockedStep)} and ${frameLink("desktop", firstBlockedStep)}
are the same step of the same playthrough, one layout each: on phone the ⋮ opens
the sheet, on desktop there is no ⋮ in the memory detail at all.

The fix is to drop \`#play-memory-detail-more\` from that rule and place the
button in the middle column's memory-detail header, where the memory it acts
on lives.

### 2. Both layouts are otherwise clean

No uncaught page errors and no console errors from app code in either run
(\`diagnostics\` in each \`run.json\`). Creation gating, the resolve-then-roll
prompt cycle, resolution warnings, prompt stamping on experiences, slot
add/remove confirmations, rename, Continue, and reload-persistence all behaved
as \`AGENTS.md\` describes.

### 3. The only network dependencies are external, and they fail silently

Both runs failed the same two requests, in a sandbox with no outbound access:

${[...new Set(mobile.diagnostics.failedRequests)].map((u) => `- \`${u}\``).join("\n")}

The first is Google Fonts, which degrades to fallback stacks. The second is the
single CDN \`<img>\` Material icon still used for the prompt card's chevron
(the spot \`AGENTS.md\` already calls out as the last \`createMaterialIcon\`
holdout) — offline it renders as nothing at all. Converting that one to
\`createMaterialFallbackIcon\` would remove the app's last runtime dependency
on a third-party host.

## Reproducing

\`\`\`bash
npm run dev                      # serves the app at :4173
npm --prefix /tmp/pw i playwright
node design/playthrough/playthrough.mjs           # both profiles
PROFILES=desktop node design/playthrough/playthrough.mjs   # one profile
node design/playthrough/report.mjs                # regenerate actions.md + README
\`\`\`

Environment overrides: \`BASE_URL\`, \`OUT_ROOT\`, \`PROFILES\`, and
\`PW_CHROMIUM\` (Chromium binary; defaults to
\`/opt/pw-browsers/chromium-1194/chrome-linux/chrome\`). Screenshots are deleted
and rewritten per run, so re-running a profile replaces its record wholesale.
`;

fs.writeFileSync(path.join(ROOT, "README.md"), readme);
console.log("wrote README.md");
