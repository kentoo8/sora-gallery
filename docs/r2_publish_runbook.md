# R2 公開手順書

## 目的

`sora-gallery` の動画とサムネイルを Cloudflare R2 から公開し、`public/videos.json` に安全な公開 URL だけを含める。

この手順では、`sora-player` が公開対象の選別、公開 ID の生成、object key の決定、`videos.json` の生成を担当する。`sora-gallery` は生成済み JSON を読むだけにする。

## 決める値

本番作業前に以下を決める。

| 項目 | 推奨値 | 状態 |
| --- | --- | --- |
| R2 bucket | `sora-gallery-media` | 採用 |
| 初期公開 URL | Cloudflare R2 の標準公開 URL | 採用 |
| 将来の公開ドメイン | `sora-media.hio1345.com` | 候補 |
| 公開 base URL | `https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev` | 採用 |
| 動画 object key | `videos/{publicId}.mp4` | 推奨 |
| サムネイル object key | `thumbnails/{publicId}.webp` | 推奨 |
| 公開対象タグ | `高木ゆい` | 初期候補 |
| 除外タグ | `meta:no-public`, `ぼっちざろっく！`, `けいおん！` | 採用 |
| R2 アップロード手段 | `rclone` | 採用 |

`--public-base-url` には、object key の `videos/...` と `thumbnails/...` より上の URL を指定する。

初期公開では独自ドメインを使わず、Cloudflare R2 の標準公開 URL で進める。独自ドメインを取得した場合は、`sora-media.hio1345.com` を R2 に割り当てる候補とする。

`https://media.example.com/sora` のように path prefix を使いたい場合は、R2 側の object key も `sora/videos/...` にする必要がある。現在の `sora-player` export script は `videos/...` と `thumbnails/...` を前提にしているため、初期は path prefix なしの base URL を使う。

例:

```bash
--public-base-url https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev
```

この場合、生成される URL は以下になる。

```text
https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/videos/{publicId}.mp4
https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/thumbnails/{publicId}.webp
```

## R2 側の準備

1. Cloudflare R2 に bucket を作成する。
2. 初期は R2 の標準公開 URL を有効にする。
3. 公開 URL で匿名 GET できることを確認する。
4. Cloudflare のキャッシュ方針を確認する。
5. 削除や差し替え時に cache purge が必要か確認する。

独自ドメインは初期公開の必須条件にしない。`hio1345.com` を取得した場合は、後から `sora-media.hio1345.com` を bucket に接続し、`public/videos.json` を再生成する。

初期リリースでは、R2 への書き込み権限や API token を `sora-gallery` に置かない。アップロードはローカル作業または `sora-player` 側の補助スクリプトで行う。

### bucket 作成方法

Cloudflare dashboard で作成する場合:

1. Cloudflare dashboard を開く。
2. R2 Object Storage を開く。
3. bucket 名 `sora-gallery-media` で bucket を作成する。
4. bucket の公開アクセス設定で R2 標準公開 URL を有効にする。
5. 発行された `https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev` を控える。

`wrangler` で作成する場合:

```bash
npx wrangler r2 bucket create sora-gallery-media
```

Codex などの非対話環境から実行する場合は、R2 bucket 作成権限を持つ最小権限 API token をローカル環境変数 `CLOUDFLARE_API_TOKEN` に設定してから実行する。token は repo、docs、チャットに記録しない。

## object key 方針

公開 object key に以下を含めない。

- 元ファイル名。
- 元 ULID。
- ローカルディレクトリ構造。
- アカウント名。
- `generations.json` 由来の生 ID。

公開 object key は、`sora-player` の export manifest が保持する公開 ID から作る。

```text
videos/{publicId}.mp4
thumbnails/{publicId}.webp
```

## 初回公開の流れ

1. `sora-player` で公開対象タグと除外タグを確認する。

   通常運用では、非公開の `data/gallery-export-config.json` にまとめる。

   ```json
   {
     "version": 1,
     "publicBaseUrl": "https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev",
     "includeTags": ["高木ゆい"],
     "excludeTags": ["meta:no-public", "ぼっちざろっく！", "けいおん！"],
     "privateTagPrefixes": ["meta:"],
     "allowedMetaTags": ["meta:no-public"]
   }
   ```

