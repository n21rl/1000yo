import { cleanText } from "./storage.js";

export const cleanPromptText = (value = "") => String(value).replace(/\s+/g, " ").trim();

export const parseCsv = (csvText = "") => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = String(csvText).replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char === "\r") continue;
    field += char;
  }

  row.push(field);
  rows.push(row);
  return rows.filter((candidate) => candidate.some((value) => cleanText(value)));
};

export const parsePromptDeck = (csvText) => {
  const rows = parseCsv(csvText);
  if (!rows.length) return [];
  const [firstRow, ...remainingRows] = rows;
  const hasHeader = firstRow.slice(0, 3).map((value) => cleanPromptText(value).toLowerCase()).join("|") === "a|b|c";
  const dataRows = hasHeader ? remainingRows : rows;
  return dataRows
    .map((row) => ({ a: cleanPromptText(row[0] ?? ""), b: cleanPromptText(row[1] ?? ""), c: cleanPromptText(row[2] ?? "") }))
    .filter((prompt) => Boolean(prompt.a || prompt.b || prompt.c));
};

export const getPromptEntry = (prompt, visitCount) => {
  if (!prompt) return "";
  if (visitCount === 1) return prompt.a;
  if (visitCount === 2) return prompt.b;
  if (visitCount === 3) return prompt.c;
  return "";
};

export const hasPromptEntryForVisit = (prompt, visitCount) => Boolean(getPromptEntry(prompt, visitCount));
export const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;

export const clampPromptIndex = (index, deckLength) => (!deckLength ? 1 : Math.max(1, Math.min(index, deckLength)));

export const moveToNextAvailablePrompt = (promptState, targetIndex) => {
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

const noop = () => {};

export const loadPromptDeck = async ({
  promptState,
  fetchImpl = fetch,
  onLoading = noop,
  onLoaded = noop,
}) => {
  if (promptState.deck.length || promptState.isLoading) return;
  promptState.isLoading = true;
  promptState.loadError = "";
  onLoading();
  try {
    const response = await fetchImpl("/refs/prompts.csv");
    if (!response.ok) throw new Error(`Could not load prompts (${response.status}).`);
    const csvText = await response.text();
    promptState.deck = parsePromptDeck(csvText);
    if (!promptState.deck.length) promptState.loadError = "No prompts were found in refs/prompts.csv.";
  } catch (error) {
    promptState.loadError = "Unable to load prompt data from refs/prompts.csv.";
    console.error(error);
  } finally {
    promptState.isLoading = false;
    onLoaded();
  }
};
