# 公開前チェックリスト

## 公開対象の確認

- 公開タグと件数: 今回の公開対象を確認する。初回公開時の対象はタグ `高木ゆい`、99 件だったが、以降の固定条件にはしない。
- 動画保存先: Cloudflare R2 `sora-gallery-media`
- 公開 base URL: `https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev`
- 独自ドメイン: 初期公開では使わない

## 公開前に必ず確認すること

### データ

- `public/videos.json` の内容と件数が、今回の公開対象と一致する。
- `public/videos.json` が `npm run validate:data` を通る。
- `public/videos.json` が `npm run validate:remote` を通る。
- `filename`, `account`, ローカルパス、`config.json`, `generations.json`, `data/tags.json` が含まれない。
- `videoUrl` と `thumbnailUrl` がすべて `https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/...` で始まる。
- `prompt` は空文字を許容する。空 prompt はエラーではない。

### R2

- 公開対象の各動画に対応する動画本体とサムネイルがある。
- 代表動画 URL が 200 OK を返す。
- 代表サムネイル URL が 200 OK を返す。
- 疎通確認用 object は削除済みである。
- 公開対象から外した動画の R2 object は削除済みである。

### ローカル表示

- 一覧画面が表示される。
- サムネイルが表示される。
- 動画詳細へ遷移できる。
- 動画が再生できる。
- 左ツールバーのミュート切替で音が出る。
- `M` キーでもミュート切替できる。
- `/` で検索欄にフォーカスできる。
- タグチップで絞り込みできる。
- `Esc` で再生画面から一覧へ戻れる。

### build

```bash
npm run validate:data
npm test
npm run build
```

すべて成功すること。

### likes API

- production の D1 binding `DB` が設定済みである。
- production の D1 に `schema.sql` が適用済みである。
- `docs/likes_api_smoke_test.md` に従って実環境疎通確認を行う。
- preview URL で likes を確認する場合は、本番 D1 ではなく preview 専用 D1 を使う。
- preview D1 の確認では `--branch preview-d1-smoke` のような非 production branch 名で deploy する。
- abuse が見えた場合は `docs/likes_rate_limiting_policy.md` に従い、Cloudflare WAF Rate Limiting Rules で `POST /api/likes` を制限する。

## Cloudflare Pages 公開時の注意

- Build command: `npm run build`
- Build output directory: `dist`
- Pages Functions は likes API のために使う。
- Pages Functions / D1 以外の動的機能や管理 API は入れない。
- Cloudflare dashboard の Workers & Pages 画面にある `Upload your static files` / `Worker name` フローは使わない。
- 公開は `wrangler pages deploy dist --project-name sora-gallery` を正とする。
- 通常作業の push と、自動反映を許可された更新は区別する。例外の範囲は [セキュリティ更新方針](security-update-preparation.md) に従う。
- Cloudflare Pages の公開後、以下を確認する。
  - `/` が表示できる。
  - `/videos.json` の内容と件数が、今回公開したデータと一致する。
  - `/video/7336a931-c2d1-477b-b9a6-63db1aacd7c2` のような個別 URL が表示できる。
  - 代表動画が再生できる。
  - 音声が出る。

## 初回公開前の未確認事項（当時の記録）

以下は初回公開前の記録であり、現在の未確認事項を表すものではない。以後の確認結果は [セキュリティ保守記録](security-maintenance.md) などの実施記録を参照し、今回の公開でも上記のチェックを行う。

- Cloudflare Pages 上での実表示。
- Cloudflare Pages 上での SPA fallback。
- モバイル実機での縦スワイプ。
- Pages 公開後のキャッシュ挙動。
- likes API の実環境疎通。
