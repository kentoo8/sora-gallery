# likes API 実環境疎通確認手順

## 目的

Cloudflare Pages にデプロイされた `sora-gallery` で、Pages Functions + D1 の likes API が実際に動作していることを確認する。

確認対象:

- `GET /api/likes`
- `POST /api/likes`
- `public/videos.json` に存在しない `video_id` の拒否
- D1 binding / schema / Pages Functions の疎通

## 前提

- `npm run build` が成功している。
- `npx wrangler pages deploy dist --project-name sora-gallery` でデプロイ済みである。
- Cloudflare Pages の production 環境に D1 binding `DB` が設定されている。
- D1 に `schema.sql` が適用済みである。
- 確認対象 URL は production の `https://sora-gallery.pages.dev` を基本にする。

preview URL で確認する場合は、`wrangler.toml` の `env.preview` で設定している preview 専用 D1 `sora-gallery-likes-db-preview` を使う。本番 D1 を preview 確認に使い回さない。

## 1. 公開動画 ID を 1 件取得する

```bash
curl -s https://sora-gallery.pages.dev/videos.json | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const videos=JSON.parse(s); console.log(videos[0].id);})'
```

出力された ID を以降の `VIDEO_ID` として使う。

```bash
VIDEO_ID="<ここに公開動画IDを入れる>"
BASE_URL="https://sora-gallery.pages.dev"
```

## 2. GET /api/likes を確認する

```bash
curl -i "$BASE_URL/api/likes"
```

期待値:

- HTTP status が `200`。
- `Content-Type` が `application/json`。
- `Cache-Control` が `no-store`。
- body が以下の形式である。

```json
{
  "likes": {}
}
```

すでに likes が存在する場合、`likes` には `{ "video-id": count }` が入る。

## 3. 存在しない video_id が拒否されることを確認する

```bash
curl -i \
  -X POST "$BASE_URL/api/likes" \
  -H "Content-Type: application/json" \
  --data '{"video_id":"not-in-public-videos-json"}'
```

期待値:

- HTTP status が `404`。
- body が以下の形式である。

```json
{
  "error": "video_id is not in the public video list"
}
```

このリクエストで D1 に行が作られないことが重要である。

## 4. 壊れた JSON が 400 になることを確認する

```bash
curl -i \
  -X POST "$BASE_URL/api/likes" \
  -H "Content-Type: application/json" \
  --data '{'
```

期待値:

- HTTP status が `400`。
- body が以下の形式である。

```json
{
  "error": "Invalid JSON body"
}
```

## 5. 公開動画に like できることを確認する

この確認は実際に D1 の likes count を `+1` する。実行は 1 回でよい。

```bash
curl -i \
  -X POST "$BASE_URL/api/likes" \
  -H "Content-Type: application/json" \
  --data "{\"video_id\":\"$VIDEO_ID\"}"
```

期待値:

- HTTP status が `200`。
- body が以下の形式である。

```json
{
  "success": true,
  "video_id": "<VIDEO_ID>",
  "new_count": 1
}
```

既に likes がある場合、`new_count` は現在値 + 1 になる。

## 6. GET に反映されることを確認する

```bash
curl -s "$BASE_URL/api/likes" | VIDEO_ID="$VIDEO_ID" node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const json=JSON.parse(s); console.log(json.likes[process.env.VIDEO_ID]);})'
```

期待値:

- 数値が表示される。
- 直前の `POST /api/likes` で返った `new_count` と一致する。

## 7. 画面から確認する

1. `https://sora-gallery.pages.dev/video/<VIDEO_ID>` を開く。
2. 再生画面に likes ボタンが表示されることを確認する。
3. ボタンを押す。
4. カウントが増えることを確認する。
5. リロード後もカウントが維持されることを確認する。

ブラウザの LocalStorage により、同じブラウザでは同じ動画を再度 like できない。再確認したい場合は別の動画 ID を使うか、検証用ブラウザプロファイルを使う。

## 失敗時の切り分け

### 404 HTML が返る

`/api/likes` が Pages Functions としてデプロイされていない可能性がある。

確認:

- `functions/api/likes.ts` がコミット済みである。
- `wrangler pages deploy dist --project-name sora-gallery` で Pages にデプロイしている。
- `npx wrangler deploy` や dashboard の `Worker name` フローを使っていない。

### 500 で `DB binding is missing`

D1 binding `DB` が Pages project に設定されていない。

確認:

- Cloudflare Pages project の production 環境に D1 binding `DB` がある。
- binding 名が `DB` と完全一致している。
- preview URL で確認している場合は preview 環境にも binding がある。

### 500 で SQL エラーが返る

D1 に `likes` table がない可能性がある。

確認:

- production D1 に `schema.sql` を適用済みである。
- preview URL で確認している場合は preview D1 にも `schema.sql` を適用済みである。

### POST が 429 になる

簡易 IP レート制限に当たっている。

対応:

- 数秒待ってから再実行する。
- 同一IP/NAT配下で複数回確認していないか確認する。

### POST が 404 になる

`video_id` が現在の `public/videos.json` に存在しない。

確認:

- `GET /videos.json` から取得した ID を使っている。
- 非公開化・削除済みの ID を使っていない。
