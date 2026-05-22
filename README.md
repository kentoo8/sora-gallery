# sora-gallery

Selected Sora generated videos gallery for static web publishing.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Cloudflare Pages build output is `dist/`.

## Data

Published videos are defined in `public/videos.json`.
See `docs/examples/videos.example.json` for a complete example.
See `docs/sora_player_export_requirements.md` for the planned export boundary from `sora-player`.

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

Invalid entries are treated as data errors instead of being silently ignored.
Only the documented fields are allowed; local-only fields such as `filename` or `account` fail validation.

```bash
npm run validate:data
npm test
```
