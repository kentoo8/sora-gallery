import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const HTTPS_URL_PATTERN = /^https:\/\//i;
const ALLOWED_FIELDS = new Set([
  "id",
  "videoUrl",
  "thumbnailUrl",
  "prompt",
  "tags",
  "createdAt",
  "description",
]);
const FORBIDDEN_PUBLIC_TEXT_PATTERNS = [
  /\/Users\//i,
  /\\Users\\/i,
  /[A-Z]:\\/i,
  /file:\/\//i,
  /config\.json/i,
  /generations\.json/i,
  /account\.json/i,
  /data\/tags\.json/i,
];

export class ValidationError extends Error {
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

  const url = new URL(value);
  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0" ||
    url.hostname.endsWith(".local")
  ) {
    throw new ValidationError(filePath, index, `${fieldName} must not point to a local host`);
  }
}

function assertNoForbiddenPublicText(value, filePath, index, fieldName) {
  if (typeof value !== "string") return;

  for (const pattern of FORBIDDEN_PUBLIC_TEXT_PATTERNS) {
    if (pattern.test(value)) {
      throw new ValidationError(
        filePath,
        index,
        `${fieldName} appears to contain local/private information`,
      );
    }
  }
}

export function validateVideo(item, filePath, index, seenIds, seenVideoUrls, seenThumbnailUrls) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ValidationError(filePath, index, "item must be an object");
  }

  for (const key of Object.keys(item)) {
    if (!ALLOWED_FIELDS.has(key)) {
      throw new ValidationError(filePath, index, `unknown field "${key}"`);
    }
  }

  assertString(item.id, filePath, index, "id");
  assertNoForbiddenPublicText(item.id, filePath, index, "id");
  if (seenIds.has(item.id)) {
    throw new ValidationError(filePath, index, `duplicate id "${item.id}"`);
  }
  seenIds.add(item.id);

  assertHttpsUrl(item.videoUrl, filePath, index, "videoUrl");
  assertHttpsUrl(item.thumbnailUrl, filePath, index, "thumbnailUrl");
  assertNoForbiddenPublicText(item.videoUrl, filePath, index, "videoUrl");
  assertNoForbiddenPublicText(item.thumbnailUrl, filePath, index, "thumbnailUrl");
  if (seenVideoUrls.has(item.videoUrl)) {
    throw new ValidationError(filePath, index, `duplicate videoUrl "${item.videoUrl}"`);
  }
  if (seenThumbnailUrls.has(item.thumbnailUrl)) {
    throw new ValidationError(filePath, index, `duplicate thumbnailUrl "${item.thumbnailUrl}"`);
  }
  seenVideoUrls.add(item.videoUrl);
  seenThumbnailUrls.add(item.thumbnailUrl);

  assertString(item.prompt, filePath, index, "prompt");
  assertNoForbiddenPublicText(item.prompt, filePath, index, "prompt");

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
    assertNoForbiddenPublicText(tag, filePath, index, "tag");
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
  assertNoForbiddenPublicText(item.description, filePath, index, "description");
}

export async function validateFile(filePath) {
  const source = await readFile(filePath, "utf8");
  const data = JSON.parse(source);

  if (!Array.isArray(data)) {
    throw new Error(`${filePath}: root must be an array`);
  }

  const seenIds = new Set();
  const seenVideoUrls = new Set();
  const seenThumbnailUrls = new Set();
  data.forEach((item, index) =>
    validateVideo(item, filePath, index, seenIds, seenVideoUrls, seenThumbnailUrls),
  );
  console.log(`${filePath}: ${data.length} video(s) OK`);
}

export async function runCli(filePaths) {
  const targets = filePaths.length > 0 ? filePaths : ["public/videos.json"];
  for (const filePath of targets) {
    await validateFile(filePath);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
