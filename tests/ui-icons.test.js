import test from "node:test";
import assert from "node:assert/strict";
import { MATERIAL_ICON_NODES, resolveMaterialIconName } from "../src/ui/icons.js";

test("resolveMaterialIconName maps aliases and preserves unknown values", () => {
  assert.equal(resolveMaterialIconName("plus"), "add");
  assert.equal(resolveMaterialIconName("trash"), "delete");
  assert.equal(resolveMaterialIconName("keyboard_arrow_down"), "keyboard_arrow_down");
});

test("MATERIAL_ICON_NODES includes path data for common fallback icons", () => {
  assert.ok(Array.isArray(MATERIAL_ICON_NODES.add));
  assert.ok(Array.isArray(MATERIAL_ICON_NODES.delete));
  assert.ok(Array.isArray(MATERIAL_ICON_NODES.check_box));
});
