// Desk-only view interactions for the "desk2" design. All game state lives in
// main.js; this module only manipulates the physical desk presentation — books,
// ribbons, the gutter prompt, slip folding/lifting — and never mutates the
// character.

const SECTIONS = ["memories", "people", "skills", "resources", "marks"];

let curSec = 0;
let curSide = "left";
let bound = false;

const notebook = () => document.getElementById("book-notebook");
const diaryBook = () => document.getElementById("book-diary");

// ---------- book swapping (notebook <-> diary) ----------

export const showBook = (which) => {
  const nb = notebook();
  const dy = diaryBook();
  const cbDiary = document.getElementById("cb-diary");
  const cbNotebook = document.getElementById("cb-notebook");
  if (!nb || !dy) return;
  const target = which === "diary" ? dy : nb;
  nb.hidden = target !== nb;
  dy.hidden = target !== dy;
  // the closed-book prop shows whichever book is NOT currently open
  if (cbDiary) cbDiary.hidden = target === dy;
  if (cbNotebook) cbNotebook.hidden = target === nb;
  target.classList.remove("turn-in");
  requestAnimationFrame(() => target.classList.add("turn-in"));
};

// ---------- ribbon section navigation ----------

const spreadFor = (section) => notebook()?.querySelector(`.spread[data-section="${section}"]`);

const updateRibbons = () => {
  const nb = notebook();
  if (!nb) return;
  nb.querySelectorAll(".rbn").forEach((rbn) => {
    const i = Number(rbn.dataset.i);
    const wrap = rbn.parentElement;
    wrap.classList.remove("rbn-passed", "rbn-current", "rbn-upcoming");
    if (i === curSec) {
      wrap.classList.add("rbn-current");
      wrap.style.removeProperty("--dist");
    } else if (i < curSec) {
      wrap.classList.add("rbn-passed");
      wrap.style.setProperty("--dist", curSec - i);
    } else {
      wrap.classList.add("rbn-upcoming");
      wrap.style.setProperty("--dist", i - curSec);
    }
  });
};

const showSide = (spread, side) => {
  if (!spread) return;
  spread.querySelectorAll("[data-mpage]").forEach((page) => page.classList.remove("current"));
  const target = spread.querySelector(`[data-mpage="${side === "left" ? 1 : 2}"]`);
  if (target) target.classList.add("current");
  // Mobile sliding spread: translate to show one page fully, the other as a
  // tappable sliver (CSS drives the actual translate inside the media query).
  spread.classList.toggle("view-right", side === "right");
  spread.classList.toggle("view-left", side !== "right");
  const nb = notebook();
  if (nb) {
    nb.dataset.side = side;
    nb.dataset.section = spread.dataset.section || "";
  }
};

// open a section's spread with a direction-aware page-turn animation
const openSection = (idx, side) => {
  const nb = notebook();
  if (!nb) return;
  if (idx !== curSec) {
    const backward = idx < curSec;
    const current = spreadFor(SECTIONS[curSec]);
    const next = spreadFor(SECTIONS[idx]);
    if (current) current.hidden = true;
    if (next) {
      next.hidden = false;
      next.classList.remove("turn-fwd", "turn-back");
      void next.offsetWidth;
      next.classList.add(backward ? "turn-back" : "turn-fwd");
    }
    curSec = idx;
  }
  curSide = side;
  showSide(spreadFor(SECTIONS[curSec]), curSide);
  updateRibbons();
  if (SECTIONS[curSec] === "memories") measureFolds();
};

// ---------- memory slip folding ----------

// Measure each mounted slip's true (unfolded) height against --mount-h and drop
// a crease at every fold boundary short of the end, plus a folded-paper edge
// when any content is hidden. Idempotent: clears prior marks before measuring.
export const measureFolds = () => {
  const nb = notebook();
  if (!nb) return;
  const mountHeightPx = (host) => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute; visibility:hidden; height:var(--mount-h); width:0;";
    host.appendChild(probe);
    const height = probe.offsetHeight;
    probe.remove();
    return height;
  };
  nb.querySelectorAll(".slip:not(.smoothed)").forEach((slip) => {
    slip.querySelectorAll(".crease, .fold-edge").forEach((mark) => mark.remove());
    const body = slip.querySelector(".slip-body");
    if (!body) return;
    const mountH = mountHeightPx(body);
    body.style.height = "auto";
    body.style.overflow = "visible";
    const naturalH = body.scrollHeight;
    body.style.height = "";
    body.style.overflow = "";
    if (mountH <= 0) return;
    const folds = Math.max(1, Math.ceil(naturalH / mountH));
    for (let n = 1; n < folds; n += 1) {
      const crease = document.createElement("span");
      crease.className = "crease";
      crease.style.top = `calc(var(--mount-h) * ${n})`;
      body.appendChild(crease);
    }
    if (folds > 1) {
      const edge = document.createElement("span");
      edge.className = "fold-edge";
      body.insertAdjacentElement("afterend", edge);
    }
  });
};

