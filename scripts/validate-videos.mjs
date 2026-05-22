import { readFile } from "node:fs/promises";

const HTTPS_URL_PATTERN = /^https:\/\//i;

class ValidationError extends Error {
  constructor(filePath, index, message) {
    super(`${filePath}[${index}]: ${message}`);
  }
}

function assertString(value, filePath, index, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(filePath, index, `${fieldName} must be a non-empty string`);
  }
}

function assertHttpsUrl(value, filePath, index, fieldName) {
  assertString(value, filePath, index, fieldName);
  if (!HTTPS_URL_PATTERN.test(value)) {
    throw new ValidationError(filePath, index, `${fieldName} must start with https://`);
  }
}

function validateVideo(item, filePath, index, seenIds) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ValidationError(filePath, index, "item must be an object");
  }

  assertString(item.id, filePath, index, "id");
  if (seenIds.has(item.id)) {
    throw new ValidationError(filePath, index, `duplicate id "${item.id}"`);
  }
  seenIds.add(item.id);

  assertHttpsUrl(item.videoUrl, filePath, index, "videoUrl");
  assertHttpsUrl(item.thumbnailUrl, filePath, index, "thumbnailUrl");
  assertString(item.prompt, filePath, index, "prompt");

  if (!Array.isArray(item.tags)) {
    throw new ValidationError(filePath, index, "tags must be an array");
  }

  const seenTags = new Set();
  for (const tag of item.tags) {
    if (typeof tag !== "string" || tag.trim().length === 0) {
      throw new ValidationError(filePath, index, "tags must contain non-empty strings");
    }
    if (tag !== tag.trim()) {
      throw new ValidationError(filePath, index, `tag "${tag}" has leading or trailing spaces`);
    }
    if (seenTags.has(tag)) {
      throw new ValidationError(filePath, index, `duplicate tag "${tag}"`);
    }
    seenTags.add(tag);
  }

  if (item.createdAt !== undefined) {
    assertString(item.createdAt, filePath, index, "createdAt");
    if (!Number.isFinite(Date.parse(item.createdAt))) {
      throw new ValidationError(filePath, index, "createdAt must be an ISO-compatible date string");
    }
  }

  if (item.description !== undefined && typeof item.description !== "string") {
    throw new ValidationError(filePath, index, "description must be a string when present");
  }
}

async function validateFile(filePath) {
  const source = await readFile(filePath, "utf8");
  const data = JSON.parse(source);

  if (!Array.isArray(data)) {
    throw new Error(`${filePath}: root must be an array`);
  }

  const seenIds = new Set();
  data.forEach((item, index) => validateVideo(item, filePath, index, seenIds));
  console.log(`${filePath}: ${data.length} video(s) OK`);
}

const filePaths = process.argv.slice(2);
if (filePaths.length === 0) {
  filePaths.push("public/videos.json");
}

for (const filePath of filePaths) {
  await validateFile(filePath);
}
