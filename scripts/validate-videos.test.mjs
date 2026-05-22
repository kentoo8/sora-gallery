import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateFile, validateVideo, ValidationError } from "./validate-videos.mjs";

function validVideo(overrides = {}) {
  return {
    id: "01HX0000000000000000000001",
    videoUrl: "https://media.example.com/videos/one.mp4",
    thumbnailUrl: "https://media.example.com/thumbnails/one.webp",
    prompt: "A public prompt with @example.",
    tags: ["cinematic", "neon"],
    createdAt: "2026-05-22T00:00:00.000Z",
    description: "Public description.",
    ...overrides,
  };
}

function validateSingle(video) {
  validateVideo(
    video,
    "test.json",
    0,
    new Set(),
    new Set(),
    new Set(),
  );
}

test("accepts a valid public video item", () => {
  assert.doesNotThrow(() => validateSingle(validVideo()));
});

test("rejects unknown local-only fields", () => {
  assert.throws(
    () => validateSingle(validVideo({ filename: "local.mp4" })),
    /unknown field "filename"/,
  );
});

test("rejects non-https URLs", () => {
  assert.throws(
    () => validateSingle(validVideo({ videoUrl: "http://media.example.com/one.mp4" })),
    /videoUrl must start with https:\/\//,
  );
});

test("rejects localhost URLs", () => {
  assert.throws(
    () => validateSingle(validVideo({ thumbnailUrl: "https://localhost/thumb.webp" })),
    /thumbnailUrl must not point to a local host/,
  );
});

test("rejects local or private text in public fields", () => {
  assert.throws(
    () => validateSingle(validVideo({ prompt: "see /Users/me/private/video.mp4" })),
    /prompt appears to contain local\/private information/,
  );
});

test("rejects duplicate tags in one video", () => {
  assert.throws(
    () => validateSingle(validVideo({ tags: ["neon", "neon"] })),
    /duplicate tag "neon"/,
  );
});

test("rejects duplicate IDs across a file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sora-gallery-test-"));
  const filePath = join(dir, "videos.json");

  try {
    await writeFile(
      filePath,
      JSON.stringify([
        validVideo(),
        validVideo({
          videoUrl: "https://media.example.com/videos/two.mp4",
          thumbnailUrl: "https://media.example.com/thumbnails/two.webp",
        }),
      ]),
    );

    await assert.rejects(() => validateFile(filePath), /duplicate id/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("uses indexed validation errors", () => {
  assert.throws(
    () => validateSingle(validVideo({ tags: "neon" })),
    (error) =>
      error instanceof ValidationError &&
      error.message === "test.json[0]: tags must be an array",
  );
});
