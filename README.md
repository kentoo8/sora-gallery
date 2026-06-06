# sora-gallery

選別済みの Sora 生成動画を Web 公開するためのギャラリーです。

`sora-player` から export された公開用データを読み取り、Cloudflare Pages 上で静的ギャラリーとして表示します。動画一覧、検索、タグ絞り込み、再生画面は `public/videos.json` を正としてクライアント側で処理し、例外として likes のみ Pages Functions + D1 を使います。

## 開発

```bash
npm install
cp wrangler.toml.example wrangler.toml
npm run dev
```

`wrangler.toml` の D1 database ID は、自分の Cloudflare 環境の値に置き換えてください。Pages deploy で account ID の指定が必要な場合は、`CLOUDFLARE_ACCOUNT_ID` 環境変数を使ってください。

## ビルド

```bash
npm run build
```

Cloudflare Pages のビルド出力先は `dist/` です。

## 公開データ

公開動画は `public/videos.json` で定義します。

`public/videos.json` は意図的に Git 管理しません。`sora-player` から export された公開用生成物として扱ってください。

完全な例は `docs/examples/videos.example.json` を参照してください。関連する運用ドキュメントは以下です。

- `docs/sora_player_export_requirements.md`: `sora-player` からの export 境界。
- `docs/r2_publish_runbook.md`: R2 公開手順。
- `docs/pre_publish_checklist.md`: 公開前チェックリスト。
- `docs/cloudflare_pages_deploy.md`: Cloudflare Pages デプロイ手順。

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

`videoUrl` と `thumbnailUrl` は公開済みの `https://...` 絶対 URL である必要があります。
`prompt` は必須フィールドですが、空文字は許容します。

不正な entry は黙って無視せず、データエラーとして扱います。
許可されるのは上記スキーマのフィールドだけです。`filename` や `account` などのローカル専用フィールドが含まれている場合は validation に失敗します。

## 検証

```bash
npm run validate:data
npm test
```
