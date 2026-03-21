export const getAddMemoryLimitMessage = (memoryCount, maxMemories) => {
  if (memoryCount < maxMemories) return "";
  return `This vampire can only hold ${maxMemories} memories at once. Mark one memory lost before you start a new memory.`;
};

export const getAddExperienceLimitMessage = (experienceCount, maxExperiences) => {
  if (experienceCount < maxExperiences) return "";
  return `This memory is full at ${maxExperiences} experiences. Put this experience into another memory or start a new one.`;
};

export const getBlockedMemoryActionMessage = ({
  mode,
  memoryCount,
  maxMemories,
  experienceCount,
  maxExperiences,
} = {}) => {
  if (mode === "new-memory") return getAddMemoryLimitMessage(memoryCount, maxMemories);
  if (mode === "existing-memory") return getAddExperienceLimitMessage(experienceCount, maxExperiences);
  return "";
};
