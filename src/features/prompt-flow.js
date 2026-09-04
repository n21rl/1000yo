import { clampPromptIndex, getPromptEntry, hasPromptEntryForVisit } from "../prompt-deck.js";

export const createPromptState = () => ({
  deck: [],
  isLoading: false,
  loadError: "",
  currentPrompt: 1,
  visits: new Map(),
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

   The rulebook's baseline is one Experience per Prompt: "Every time you
   answer a Prompt you must create an Experience and add it to a Memory
   unless instructed otherwise" (refs/rules.txt). So once the current
   prompt is resolved, the composer has no job until the next one. That
   is a default, not a lock — entries like 24b ("Do not create an
   Experience about this") and 37a ("Do not create a new Experience for
   this Prompt") deviate in one direction, and a prompt may equally call
   for more than one, which is what `allowExtra` is for. */
export const EXPERIENCE_BLOCKED = {
  LOST: "lost",
  DIARY: "diary",
  FULL: "full",
  PROMPT_RESOLVED: "prompt-resolved",
};

export const getExperienceAvailability = (
  memory,
  { promptResolved = false, maxExperiences = Infinity, allowExtra = false } = {},
) => {
  if (!memory) return { allowed: false, reason: null };
  /* The memory's own state comes first: a lost or shelved memory can't
     take an Experience whatever the prompt is doing. */
  if (memory.lost) return { allowed: false, reason: EXPERIENCE_BLOCKED.LOST };
  if (memory.storedInDiary) return { allowed: false, reason: EXPERIENCE_BLOCKED.DIARY };
  if (memory.experiences.length >= maxExperiences) return { allowed: false, reason: EXPERIENCE_BLOCKED.FULL };
  if (promptResolved && !allowExtra) return { allowed: false, reason: EXPERIENCE_BLOCKED.PROMPT_RESOLVED };
  return { allowed: true, reason: null };
};

export const formatPromptStamp = (promptIndex, visitCount) => {
  const letter = ["a", "b", "c"][visitCount - 1] ?? "";
  return `${promptIndex}${letter}`;
};

export const isPromptResolved = (promptState, character) => {
  if (!character) return false;
  const stamp = formatPromptStamp(promptState.currentPrompt, promptState.visits.get(promptState.currentPrompt) ?? 1);
  return character.memories.some((memory) => memory.experiences.some((experience) => experience.prompt === stamp));
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
    statusLabel: resolved ? "Prompt resolved" : "Prompt unresolved",
    text: getPromptEntry(currentPrompt, visitCount) || "No remaining prompt entry at this position.",
  };
};

export const normalizeLoadedPromptState = (promptState) => {
  if (!promptState.deck.length) return;
  promptState.currentPrompt = clampPromptIndex(promptState.currentPrompt, promptState.deck.length);
  if (!promptState.visits.has(promptState.currentPrompt)) promptState.visits.set(promptState.currentPrompt, 1);
};

export const ensurePromptVisit = (promptState) => {
  if (promptState.visits.size) return false;
  promptState.currentPrompt = 1;
  promptState.visits.set(1, 1);
  return true;
};
