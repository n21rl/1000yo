const STORAGE_KEY = "1000yo.vampires";
const LEGACY_VAMPIRE_ROUTE_PREFIX = "1000yo.";
export const TEST_VAMPIRE_NAME = "Test Vampire";

export const cleanText = (value = "") => String(value).trim().replace(/\s+/g, " ");

export const normalizeCharacterName = (value = "") => cleanText(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/['’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const getVampireRouteId = (name = "") => normalizeCharacterName(name);
export const TEST_VAMPIRE_ID = getVampireRouteId(TEST_VAMPIRE_NAME);

const getUpdatedAtScore = (record) => {
  const timestamp = Date.parse(record?.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : -1;
};

const safeLocalStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.error(error);
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
};

export const sanitizeStoredVampires = (records) => {
  const source = Array.isArray(records) ? records : [];
  const normalizedRecords = [];
  const winnerByKey = new Map();

  source.forEach((record, sourceIndex) => {
    if (!record || typeof record !== "object") return;
    const data = record.data && typeof record.data === "object" ? record.data : {};
    const cleanedName = cleanText(data?.name);
    const routeId = getVampireRouteId(cleanedName);
    const normalizedId = routeId || cleanText(record.id) || `unnamed-${sourceIndex + 1}`;
    const normalizedRecord = {
      ...record,
      id: normalizedId,
      data: {
        ...data,
        name: cleanedName,
      },
    };
    const key = routeId ? `name:${routeId}` : `id:${normalizedId}`;
    const score = getUpdatedAtScore(normalizedRecord);
    const index = normalizedRecords.push(normalizedRecord) - 1;
    const winner = winnerByKey.get(key);
    if (!winner || score >= winner.score) winnerByKey.set(key, { index, score });
  });

  const winnerIndexes = new Set([...winnerByKey.values()].map((entry) => entry.index));
  return normalizedRecords.filter((_, index) => winnerIndexes.has(index));
};

export const getStoredVampires = () => {
  try {
    const rawValue = safeLocalStorage.getItem(STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return sanitizeStoredVampires(parsed);
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const saveStoredVampires = (vampires) => safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeStoredVampires(vampires)));

export const findStoredVampireByNormalizedName = (name, excludingId = "") => {
  const normalizedName = normalizeCharacterName(name);
  if (!normalizedName) return null;
  return getStoredVampires().find((entry) => {
    if (entry.id === excludingId) return false;
    return normalizeCharacterName(entry.data?.name) === normalizedName;
  }) ?? null;
};

export const parseRouteId = (routeId = "") => {
  let decoded = "";
  try {
    decoded = cleanText(decodeURIComponent(routeId));
  } catch {
    decoded = cleanText(routeId);
  }
  if (!decoded) return "";
  if (decoded.startsWith(LEGACY_VAMPIRE_ROUTE_PREFIX)) {
    return decoded.slice(LEGACY_VAMPIRE_ROUTE_PREFIX.length);
  }
  return decoded;
};

export const findStoredVampireByRouteId = (routeId = "") => {
  const parsedRouteId = parseRouteId(routeId);
  if (!parsedRouteId) return null;
  const vampires = getStoredVampires();
  return vampires.find((entry) => entry.id === routeId)
    ?? vampires.find((entry) => entry.id === parsedRouteId)
    ?? vampires.find((entry) => normalizeCharacterName(entry.data?.name) === normalizeCharacterName(parsedRouteId))
    ?? null;
};

export const isDuplicateVampireName = (name, excludingId = "") => Boolean(
  findStoredVampireByNormalizedName(name, excludingId),
);

export const serializeCharacter = (targetCharacter) => ({
  name: targetCharacter.name,
  memories: targetCharacter.memories,
  skills: targetCharacter.skills,
  resources: targetCharacter.resources,
  characters: targetCharacter.characters,
  marks: targetCharacter.marks,
});

export const createStoredRecord = ({ selectedVampireId, character, serializeCampaignState, promptState }) => ({
  id: selectedVampireId || crypto.randomUUID(),
  updatedAt: new Date().toISOString(),
  isComplete: character.isReadyForPromptOne(),
  data: serializeCharacter(character),
  campaign: serializeCampaignState(promptState),
});

export const createTestVampireCharacter = ({ Character }) => {
  const sampleMortals = [
    ["Mortal 1", "Description 1"],
    ["Mortal 2", "Description 2"],
    ["Mortal 3", "Description 3"],
  ];
  const sampleSkills = [
    ["Skill 1", "Description 1"],
    ["Skill 2", "Description 2"],
    ["Skill 3", "Description 3"],
  ];
  const sampleResources = [
    ["Resource 1", "Description 1"],
    ["Resource 2", "Description 2"],
    ["Resource 3", "Description 3"],
  ];
  const sampleLaterMemories = ["Experience 2", "Experience 3", "Experience 4"];
  const testIdentityMemory = "Experience 1";
  const testImmortal = ["Immortal 1", "Description 1"];
  const testMark = ["Mark 1", "Description 1"];
  const testCurseMemory = "Experience 5";

  const testCharacter = new Character(TEST_VAMPIRE_NAME);
  testCharacter.addMemory(testIdentityMemory);

  sampleMortals.forEach(([name, description]) => {
    testCharacter.addCharacter(name, description, "mortal");
  });
  sampleSkills.forEach(([name, description]) => {
    testCharacter.addSkill(name, description);
  });
  sampleResources.forEach(([name, description]) => {
    testCharacter.addResource(name, description);
  });
  sampleLaterMemories.forEach((memoryText, index) => {
    const mortalName = sampleMortals[index % sampleMortals.length]?.[0] ?? "Mortal";
    const skillName = sampleSkills[index % sampleSkills.length]?.[0] ?? "Skill";
    testCharacter.addMemory(memoryText, [`Mortal: ${mortalName}`, `Skill: ${skillName}`]);
  });

  testCharacter.addCharacter(testImmortal[0], testImmortal[1], "immortal");
  testCharacter.addMark(testMark[0], testMark[1]);
  testCharacter.addMemory(testCurseMemory, [`Immortal: ${testImmortal[0]}`, `Mark: ${testMark[0]}`]);
  return testCharacter;
};

export const createTestVampireRecord = ({ Character, serializeCampaignState }) => {
  const testCharacter = createTestVampireCharacter({ Character });
  return {
    id: TEST_VAMPIRE_ID,
    updatedAt: new Date().toISOString(),
    isComplete: testCharacter.isReadyForPromptOne(),
    data: serializeCharacter(testCharacter),
    campaign: serializeCampaignState({
      currentPrompt: 1,
      visits: new Map([[1, 1]]),
    }),
  };
};

export const hasLegacyNarrativeTestDefaults = (record) => {
  const serialized = JSON.stringify(record?.data ?? {});
  return (
    serialized.includes("Yvette")
    || serialized.includes("Baron Severin")
    || serialized.includes("I was born to a fading noble house")
    || serialized.includes("My shadow lags a heartbeat behind me.")
  );
};

export const ensureTestVampireRecord = ({ Character, serializeCampaignState }) => {
  const vampires = getStoredVampires();
  const existingTestIndex = vampires.findIndex((entry) => entry.id === TEST_VAMPIRE_ID);
  if (existingTestIndex >= 0) {
    const existing = vampires[existingTestIndex];
    if (hasLegacyNarrativeTestDefaults(existing)) {
      const template = createTestVampireRecord({ Character, serializeCampaignState });
      vampires[existingTestIndex] = {
        ...existing,
        id: TEST_VAMPIRE_ID,
        isComplete: template.isComplete,
        data: template.data,
      };
      saveStoredVampires(vampires);
    }
    return;
  }
  const existingTestNameIndex = vampires.findIndex((entry) => normalizeCharacterName(entry.data?.name) === normalizeCharacterName(TEST_VAMPIRE_NAME));
  if (existingTestNameIndex >= 0) {
    const existing = vampires[existingTestNameIndex];
    vampires[existingTestNameIndex] = {
      ...existing,
      id: TEST_VAMPIRE_ID,
      data: {
        ...(existing?.data ?? {}),
        name: cleanText(existing?.data?.name) || TEST_VAMPIRE_NAME,
      },
    };
    saveStoredVampires(vampires);
    return;
  }
  vampires.unshift(createTestVampireRecord({ Character, serializeCampaignState }));
  saveStoredVampires(vampires);
};