// ---------- select-to-reveal + lift ----------

const clearSelection = () => {
  document.querySelectorAll(".slip.selected, .entry.selected").forEach((el) => el.classList.remove("selected"));
  document.querySelectorAll(".slip-placeholder").forEach((placeholder) => placeholder.remove());
};

// ---------- init ----------

export const initDeskInteractions = () => {
  if (bound) return;
  bound = true;

  // book swap via the closed-book prop / the "open the diary" verb
  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-open-diary], [data-open-notebook]");
    if (!opener) return;
    event.stopPropagation();
    showBook(opener.hasAttribute("data-open-diary") ? "diary" : "notebook");
  });

  // ribbons jump to a section
  document.addEventListener("click", (event) => {
    const rbn = event.target.closest(".rbn");
    if (!rbn) return;
    event.stopPropagation();
    openSection(Number(rbn.dataset.i), "left");
  });

  // mobile: tap a peeking page-edge sliver to slide the spread to that page
  document.addEventListener("click", (event) => {
    const edge = event.target.closest(".slide-edge");
    if (!edge) return;
    event.stopPropagation();
    openSection(curSec, edge.dataset.slide === "right" ? "right" : "left");
  });

  // pull the gutter prompt up into focus (mobile), dim behind it
  const promptTab = document.getElementById("prompt-tab");
  const promptCard = document.getElementById("prompt-card");
  const promptBackdrop = document.getElementById("prompt-backdrop");
  const openPrompt = () => {
    promptBackdrop?.classList.add("pulled");
    promptCard?.classList.remove("pulled");
    void promptCard?.offsetWidth;
    promptCard?.classList.add("pulled");
  };
  const closePrompt = () => {
    promptCard?.classList.remove("pulled");
    promptBackdrop?.classList.remove("pulled");
  };
  promptTab?.addEventListener("click", (event) => { event.stopPropagation(); openPrompt(); });
  promptBackdrop?.addEventListener("click", (event) => { event.stopPropagation(); closePrompt(); });
  promptCard?.addEventListener("click", (event) => event.stopPropagation());

  // select-to-reveal; a memory slip also lifts to centre, leaving a same-size
  // placeholder so the book layout never jumps. Delegated so it survives the
  // dynamic re-rendering of slips and entries.
  document.addEventListener("click", (event) => {
    if (event.target.closest(".verb")) return;
    const selectable = event.target.closest(".slip:not(.smoothed), .entry");
    if (!selectable) return;
    event.stopPropagation();
    const wasSelected = selectable.classList.contains("selected");
    clearSelection();
    if (wasSelected) return;
    if (selectable.classList.contains("slip")) {
      const rect = selectable.getBoundingClientRect();
      const style = getComputedStyle(selectable);
      const placeholder = document.createElement("div");
      placeholder.className = "slip-placeholder";
      placeholder.style.cssText = `width:${rect.width}px; height:${rect.height}px; margin:${style.marginTop} ${style.marginRight} ${style.marginBottom} ${style.marginLeft}; visibility:hidden;`;
      selectable.parentNode.insertBefore(placeholder, selectable);
    }
    selectable.classList.add("selected");
  });
  document.body.addEventListener("click", clearSelection);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { clearSelection(); closePrompt(); }
  });

  // mobile: the notebook's page corner always turns onward — left to right,
  // then on to the next section's left page, wrapping at Marks.
  document.addEventListener("click", (event) => {
    const corner = event.target.closest("#book-notebook [data-mnext]");
    if (!corner) return;
    event.stopPropagation();
    if (curSide === "left") openSection(curSec, "right");
    else openSection((curSec + 1) % SECTIONS.length, "left");
  });

  // mobile: the diary just turns between its own two pages
  document.addEventListener("click", (event) => {
    const corner = event.target.closest("#book-diary [data-mturn]");
    if (!corner) return;
    event.stopPropagation();
    const spread = corner.closest(".spread");
    if (!spread) return;
    spread.querySelectorAll("[data-mpage]").forEach((page) => page.classList.remove("current"));
    spread.querySelector(`[data-mpage="${corner.dataset.mturn}"]`)?.classList.add("current");
  });

  updateRibbons();
  showSide(spreadFor(SECTIONS[curSec]), curSide);
};
