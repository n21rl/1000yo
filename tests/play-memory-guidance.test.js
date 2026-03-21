import test from "node:test";
import assert from "node:assert/strict";
import { MAX_EXPERIENCES_PER_MEMORY, MAX_MEMORIES } from "../src/game.js";
import {
  getAddExperienceLimitMessage,
  getAddMemoryLimitMessage,
  getBlockedMemoryActionMessage,
} from "../src/play-memory-guidance.js";

test("getAddMemoryLimitMessage explains how to make room for a new memory", () => {
  assert.equal(getAddMemoryLimitMessage(MAX_MEMORIES - 1, MAX_MEMORIES), "");
  assert.equal(
    getAddMemoryLimitMessage(MAX_MEMORIES, MAX_MEMORIES),
    "This vampire can only hold 5 memories at once. Mark one memory lost before you start a new memory.",
  );
});

test("getAddExperienceLimitMessage explains how to place an experience when a memory is full", () => {
  assert.equal(getAddExperienceLimitMessage(MAX_EXPERIENCES_PER_MEMORY - 1, MAX_EXPERIENCES_PER_MEMORY), "");
  assert.equal(
    getAddExperienceLimitMessage(MAX_EXPERIENCES_PER_MEMORY, MAX_EXPERIENCES_PER_MEMORY),
    "This memory is full at 3 experiences. Put this experience into another memory or start a new one.",
  );
});

test("getBlockedMemoryActionMessage delegates to the relevant guidance message", () => {
  assert.equal(
    getBlockedMemoryActionMessage({ mode: "new-memory", memoryCount: MAX_MEMORIES, maxMemories: MAX_MEMORIES }),
    "This vampire can only hold 5 memories at once. Mark one memory lost before you start a new memory.",
  );
  assert.equal(
    getBlockedMemoryActionMessage({ mode: "existing-memory", experienceCount: MAX_EXPERIENCES_PER_MEMORY, maxExperiences: MAX_EXPERIENCES_PER_MEMORY }),
    "This memory is full at 3 experiences. Put this experience into another memory or start a new one.",
  );
  assert.equal(getBlockedMemoryActionMessage({ mode: "unknown" }), "");
});
