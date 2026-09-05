import { clampPromptIndex, getPromptEntry, hasPromptEntryForVisit } from "../prompt-deck.js";

export const createPromptState = () => ({
  deck: [],
  isLoading: false,
  loadError: "",
  currentPrompt: 1,
  visits: new Map(),
  resolved: new Set(),
  signature: null,
});

export const advanceToNextPromptEntry = (promptState, targetIndex) => {
  if (!promptState.deck.length) return { prompt: 1, visit: 0 };
  let nextIndex = clampPromptIndex(targetIndex, promptState.deck.length);
  while (nextIndex <= promptState.deck.length) {
    const prompt = promptState.deck[nextIndex - 1];
    const visitCount = (promptState.visits.get(nextIndex) ?? 0) + 1;
    if (hasPromptEntryForVisit(prompt, visitCount)) {
      promptState.visits.set(nextIndex, visitCount);
      promptState.currentPrompt = nextIndex;
      return { prompt: nextIndex, visit: visitCount };
    }
    promptState.visits.set(nextIndex, visitCount);
    nextIndex += 1;
  }
  return { prompt: promptState.currentPrompt, visit: promptState.visits.get(promptState.currentPrompt) ?? 1 };
};

/* Whether a Memory can take a new Experience right now, and if not, why.

   These are the engine's own limits, not the prompt cycle's: the app
   does not decide when a prompt is answered, the player does (see
   markPromptResolved). A Diary memory is the one soft block — the
   rulebook says a Memory in the Diary gains no further Experiences, but
   43c ("Write this forgotten Experience into your Memory or directly
   into a Diary") shows the deck itself overriding that, so the UI warns
   and lets the player through rather than refusing. */
export const EXPERIENCE_BLOCKED = {
  LOST: "lost",
  DIARY: "diary",
  FULL: "full",
};

export const getExperienceAvailability = (
  memory,
  { maxExperiences = Infinity, allowDiary = false } = {},
) => {
  if (!memory) return { allowed: false, reason: null };
  if (memory.lost) return { allowed: false, reason: EXPERIENCE_BLOCKED.LOST };
  if (memory.experiences.length >= maxExperiences) return { allowed: false, reason: EXPERIENCE_BLOCKED.FULL };
  if (memory.storedInDiary && !allowDiary) return { allowed: false, reason: EXPERIENCE_BLOCKED.DIARY };
  return { allowed: true, reason: null };
};

/* Resolution is declared, not inferred. Custom and Appendix prompts can
   ask for anything — no Experience (24b, 37a, 43b, 54b), several, or
   only a trait change — so the app records what the player says happened
   and warns when it looks unusual, rather than deciding for them. */
export const isStampResolved = (promptState, stamp) => Boolean(promptState?.resolved?.has(stamp));

export const markPromptResolved = (promptState, stamp) => {
  if (!promptState.resolved) promptState.resolved = new Set();
  promptState.resolved.add(stamp);
};

/* A cheap fingerprint of everything a prompt might have changed, taken
   when the prompt is entered and compared when it is marked resolved. */
export const getPlaySignature = (character) => {
  if (!character) return { traits: 0, used: 0, lost: 0, experiences: 0 };
  const traits = [
    ...(character.characters ?? []),
    ...(character.skills ?? []),
    ...(character.resources ?? []),
    ...(character.marks ?? []),
  ];
  const memories = character.memories ?? [];
  return {
    traits: traits.length,
    used: traits.filter((trait) => trait.used).length,
    lost: traits.filter((trait) => trait.lost).length + memories.filter((memory) => memory.lost).length,
    experiences: memories.reduce((total, memory) => total + memory.experiences.length, 0),
  };
};

/* What looks unusual about this prompt's resolution. Warnings only —
   every one of them is a legitimate outcome for some prompt. */
export const getResolutionWarnings = (character, { stamp, signature } = {}) => {
  const warnings = [];
  const memories = character?.memories ?? [];
  const stamped = memories.reduce(
    (total, memory) => total + memory.experiences.filter((experience) => experience.prompt === stamp).length,
    0,
  );

  /* Each warning names the element it is about, so several of them read
     as separate things to check rather than one blur. */
  if (stamped === 0) warnings.push("Experience: none recorded for this prompt.");
  if (stamped > 1) warnings.push(`Experience: ${stamped} recorded for this prompt.`);

  if (signature) {
    const now = getPlaySignature(character);
    if (now.traits === signature.traits && now.used === signature.used && now.lost === signature.lost) {
      warnings.push("Traits: none created, checked or struck out.");
    }
    if (now.experiences === signature.experiences && now.lost === signature.lost && stamped === 0) {
      warnings.push("Memories: unchanged since this prompt was drawn.");
    }
  }

  return warnings;
};

export const formatPromptStamp = (promptIndex, visitCount) => {
  const letter = ["a", "b", "c"][visitCount - 1] ?? "";
  return `${promptIndex}${letter}`;
};

export const getPromptPanelViewModel = (promptState, { resolved = false } = {}) => {
  if (promptState.isLoading) {
    return {
      disabled: true,
      rollDisabled: true,
      resolved: false,
      statusLabel: "",
      text: "Loading prompts...",
    };
  }
  if (promptState.loadError) {
    return {
      disabled: true,
      rollDisabled: true,
      resolved: false,
      statusLabel: "",
      text: promptState.loadError,
    };
  }
  if (!promptState.deck.length) {
    return {
      disabled: true,
      rollDisabled: true,
      resolved: false,
      statusLabel: "",
      text: "No prompt content is available.",
    };
  }

  const currentPrompt = promptState.deck[promptState.currentPrompt - 1];
  const visitCount = promptState.visits.get(promptState.currentPrompt) ?? 1;
  return {
    disabled: false,
    rollDisabled: !resolved,
    resolved,
    /* Unresolved needs no label: "Mark as resolved" is sitting right
       there saying so. Only the resolved state is worth stating. */
    statusLabel: resolved ? "Prompt resolved" : "",
    text: getPromptEntry(currentPrompt, visitCount) || "No remaining prompt entry at this position.",
  };
};

export const normalizeLoadedPromptState = (promptState) => {
  if (!promptState.deck.length) return;
  promptState.currentPrompt = clampPromptIndex(promptState.currentPrompt, promptState.deck.length);
  if (!promptState.visits.has(promptState.currentPrompt)) promptState.visits.set(promptState.currentPrompt, 1);
};

/* "Start at Prompt 1" is the pivot for the very first roll, not a prompt
   answered without one — the same d10-d6 subtraction that moves every later
   turn applies here too, so a fresh vampire's actual first prompt is
   1 + (d10 - d6), not always 1a. */
export const ensurePromptVisit = (promptState, rollDelta) => {
  if (promptState.visits.size) return false;
  advanceToNextPromptEntry(promptState, 1 + rollDelta);
  return true;
};
