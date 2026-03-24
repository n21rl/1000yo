import test from "node:test";
import assert from "node:assert/strict";
import { bindEscapeKeyHandler, bindHashChange } from "../src/events/global-events.js";

test("bindEscapeKeyHandler closes only when modal is open and escape is pressed", () => {
  let capturedHandler = null;
  const originalDocument = global.document;
  try {
    global.document = {
      addEventListener(type, handler) {
        if (type === "keydown") capturedHandler = handler;
      },
    };

    let closeCount = 0;
    bindEscapeKeyHandler(() => false, () => {
      closeCount += 1;
    });
    capturedHandler?.({ key: "Escape" });

    bindEscapeKeyHandler(() => true, () => {
      closeCount += 1;
    });
    capturedHandler?.({ key: "Enter" });
    capturedHandler?.({ key: "Escape" });

    assert.equal(closeCount, 1);
  } finally {
    global.document = originalDocument;
  }
});

test("bindHashChange wires hashchange listener", () => {
  let capturedHandler = null;
  const originalWindow = global.window;
  try {
    global.window = {
      addEventListener(type, handler) {
        if (type === "hashchange") capturedHandler = handler;
      },
    };

    let called = 0;
    bindHashChange(() => {
      called += 1;
    });
    capturedHandler?.();

    assert.equal(called, 1);
  } finally {
    global.window = originalWindow;
  }
});
