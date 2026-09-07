import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildSharePages, renderSharePage } from "./build-share-pages.mjs";

const template = '<html><head><title>Sora Gallery</title><meta\n name="description" content="default" /><script src="/assets/app.js"></script></head><body><div id="root"></div></body></html>';
const video = {
  id: "public-id", prompt: "夏の動画", tags: [],
  thumbnailUrl: "https://media.example.test/thumb.webp?a=1&b=2",
  videoUrl: "https://media.example.test/video.mp4",
};

test("share HTML contains image and video metadata before JavaScript runs and keeps the app", () => {
  const html = renderSharePage(template, video, "https://gallery.example.test");
  assert.ok(html.includes('property="og:image" content="https://media.example.test/thumb.webp?a=1&amp;b=2"'));
  assert.ok(html.includes('property="og:video" content="https://media.example.test/video.mp4"'));
  assert.ok(html.includes('property="og:video:type" content="video/mp4"'));
  assert.ok(html.includes('property="og:url" content="https://gallery.example.test/video/public-id"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(html.includes('<script src="/assets/app.js"></script>'));
  assert.ok(html.includes('<div id="root"></div>'));
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
});

test("untrusted text is escaped, replacement tokens stay literal, and descriptions are preferred", () => {
  const html = renderSharePage(template, {
    ...video, prompt: '</title><script>alert("x")</script> & $&',
    description: '公開コメント "猫"\n 次の行',
  });
  assert.ok(!html.includes('<script>alert('));
  assert.ok(html.includes('&lt;/title&gt;&lt;script&gt;alert(&quot;x&quot;)'));
  assert.ok(html.includes('$&amp;'));
  assert.ok(html.includes('name="description" content="公開コメント &quot;猫&quot; 次の行"'));
});

test("empty prompts have fallback text and long Unicode titles are truncated safely", () => {
  assert.ok(renderSharePage(template, { ...video, prompt: " " }).includes('content="Sora Gallery の動画"'));
  const html = renderSharePage(template, { ...video, prompt: "😀".repeat(100) });
  assert.ok(html.includes(`content="${"😀".repeat(79)}…"`));
});

test("unsafe output paths and invalid site origins fail before generation", () => {
  for (const id of ["../escape", "a/b", "..", "a\\b"]) {
    assert.throws(() => renderSharePage(template, { ...video, id }), /Invalid share page/);
  }
  for (const url of ["http://example.test", "https://example.test/path", "https://user:pass@example.test"]) {
    assert.throws(() => renderSharePage(template, video, url), /SITE_URL/);
  }
});

test("generation uses the deployed catalog and removes pages for unpublished videos on rebuild", async () => {
  const dist = await mkdtemp(join(tmpdir(), "gallery-share-"));
  try {
    await writeFile(join(dist, "index.html"), template);
    await writeFile(join(dist, "videos.json"), JSON.stringify([video, { ...video, id: "second", thumbnailUrl: "https://media.example.test/second.webp" }]));
    await buildSharePages(dist);
    assert.deepEqual((await readdir(join(dist, "video"))).sort(), ["public-id.html", "second.html"]);
    assert.ok((await readFile(join(dist, "video", "second.html"), "utf8")).includes('content="https://media.example.test/second.webp"'));
    await writeFile(join(dist, "videos.json"), "[]");
    await buildSharePages(dist);
    assert.deepEqual(await readdir(join(dist, "video")), []);
    assert.equal(await readFile(join(dist, "index.html"), "utf8"), template);
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
});
