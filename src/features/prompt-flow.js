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

export const getPromptPanelViewModel = (promptState) => {
  if (promptState.isLoading) {
    return {
      disabled: true,
      text: "Loading prompts...",
    };
  }
  if (promptState.loadError) {
    return {
      disabled: true,
      text: promptState.loadError,
    };
  }
  if (!promptState.deck.length) {
    return {
      disabled: true,
      text: "No prompt content is available.",
    };
  }

  const currentPrompt = promptState.deck[promptState.currentPrompt - 1];
  const visitCount = promptState.visits.get(promptState.currentPrompt) ?? 1;
  return {
    disabled: false,
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
