import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../maintenance/_worker.js";

const unavailableBindings = new Proxy({}, {
  get() {
    assert.fail("停止中は通常のアプリ・D1・静的配信へ処理を渡さない");
  },
});

test("maintenance blocks pages, the catalog, old assets and likes without accessing bindings", async () => {
  for (const [method, path] of [
    ["GET", "/"],
    ["GET", "/videos.json"],
    ["GET", "/video/example?tag=test"],
    ["GET", "/assets/previous-app.js"],
    ["GET", "/api/likes"],
    ["POST", "/api/likes"],
  ]) {
    const request = new Request(`https://gallery.example.com${path}`, { method });
    const response = await worker.fetch(request, unavailableBindings);
    assert.equal(response.status, 503, `${method} ${path}`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-sora-gallery-maintenance"), "1");
    assert.match(response.headers.get("content-type"), /text\/html.*utf-8/);
    assert.match(await response.text(), /<h1>公開を一時停止しています<\/h1>/);
  }
});

test("maintenance HEAD is bodyless and the worker covers every route", async () => {
  const response = await worker.fetch(new Request("https://gallery.example.com/", {
    method: "HEAD",
  }), unavailableBindings);
  assert.equal(response.status, 503);
  assert.equal(await response.text(), "");
  const routes = JSON.parse(await readFile(new URL("../maintenance/_routes.json", import.meta.url), "utf8"));
  assert.deepEqual(routes, { version: 1, include: ["/*"], exclude: [] });
});
