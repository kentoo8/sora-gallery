# Cloudflare Pages デプロイ手順

## 方針

`sora-gallery` は Vite で生成した `dist/` を Cloudflare Pages に静的デプロイする。

Cloudflare dashboard の Workers & Pages 画面にある `Upload your static files` / `Worker name` フローは使わない。UI 上は静的ファイルをアップロードしているように見えても、Worker 作成フローと混ざって分かりにくく、名前衝突やアップロード待ちで止まりやすいため。

初期公開では `wrangler pages deploy` を使う。

## デプロイ

```bash
cd /Users/kentaokazaki/src/sora-gallery
npm run validate:remote
npm run build
npx wrangler pages deploy dist --project-name sora-gallery
```

重要:

- `npx wrangler deploy` ではない。
- `npx wrangler pages deploy dist --project-name sora-gallery` を使う。
- `dist` は build 済みの静的公開物である。
- 初回に project 作成を聞かれたら作成する。
- production branch を聞かれたら `main` を指定する。

## 初回デプロイ結果

2026-05-23 に `wrangler pages deploy dist --project-name sora-gallery` で初回デプロイした。

出力された preview URL:

```text
https://4531bb51.sora-gallery.pages.dev
```

デプロイ直後に `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` が出た場合は、Cloudflare Pages の証明書反映待ちの可能性がある。まず数分から 30 分程度待ち、以下を確認する。

```text
https://sora-gallery.pages.dev
https://4531bb51.sora-gallery.pages.dev
```

## 公開後確認

```text
/
/videos.json
/video/7336a931-c2d1-477b-b9a6-63db1aacd7c2
```

確認すること:

- 一覧が表示される。
- `videos.json` が 99 件で取得できる。
- 個別動画 URL が 404 にならない。
- R2 の動画が再生できる。
- `npm run validate:remote` が通っている。
- ミュート解除で音が出る。
- 検索できる。
- タグ絞り込みできる。

## 使わない導線

以下の導線は初期公開では使わない。

- Cloudflare dashboard の `Upload your static files`。
- `Worker name` を入力して static assets をアップロードする画面。
- `npx wrangler deploy`。

理由:

- Workers と Pages の UI が統合されていて、静的サイトの意図と違う Worker 作成フローに入りやすい。
- `Worker name` の衝突やアップロード待ちで止まりやすい。
- `wrangler pages deploy dist` の方が、`dist/` を Pages として公開していることが明確。
