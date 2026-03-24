import { serializeCampaignState } from "./campaign-state.js";

export const ensurePresetRecord = (stored, presetId, createPresetRecord) => {
  if (!Array.isArray(stored)) return [createPresetRecord()];
  if (!stored.some((entry) => entry?.id === presetId)) return [createPresetRecord(), ...stored];
  return stored;
};

export const getStoredVampires = (storage, storageKey, presetId, createPresetRecord) => {
  try {
    const rawValue = storage.getItem(storageKey);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    const stored = Array.isArray(parsed) ? parsed : [];
    return ensurePresetRecord(stored, presetId, createPresetRecord);
  } catch (error) {
    console.error(error);
    return [createPresetRecord()];
  }
};

export const saveStoredVampires = (storage, storageKey, vampires) => (
  storage.setItem(storageKey, JSON.stringify(vampires))
);

export const createStoredRecord = ({
  selectedVampireId = "",
  character,
  promptState,
  serializeCharacter,
}) => ({
  id: selectedVampireId || crypto.randomUUID(),
  updatedAt: new Date().toISOString(),
  isComplete: character.isReadyForPromptOne(),
  data: serializeCharacter(character),
  campaign: serializeCampaignState(promptState),
});

export const upsertVampireRecord = (vampires, record) => {
  const next = [...vampires];
  const existingIndex = next.findIndex((entry) => entry.id === record.id);
  if (existingIndex >= 0) next.splice(existingIndex, 1, record);
  else next.push(record);
  return next;
};
