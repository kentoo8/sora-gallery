import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const LIKES_SOURCE_PATH = new URL("../functions/api/likes.ts", import.meta.url);

async function loadLikesModule() {
  const source = await readFile(LIKES_SOURCE_PATH, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const encoded = encodeURIComponent(`${transpiled.outputText}\n// ${Date.now()}`);
  return import(`data:text/javascript;charset=utf-8,${encoded}`);
}

function createJsonRequest(body, headers = {}) {
  return new Request("https://example.test/api/likes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
  });
}

function createGetRequest() {
  return new Request("https://example.test/api/likes");
}

function createFetchMock(videos) {
  const calls = [];
  const fetchMock = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify(videos), {
      headers: { "Content-Type": "application/json" },
    });
  };

  fetchMock.calls = calls;
  return fetchMock;
}

function createDbMock(initialRows = []) {
  const counts = new Map(initialRows.map((row) => [row.video_id, row.count]));
  const calls = {
    all: 0,
    run: 0,
    first: 0,
    binds: [],
  };

  return {
    calls,
    counts,
    prepare(sql) {
      const statement = {
        bound: [],
        bind(...values) {
          this.bound = values;
          calls.binds.push(values);
          return this;
        },
        async all() {
          calls.all += 1;
          return {
            results: [...counts.entries()].map(([video_id, count]) => ({
              video_id,
              count,
            })),
          };
        },
        async run() {
          calls.run += 1;
          const videoId = this.bound[0];
          if (sql.includes("UPDATE likes")) {
            counts.set(videoId, Math.max((counts.get(videoId) ?? 0) - 1, 0));
          } else {
            counts.set(videoId, (counts.get(videoId) ?? 0) + 1);
          }
          return { success: true };
        },
        async first() {
          calls.first += 1;
          const videoId = this.bound[0];
          return { count: counts.get(videoId) ?? 0 };
        },
      };

      if (!sql.includes("likes")) {
        throw new Error(`Unexpected SQL: ${sql}`);
      }

      return statement;
    },
  };
}

async function withMockedFetch(fetchMock, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("likes POST returns 400 for malformed JSON", async () => {
  const { onRequestPost } = await loadLikesModule();
  const db = createDbMock();
  const fetchMock = createFetchMock([{ id: "public-video" }]);

  await withMockedFetch(fetchMock, async () => {
    const response = await onRequestPost({
      env: { DB: db },
      request: createJsonRequest("{"),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid JSON body" });
    assert.equal(fetchMock.calls.length, 0);
    assert.equal(db.calls.run, 0);
  });
});

test("likes POST rejects video IDs outside public videos.json", async () => {
  const { onRequestPost } = await loadLikesModule();
  const db = createDbMock();
  const fetchMock = createFetchMock([{ id: "public-video" }]);

  await withMockedFetch(fetchMock, async () => {
    const response = await onRequestPost({
      env: { DB: db },
      request: createJsonRequest(JSON.stringify({ video_id: "private-video" })),
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: "video_id is not in the public video list",
    });
    assert.equal(db.calls.run, 0);
  });
});

test("likes POST increments an allowed public video", async () => {
  const { onRequestPost } = await loadLikesModule();
  const db = createDbMock([{ video_id: "public-video", count: 2 }]);
  const fetchMock = createFetchMock([{ id: "public-video" }]);

  await withMockedFetch(fetchMock, async () => {
    const response = await onRequestPost({
      env: { DB: db },
      request: createJsonRequest(JSON.stringify({ video_id: " public-video " })),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      action: "like",
      video_id: "public-video",
      new_count: 3,
    });
    assert.equal(db.calls.run, 1);
  });
});

test("likes POST decrements an allowed public video when unliking", async () => {
  const { onRequestPost } = await loadLikesModule();
  const db = createDbMock([{ video_id: "public-video", count: 2 }]);
  const fetchMock = createFetchMock([{ id: "public-video" }]);

  await withMockedFetch(fetchMock, async () => {
    const response = await onRequestPost({
      env: { DB: db },
      request: createJsonRequest(JSON.stringify({
        video_id: "public-video",
        action: "unlike",
      })),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      action: "unlike",
      video_id: "public-video",
      new_count: 1,
    });
    assert.equal(db.calls.run, 1);
  });
});

test("likes POST never decrements below zero", async () => {
  const { onRequestPost } = await loadLikesModule();
  const db = createDbMock([{ video_id: "public-video", count: 0 }]);
  const fetchMock = createFetchMock([{ id: "public-video" }]);

  await withMockedFetch(fetchMock, async () => {
    const response = await onRequestPost({
      env: { DB: db },
      request: createJsonRequest(JSON.stringify({
        video_id: "public-video",
        action: "unlike",
      })),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      action: "unlike",
      video_id: "public-video",
      new_count: 0,
    });
  });
});

test("likes GET returns only counts for public videos", async () => {
  const { onRequestGet } = await loadLikesModule();
  const db = createDbMock([
    { video_id: "public-video", count: 4 },
    { video_id: "deleted-video", count: 99 },
  ]);
  const fetchMock = createFetchMock([{ id: "public-video" }]);

  await withMockedFetch(fetchMock, async () => {
    const response = await onRequestGet({
      env: { DB: db },
      request: createGetRequest(),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), {
      likes: { "public-video": 4 },
    });
  });
});
