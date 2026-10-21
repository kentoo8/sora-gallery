# Cloudflare Pages デプロイ手順

## 方針

`sora-gallery` は Vite で生成した `dist/` を Cloudflare Pages に静的デプロイする。

Cloudflare dashboard の Workers & Pages 画面にある `Upload your static files` / `Worker name` フローは使わない。UI 上は静的ファイルをアップロードしているように見えても、Worker 作成フローと混ざって分かりにくく、名前衝突やアップロード待ちで止まりやすいため。

初期公開では `wrangler pages deploy` を使う。

## デプロイ

production に反映する場合は、[公開前チェックリスト](pre_publish_checklist.md) を確認する。公開する `public/videos.json` は Git 管理外のため、コミットだけでなく内容も確認する。

```bash
cd ~/src/sora-gallery
git status --short
git log --oneline -1
npm run validate:remote
npm run build
npx wrangler pages deploy dist --project-name sora-gallery --branch main
```

preview 環境として確認する場合:

```bash
cd ~/src/sora-gallery
npm run build
npx wrangler pages deploy dist --project-name sora-gallery --branch preview-d1-smoke
```

mise を使う場合は `npm` / `npx` の前に `mise exec --` を付ける。account ID の指定が必要な場合は、ローカル環境変数 `CLOUDFLARE_ACCOUNT_ID` を使う。認証情報はリポジトリに記録しない。

停止中に通常の `dist/` をデプロイすると再公開される。[緊急停止方針](emergency-shutdown.md) に従い、再公開の許可を先に確認する。自動反映できるセキュリティ更新の範囲は [更新方針](security-update-preparation.md) を参照する。

重要:

- `npx wrangler deploy` ではない。
- `npx wrangler pages deploy dist --project-name sora-gallery` を使う。
- `dist` は build 済みの静的公開物である。
- 初回に project 作成を聞かれたら作成する。
- production branch を聞かれたら `main` を指定する。
- preview D1 の確認では、production branch である `main` ではなく、`--branch preview-d1-smoke` のような非 production branch 名で deploy する。
- `wrangler pages deploy dist --project-name sora-gallery` は production deployment として扱われるため、preview D1 の疎通確認には使わない。

## 公開後確認

```text
/
/videos.json
/video/{id}
```

`{id}` は今回公開する `public/videos.json` の動画 ID に置き換える。

確認すること:

- 一覧が表示される。
- `videos.json` の内容と件数が、今回公開したデータと一致する。
- 個別動画 URL が 404 にならない。
- R2 の動画が再生できる。
- `npm run validate:remote` が通っている。
- ミュート解除で音が出る。
- 検索できる。
- タグ絞り込みできる。
- likes API の実環境疎通確認は `docs/likes_api_smoke_test.md` に従う。

## 使わない導線

以下の導線は初期公開では使わない。

- Cloudflare dashboard の `Upload your static files`。
- `Worker name` を入力して static assets をアップロードする画面。
- `npx wrangler deploy`。

理由:

- Workers と Pages の UI が統合されていて、静的サイトの意図と違う Worker 作成フローに入りやすい。
- `Worker name` の衝突やアップロード待ちで止まりやすい。
- `wrangler pages deploy dist` の方が、`dist/` を Pages として公開していることが明確。
