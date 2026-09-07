import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/gallery-url.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { readGalleryFilters, galleryUrl } = await import(
  `data:text/javascript;charset=utf-8,${encodeURIComponent(outputText)}`
);
const origin = "https://example.test";

test("shared URLs restore Japanese tags and search terms including URL delimiters", () => {
  const filters = { tag: "高木ゆい & #+", query: "@cameo 夏 空 + 海" };
  const shared = galleryUrl(`${origin}/`, "/", filters);
  assert.deepEqual(readGalleryFilters(new URL(shared, origin).search), filters);
});

test("video navigation and return to gallery retain filters", () => {
  const start = `${origin}${galleryUrl(`${origin}/`, "/", { tag: "高木ゆい", query: "夏" })}`;
  const video = galleryUrl(start, "/video/public-id");
  assert.equal(galleryUrl(new URL(video, origin).href, "/"), new URL(start).pathname + new URL(start).search);
});

test("clearing filters removes their parameters and preserves unrelated URL state", () => {
  assert.equal(
    galleryUrl(`${origin}/?tag=test&q=word&utm_source=share#top`, "/", { tag: "", query: "" }),
    "/?utm_source=share#top",
  );
  assert.deepEqual(readGalleryFilters(""), { tag: "", query: "" });
});

test("untagged and unknown tags survive sharing without falling back to all videos", () => {
  for (const tag of ["__untagged__", "存在しないタグ"]) {
    const url = galleryUrl(`${origin}/`, "/", { tag, query: "" });
    assert.equal(readGalleryFilters(new URL(url, origin).search).tag, tag);
  }
});
