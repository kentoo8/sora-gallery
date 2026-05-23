import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_CONCURRENCY = 8;

class RemoteAssetError extends Error {
  constructor(message) {
    super(message);
  }
}

async function checkUrl(url, label) {
  let response;
  try {
    response = await fetch(url, { method: "HEAD", redirect: "follow" });
  } catch (error) {
    throw new RemoteAssetError(`${label}: request failed: ${error.message}`);
  }

  if (!response.ok) {
    throw new RemoteAssetError(`${label}: ${response.status} ${response.statusText}`);
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  const failures = [];
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        await worker(items[index], index);
      } catch (error) {
        failures.push(error);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );

  return failures;
}

export async function validateRemoteAssets(filePath, concurrency = DEFAULT_CONCURRENCY) {
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

  const failures = await runWithConcurrency(assets, concurrency, (asset) =>
    checkUrl(asset.url, asset.label),
  );

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
  const [filePath = "public/videos.json"] = argv;
  await validateRemoteAssets(filePath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
