import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_SITE_URL = "https://sora-gallery.pages.dev";

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function excerpt(value, length) {
  const characters = Array.from(value.replace(/\s+/g, " ").trim());
  return characters.length > length
    ? characters.slice(0, length - 1).join("") + "…"
    : characters.join("");
}

function siteOrigin(siteUrl) {
  const url = new URL(siteUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URL must be an HTTPS origin without a path, credentials, query or fragment");
  }
  return url.origin;
}

export function renderSharePage(template, video, siteUrl = DEFAULT_SITE_URL) {
  // IDs become filenames, so reject path separators and traversal before writing.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(video.id)) throw new Error("Invalid share page video ID");
  const url = `${siteOrigin(siteUrl)}/video/${video.id}`;
  const title = excerpt(video.prompt, 80) || "Sora Gallery の動画";
  const description = excerpt(video.description?.trim() || video.prompt, 200) || "Sora で生成した動画を Sora Gallery で見る。";
  const meta = (attribute, name, content) =>
    `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`;
  const metadata = [
    `<title>${escapeHtml(title)} | Sora Gallery</title>`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    meta("name", "description", description),
    meta("property", "og:site_name", "Sora Gallery"),
    meta("property", "og:type", "video.other"),
    meta("property", "og:title", title),
    meta("property", "og:description", description),
    meta("property", "og:url", url),
    meta("property", "og:image", video.thumbnailUrl),
    meta("property", "og:image:alt", "動画のサムネイル"),
    meta("property", "og:video", video.videoUrl),
    meta("property", "og:video:secure_url", video.videoUrl),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", description),
    meta("name", "twitter:image", video.thumbnailUrl),
    meta("name", "twitter:image:alt", "動画のサムネイル"),
  ];
  const extension = new URL(video.videoUrl).pathname.split(".").at(-1).toLowerCase();
  const mime = { mp4: "video/mp4", webm: "video/webm" }[extension];
  if (mime) metadata.push(meta("property", "og:video:type", mime));
  if (!template.includes("</head>")) throw new Error("Built HTML is missing </head>");
  return template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace("</head>", () => `${metadata.join("\n    ")}\n  </head>`);
}

export async function buildSharePages(distDir = "dist", siteUrl = DEFAULT_SITE_URL) {
  const template = await readFile(join(distDir, "index.html"), "utf8");
  const videos = JSON.parse(await readFile(join(distDir, "videos.json"), "utf8"));
  siteOrigin(siteUrl);
  // Render everything first so invalid input cannot leave partially generated pages.
  const pages = videos.map((video) => [video.id, renderSharePage(template, video, siteUrl)]);
  const outputDir = join(distDir, "video");
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  for (const [id, html] of pages) await writeFile(join(outputDir, `${id}.html`), html);
  console.log(`Generated ${pages.length} video share page(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await buildSharePages("dist", process.env.SITE_URL || DEFAULT_SITE_URL);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