2. 一時出力で export 結果を確認する。

   ```bash
   cd /Users/kentaokazaki/src/sora-player
   npm run export:gallery -- \
     --config data/gallery-export-config.json \
     --out /private/tmp/sora-gallery-export/videos.json \
     --manifest /private/tmp/sora-gallery-export/manifest.json
   ```

3. `sora-gallery` の validator で確認する。

   ```bash
   cd /Users/kentaokazaki/src/sora-gallery
   node scripts/validate-videos.mjs /private/tmp/sora-gallery-export/videos.json
   ```

4. `sora-player` でアップロード用ディレクトリを生成する。

   ```bash
   cd /Users/kentaokazaki/src/sora-player
   npm run prepare:gallery-upload -- \
     --config data/gallery-export-config.json \
     --out /private/tmp/sora-gallery-upload-prod
   ```

   `--out` には空のディレクトリを指定する。既存ファイルがある場合は、古い upload 対象の混入を避けるため prepare コマンドがエラーにする。

5. manifest の object key に従って、動画とサムネイルを R2 にアップロードする。

   初期のアップロード手段は `rclone` とする。`wrangler r2 object put` は単発確認には使えるが、動画 100 本規模の bulk upload には使わない。

   ```bash
   rclone copy /private/tmp/sora-gallery-upload-prod/videos r2:sora-gallery-media/videos
   rclone copy /private/tmp/sora-gallery-upload-prod/thumbnails r2:sora-gallery-media/thumbnails
   ```

6. 代表 URL をブラウザまたは `curl` で確認する。

   ```bash
   curl -I https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/videos/{publicId}.mp4
   curl -I https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/thumbnails/{publicId}.webp
   ```

7. 本番の `public/videos.json` を生成する。

   ```bash
   cd /Users/kentaokazaki/src/sora-player
   npm run export:gallery -- \
     --config data/gallery-export-config.json \
     --out ../sora-gallery/public/videos.json
   ```

8. `sora-gallery` で検証する。

   ```bash
   cd /Users/kentaokazaki/src/sora-gallery
   npm run validate:data
   npm run build
   ```

9. `public/videos.json` をコミットする。

## 更新公開の流れ

1. `sora-player` で公開対象タグ、`meta:no-public`、タグ単位の除外設定を更新する。
2. 同じ manifest を使って export する。
3. 新規または変更された object key のファイルを R2 にアップロードする。
4. `sora-gallery` で `npm run validate:data` と `npm run build` を実行する。
5. `public/videos.json` をコミットする。

既存動画の公開 ID は manifest で維持する。manifest を消すと個別 URL と将来の likes キーが変わるため、公開後は消さない。

## アップロード手段

初期は `rclone` を採用する。

理由:

- 複数ファイルの bulk upload に向いている。
- 大きな動画ファイルで multipart upload を扱える。
- R2 は S3-compatible API を提供しており、`rclone` から扱いやすい。
- `wrangler r2 object put` は単発 object の確認には便利だが、動画本体の一括アップロードには向かない。

`rclone` の初期設定:

1. Cloudflare dashboard の R2 で API token を作成する。
2. 権限は `sora-gallery-media` bucket の Object Read & Write に限定する。
3. Account ID を控える。
4. ローカルで `rclone config` を実行し、remote 名 `r2` を作成する。
5. storage は S3-compatible provider を選ぶ。
6. provider は Cloudflare R2 を選ぶ。
7. Access Key ID と Secret Access Key を入力する。
8. endpoint は `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` を入力する。
9. Object-level 権限の token を使う場合は、設定ファイルに `no_check_bucket = true` を追加する。

token や secret は repo、docs、チャットに記録しない。

設定確認:

```bash
rclone version
rclone listremotes
rclone lsd r2:
rclone ls r2:sora-gallery-media
```

`rclone config file` で設定ファイルの場所を確認できる。設定ファイルには secret が入るため、repo にコピーしない。

アップロード例:

