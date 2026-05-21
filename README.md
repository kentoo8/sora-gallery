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
