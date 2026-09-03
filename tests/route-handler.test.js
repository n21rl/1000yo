import test from "node:test";
import assert from "node:assert/strict";
import { handleRouteChange } from "../src/route-handler.js";

test("handleRouteChange routes to menu for menu hash", async () => {
  const screens = [];
  let rendered = 0;

  await handleRouteChange({
    parseRouteHash: () => ({ screen: "menu", vampireId: "" }),
    getHash: () => "#/menu",
    setScreen: (screen) => screens.push(screen),
    render: () => {
      rendered += 1;
    },
    getSelectedVampireId: () => "v-1",
    startNewVampire: () => {
      throw new Error("should not create");
    },
    loadStoredVampires: () => [],
    loadCharacter: () => {},
    resetCreationForms: () => {},
    startPlay: async () => {},
  });

  assert.deepEqual(screens, ["menu"]);
  assert.equal(rendered, 1);
});

test("handleRouteChange loads known vampire for play hash", async () => {
  const loaded = [];
  let started = 0;
  let startPlayArgs = null;

  await handleRouteChange({
    parseRouteHash: () => ({ screen: "play", vampireId: "v-2" }),
    getHash: () => "#/play/v-2",
    setScreen: () => {},
    render: () => {},
    getSelectedVampireId: () => "v-1",
    startNewVampire: () => {},
    loadStoredVampires: () => [{ id: "v-2", data: { name: "Two" } }],
    loadCharacter: (value) => loaded.push(value.id),
    resetCreationForms: () => {},
    startPlay: async (...args) => {
      started += 1;
      startPlayArgs = args;
    },
  });

  assert.deepEqual(loaded, ["v-2"]);
  assert.equal(started, 1);
  assert.deepEqual(startPlayArgs, [], "startPlay must run its own completion gate, not skip it");
});

test("handleRouteChange routes to saves for saves hash", async () => {
  const screens = [];
  let rendered = 0;

  await handleRouteChange({
    parseRouteHash: () => ({ screen: "saves", vampireId: "" }),
    getHash: () => "#/saves",
    setScreen: (screen) => screens.push(screen),
    render: () => {
      rendered += 1;
    },
    getSelectedVampireId: () => "v-1",
    startNewVampire: () => {
      throw new Error("should not create");
    },
    loadStoredVampires: () => [],
    loadCharacter: () => {},
    resetCreationForms: () => {},
    startPlay: async () => {},
  });

  assert.deepEqual(screens, ["saves"]);
  assert.equal(rendered, 1);
});