```bash
rclone copy /path/to/generated-upload/videos r2:sora-gallery-media/videos
rclone copy /path/to/generated-upload/thumbnails r2:sora-gallery-media/thumbnails
```

確認例:

```bash
rclone ls r2:sora-gallery-media/videos
rclone ls r2:sora-gallery-media/thumbnails
```

小さな単発ファイルの疎通確認だけなら `wrangler` を使ってもよい。

```bash
npx wrangler r2 object put sora-gallery-media/test-picture/example.png --file ./example.png
```

### 疎通確認結果

2026-05-23 に `rclone copy` で動画 1 件とサムネイル 1 件のアップロードを確認した。

```text
videos/3a21a4b1-66fa-4086-86f9-bbaccfedef3d.mp4
thumbnails/3a21a4b1-66fa-4086-86f9-bbaccfedef3d.webp
```

公開 URL への HEAD リクエストはどちらも 200 OK だった。

```text
https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/videos/3a21a4b1-66fa-4086-86f9-bbaccfedef3d.mp4
https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/thumbnails/3a21a4b1-66fa-4086-86f9-bbaccfedef3d.webp
```

注意: この疎通確認は一時 manifest で生成した公開 ID を使っている。本番 export manifest では維持せず、疎通確認用 object として削除する方針とする。

### 初回アップロード結果

2026-05-23 に `/private/tmp/sora-gallery-upload-prod` から R2 へ初回アップロードした。

```text
videos: 100 files
thumbnails: 100 files
local size: 203M
```

アップロードコマンド:

```bash
rclone copy /private/tmp/sora-gallery-upload-prod/videos r2:sora-gallery-media/videos --progress
rclone copy /private/tmp/sora-gallery-upload-prod/thumbnails r2:sora-gallery-media/thumbnails --progress
```

代表 URL は 200 OK を確認した。

```text
https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/videos/7336a931-c2d1-477b-b9a6-63db1aacd7c2.mp4
https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/thumbnails/7336a931-c2d1-477b-b9a6-63db1aacd7c2.webp
https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/videos/6658c879-a6ab-415d-8c10-3188354b9967.mp4
https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/thumbnails/2ef13128-00a8-46ef-863a-dad3e7f47aef.webp
```

## 独自ドメインへ切り替える場合

`hio1345.com` を取得した場合は、以下の流れで切り替える。

1. `sora-media.hio1345.com` を R2 bucket の custom domain に接続する。
2. 代表 object が `https://sora-media.hio1345.com/videos/{publicId}.mp4` で読めることを確認する。
3. 同じ manifest を使い、`--public-base-url https://sora-media.hio1345.com` で `public/videos.json` を再生成する。
4. `npm run validate:data` と `npm run build` を実行する。
5. `public/videos.json` をコミットする。

## 非公開化・削除

一時的に一覧から外すだけなら、次回 export で `public/videos.json` から除外する。

個別動画を外す場合は、`sora-player` で `meta:no-public` タグを付ける。タグ全体を外す場合は、`data/gallery-export-config.json` の `excludeTags` に追加する。`meta:` prefix は export 制御用として予約し、`public/videos.json` には出力しない。

本当に取り下げる場合は以下も行う。

1. `public/videos.json` から対象動画を除外する。
2. R2 から動画本体とサムネイルを削除する。
3. 必要に応じて Cloudflare cache purge を行う。
4. 個別 URL が 404 または意図した応答になることを確認する。

manifest の対象 entry は、再公開の可能性があるなら残す。完全削除したい場合だけ、別途判断して削除する。

## セキュリティ・プライバシー確認

公開前に確認する。

- `public/videos.json` にローカルパスがない。
- `filename`, `account`, `config.json`, `generations.json`, `data/tags.json` が含まれない。
- URL が `https://...` である。
- localhost や `.local` を指していない。
- R2 object key に元ファイル名、元 ULID、ローカル構造が含まれない。
- 公開してよい prompt / description だけが含まれる。
- 公開してよいタグだけが含まれる。

## 未決定事項

- CORS 設定の要否。
- Cache-Control の具体値。
- cache purge の運用。
- `hio1345.com` を取得するか。
