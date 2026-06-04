# sora-gallery

Selected Sora generated videos gallery for static web publishing.

## Development

```bash
npm install
cp wrangler.toml.example wrangler.toml
npm run dev
```

`wrangler.toml` の D1 database ID は、自分の Cloudflare 環境の値に置き換えてください。Pages deploy で account ID の指定が必要な場合は、`CLOUDFLARE_ACCOUNT_ID` 環境変数を使ってください。

## Build

```bash
npm run build
```

Cloudflare Pages build output is `dist/`.

## Data

Published videos are defined in `public/videos.json`.
`public/videos.json` is intentionally not tracked by Git; treat it as generated
publish data exported from `sora-player`.
See `docs/examples/videos.example.json` for a complete example.
See `docs/sora_player_export_requirements.md` for the planned export boundary from `sora-player`.
See `docs/r2_publish_runbook.md` for the R2 publishing runbook.
See `docs/pre_publish_checklist.md` for the pre-publish checklist.
See `docs/cloudflare_pages_deploy.md` for the Cloudflare Pages deployment procedure.

```ts
type GalleryVideo = {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  prompt: string;
  tags: string[];
  createdAt?: string;
  description?: string;
};
```

`videoUrl` and `thumbnailUrl` must be public `https://...` URLs.
`prompt` is a required field, but an empty string is allowed.

Invalid entries are treated as data errors instead of being silently ignored.
Only the documented fields are allowed; local-only fields such as `filename` or `account` fail validation.

```bash
npm run validate:data
npm test
```
