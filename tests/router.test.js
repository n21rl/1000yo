import test from "node:test";
import assert from "node:assert/strict";
import { parseRouteHash } from "../src/router.js";

test("parseRouteHash supports menu, create, play, and saves routes", () => {
  assert.deepEqual(parseRouteHash("#/menu"), { screen: "menu", vampireId: "" });
  assert.deepEqual(parseRouteHash("#/create"), { screen: "creation", vampireId: "" });
  assert.deepEqual(parseRouteHash("#/play/v-123"), { screen: "play", vampireId: "v-123" });
  assert.deepEqual(parseRouteHash("#/saves"), { screen: "saves", vampireId: "" });
});

test("parseRouteHash defaults invalid or empty hashes to menu", () => {
  assert.deepEqual(parseRouteHash(""), { screen: "menu", vampireId: "" });
  assert.deepEqual(parseRouteHash("#/unknown"), { screen: "menu", vampireId: "" });
});
