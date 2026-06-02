import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_REQUEST_DELAY_MS = 100;

class RemoteAssetError extends Error {
  constructor(message) {
    super(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status) {
  return status === 429 || status >= 500;
}

async function checkUrl(url, label, options) {
  let lastError;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { method: "HEAD", redirect: "follow" });
    } catch (error) {
      lastError = new RemoteAssetError(`${label}: request failed: ${error.message}`);
      if (attempt < options.retries) {
        await sleep(options.retryDelayMs * (attempt + 1));
        continue;
      }
      throw lastError;
    }

    if (response.ok) return;

    lastError = new RemoteAssetError(`${label}: ${response.status} ${response.statusText}`);
    if (!shouldRetryStatus(response.status) || attempt >= options.retries) {
      throw lastError;
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const retryDelayMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : options.retryDelayMs * (attempt + 1);
    await sleep(retryDelayMs);
  }

  throw lastError;
}

async function runWithConcurrency(items, concurrency, worker, onProgress) {
  const failures = [];
  let nextIndex = 0;
  let completed = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        await worker(items[index], index);
      } catch (error) {
        failures.push(error);
      }
      completed += 1;
      onProgress?.({ current: completed, total: items.length });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );

  return failures;
}

export function formatProgress(current, total, width = 24) {
  const ratio = total === 0 ? 1 : current / total;
  const filled = Math.round(ratio * width);
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}] ${current}/${total}`;
}

export function createProgressReporter(stream = process.stdout) {
  return ({ current, total }) => {
    const line = `Checking remote assets ${formatProgress(current, total)}`;
    if (stream.isTTY) {
      stream.write(`\r${line}`);
      if (current === total) stream.write("\n");
    } else {
      stream.write(`${line}\n`);
    }
  };
}

export async function validateRemoteAssets(filePath, options = {}) {
  const resolvedOptions = {
    concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
    retries: options.retries ?? DEFAULT_RETRIES,
    retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    requestDelayMs: options.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS,
  };
  const videos = JSON.parse(await readFile(filePath, "utf8"));
  if (!Array.isArray(videos)) {
    throw new Error(`${filePath}: root must be an array`);
  }

  const assets = videos.flatMap((video, index) => [
    {
      label: `${filePath}[${index}] ${video.id} videoUrl`,
      url: video.videoUrl,
    },
    {
      label: `${filePath}[${index}] ${video.id} thumbnailUrl`,
      url: video.thumbnailUrl,
    },
  ]);

  console.log(
    `${filePath}: checking ${assets.length} remote asset(s) ` +
      `(concurrency=${resolvedOptions.concurrency}, retries=${resolvedOptions.retries})`,
  );

  const failures = await runWithConcurrency(assets, resolvedOptions.concurrency, async (asset) => {
    await checkUrl(asset.url, asset.label, resolvedOptions);
    if (resolvedOptions.requestDelayMs > 0) {
      await sleep(resolvedOptions.requestDelayMs);
    }
  }, options.onProgress ?? createProgressReporter());

  if (failures.length > 0) {
    for (const failure of failures.slice(0, 20)) {
      console.error(failure instanceof Error ? failure.message : failure);
    }
    if (failures.length > 20) {
      console.error(`...and ${failures.length - 20} more`);
    }
    throw new Error(`${filePath}: ${failures.length} remote asset(s) failed`);
  }

  console.log(`${filePath}: ${videos.length} video(s), ${assets.length} remote asset(s) OK`);
}

export async function runCli(argv) {
  const options = {};
  let filePath = "public/videos.json";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--concurrency") {
      options.concurrency = parsePositiveInteger(arg, next);
      index += 1;
    } else if (arg === "--retries") {
      options.retries = parseNonNegativeInteger(arg, next);
      index += 1;
    } else if (arg === "--retry-delay-ms") {
      options.retryDelayMs = parseNonNegativeInteger(arg, next);
      index += 1;
    } else if (arg === "--request-delay-ms") {
      options.requestDelayMs = parseNonNegativeInteger(arg, next);
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      filePath = arg;
    }
  }

  await validateRemoteAssets(filePath, options);
}

function parsePositiveInteger(option, value) {
  const parsed = parseNonNegativeInteger(option, value);
  if (parsed <= 0) {
    throw new Error(`${option} must be greater than 0`);
  }
  return parsed;
}

function parseNonNegativeInteger(option, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${option} must be a non-negative integer`);
  }
  return parsed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
