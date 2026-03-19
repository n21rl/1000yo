const normalizePositiveInteger = (value, fallback = 1) => {
  const normalized = Math.trunc(Number(value));
  return normalized >= 1 ? normalized : fallback;
};

export const serializeCampaignState = (promptState = {}) => ({
  currentPrompt: normalizePositiveInteger(promptState.currentPrompt, 1),
  visits: [...(promptState.visits instanceof Map ? promptState.visits.entries() : [])]
    .map(([prompt, visitCount]) => [
      normalizePositiveInteger(prompt, 0),
      normalizePositiveInteger(visitCount, 0),
    ])
    .filter(([prompt, visitCount]) => prompt >= 1 && visitCount >= 1)
    .sort((left, right) => left[0] - right[0]),
});

export const restoreCampaignState = (savedState = {}) => {
  const visits = new Map(
    Array.isArray(savedState?.visits)
      ? savedState.visits
        .map((entry) => [
          normalizePositiveInteger(entry?.[0], 0),
          normalizePositiveInteger(entry?.[1], 0),
        ])
        .filter(([prompt, visitCount]) => prompt >= 1 && visitCount >= 1)
      : [],
  );

  const currentPrompt = normalizePositiveInteger(
    savedState?.currentPrompt,
    visits.size ? [...visits.keys()][0] : 1,
  );

  return {
    currentPrompt,
    visits,
  };
};
