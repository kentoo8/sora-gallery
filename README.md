# sora-gallery

選別済みの Sora 生成動画を Web 公開するためのギャラリーです。

公開用データを `public/videos.json` として用意し、Cloudflare Pages 上で静的ギャラリーとして表示します。動画一覧、検索、タグ絞り込み、再生画面は `public/videos.json` を正としてクライアント側で処理し、例外として likes のみ Pages Functions + D1 を使います。

[`sora-player`](https://github.com/kentoo8/sora-player) は、ローカルで動画を管理・選別し、このギャラリー向けの `public/videos.json` を export するための一手段です。`sora-player` を使わない場合でも、同じ schema の `public/videos.json` と公開済みの動画・サムネイル URL を用意すれば利用できます。

## 動画の再生と音声

再生画面の動画部分をクリック／タップすると、一時停止・再生を切り替えられます。スマホでは縦スワイプで前後の動画へ移動できます。

動画は音ありで再生を試みます。ブラウザの制限で音なし再生になった場合は「音を出す」を押してください。音の設定はページを開いている間、次の動画にも引き継がれます。再生ボタンが表示された場合は、押すと再生を試みます。

## 検索結果の共有

タグを選択したり検索語を入力したりすると、ブラウザのURLに条件が反映されます。そのURLをコピーして共有すると、同じ条件で絞り込んだ一覧を開けます。動画を開いた場合も絞り込み条件は保持されます。

個別動画のURLをDiscordなどに貼ると、対応サービスでサムネイルと説明文をプレビューできます。サービス内での動画再生に対応するかは共有先によって異なります。表示されない場合はURLを開いて再生してください。公開後の確認方法は [共有プレビュー](docs/share_previews.md) を参照してください。

## 開発

Node.js はサポート中のバージョンの最新セキュリティ修正版を使用してください。

mise を使う場合は、プロジェクトのフォルダで次を実行すると、指定版の Node.js で開発できます。

```bash
mise install
mise exec -- npm ci
mise exec -- npm run dev
```

mise を使わない場合:

```bash
npm ci
cp wrangler.toml.example wrangler.toml
npm run dev
```

`wrangler.toml` の D1 database ID は、自分の Cloudflare 環境の値に置き換えてください。Pages deploy で account ID の指定が必要な場合は、`CLOUDFLARE_ACCOUNT_ID` 環境変数を使ってください。

## ビルド

```bash
npm run build
```

Cloudflare Pages のビルド出力先は `dist/` です。

## 本番反映

本番反映はローカルのターミナルから実行します。`public/videos.json` は Git 管理外の公開用生成物ですが、ローカルに存在する内容が build に含まれます。

```bash
cd ~/src/sora-gallery
git status --short
git log --oneline -1
npm run build
npx wrangler pages deploy dist --project-name sora-gallery
```

詳細な手順と公開後確認は `docs/cloudflare_pages_deploy.md` を参照してください。
一時停止・再公開の記録と公開前の確認は [セキュリティ保守](docs/security-maintenance.md) を参照してください。
重大な脆弱性を検知した場合は、通常の本番反映とは別に [承認済みの緊急停止方針](docs/emergency-shutdown.md) に従って公開を止めます。復旧時の再公開はユーザーの判断を待ちます。
修正版を検知した場合は、[別の作業場所に更新案を準備](docs/security-update-preparation.md) し、検証結果と反映手順を報告します。

## 公開データ

公開動画は `public/videos.json` で定義します。

`public/videos.json` は意図的に Git 管理しません。`sora-player` などで作成した公開用生成物として扱ってください。

完全な例は `docs/examples/videos.example.json` を参照してください。関連する運用ドキュメントは以下です。

- `docs/sora_player_export_requirements.md`: `sora-player` を使って export する場合の境界。
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
