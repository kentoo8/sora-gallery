# 開発ガイド

## 公開用データを用意する

このアプリは `public/videos.json` にある公開済みの動画・サムネイルを表示する。開発時にもこのファイルが必要である。

既存の運用環境では、用意済みの公開データを受け取る。自分の動画を公開する場合は [動画の公開手順](r2_publish_runbook.md) に沿って準備する。データ形式を試すだけなら、[サンプル](examples/videos.example.json) を `public/videos.json` へコピーできる。ただし、サンプルは形式の例であり、動画の再生は保証しない。

```bash
cp docs/examples/videos.example.json public/videos.json
```

`public/videos.json` は Git 管理しない。実際に公開してよい動画、説明、タグだけを含める。データ形式の詳細は [公開データの要件](sora_gallery_requirements.md#公開データ)、Player からの出力については [export の要件](sora_player_export_requirements.md) を参照する。

## 依存関係を導入して起動する

Node.js はサポート中の版の最新セキュリティ修正版を使う。mise を利用する場合は、リポジトリのフォルダで指定版を導入する。

```bash
mise install
mise exec -- npm ci
cp wrangler.toml.example wrangler.toml
mise exec -- npm run dev
```

mise を使わない場合は、自分で Node.js の版を確認し、以降のコマンドの `mise exec --` を省略する。

`wrangler.toml` は Git 管理しない。likes API を確認・公開する場合は、利用する環境の D1 database ID を設定する。プレビュー用と本番用の D1 は分ける。設定と疎通確認は [likes API の確認手順](likes_api_smoke_test.md) を参照する。`npm run dev` は画面開発用で、Pages Functions の動作確認とは区別する。

## 変更を確認する

```bash
mise exec -- npm run validate:data
mise exec -- npm test
mise exec -- npm run lint
mise exec -- npm run build
```

ビルドは公開データの検証、型チェック、画面の生成、個別動画の共有用ページ生成を行い、結果を `dist/` に出力する。開発サーバーだけでは共有用ページを生成しない。共有表示の確認は [共有プレビュー](share_previews.md) を参照する。

ブラウザでは、一覧・検索・タグ絞り込み・再生と音声を確認する。UIを変更した場合は、キーボード操作、フォーカス表示、項目のラベル、文字の読みやすさ、狭い画面や拡大時の表示も確認する。

本番反映の手順は [運用ガイド](operations.md) を参照する。
