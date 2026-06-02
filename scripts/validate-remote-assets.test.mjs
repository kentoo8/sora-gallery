import assert from "node:assert/strict";
import test from "node:test";

import { formatProgress } from "./validate-remote-assets.mjs";

test("formatProgress formats a completed progress bar", () => {
  assert.equal(formatProgress(2, 2, 4), "[####] 2/2");
});
