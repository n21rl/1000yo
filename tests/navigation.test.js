import test from "node:test";
import assert from "node:assert/strict";
import {
  applyScreenVisibility,
  getRouteForScreen,
  updateDocumentTitle,
} from "../src/navigation.js";

test("getRouteForScreen builds menu/create/play routes", () => {
  assert.equal(getRouteForScreen("menu", "id-1"), "#/menu");
  assert.equal(getRouteForScreen("creation", "id-1"), "#/create");
  assert.equal(getRouteForScreen("play", "id-1"), "#/play/id-1");
  assert.equal(getRouteForScreen("play", ""), "#/menu");
});

test("updateDocumentTitle uses screen labels", () => {
  const mockDocument = { title: "" };
  updateDocumentTitle("creation", mockDocument);
  assert.equal(mockDocument.title, "Vampire Creation · 1000yo");
});

test("applyScreenVisibility toggles hidden flags by active screen", () => {
  const elements = {
    menuScreen: { hidden: false },
    creationScreen: { hidden: false },
    playScreen: { hidden: false },
  };

  applyScreenVisibility("play", elements);

  assert.equal(elements.menuScreen.hidden, true);
  assert.equal(elements.creationScreen.hidden, true);
  assert.equal(elements.playScreen.hidden, false);
});
