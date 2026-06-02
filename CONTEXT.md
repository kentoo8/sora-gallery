# CONTEXT.md

## 認証・権限エラーの記録

### wrangler Pages deploy の account ID 自動取得失敗

- 発生日: 2026-06-02
- コマンド: `npx wrangler pages deploy dist --project-name sora-gallery`
- エラー概要: Cloudflare API が authentication error code `10000` を返し、ログイン中ユーザーの account ID 自動取得にも失敗した。
- 次回避けること: account ID を省略したまま同じ Pages deploy を繰り返さない。
- 次回の推奨手順: ローカル環境変数 `CLOUDFLARE_ACCOUNT_ID` に account ID を設定する。Pages project 用 `wrangler.toml` は `account_id` をサポートしないため記載しない。code `10000` が続く場合は、API token に対象 Pages project の編集権限があるか確認する。
- 秘密情報: なし。account ID、token、ログファイルの内容は記録しない。

### npm install のネットワーク制限

- 発生日: 2026-05-22
- コマンド: `npm install`
- エラー概要: sandbox 内の通常実行では `registry.npmjs.org` の名前解決に失敗し、`ENOTFOUND` になった。
- 次回避けること: 同じ通常実行を繰り返して待ち続けない。
- 次回の推奨手順: `npm install` が DNS / network 系エラーで失敗したら、`require_escalated` でネットワーク許可付き再実行を依頼する。
- 秘密情報: なし。トークン、Cookie、認証コード、秘密鍵は記録しない。

### sora-player build の Google Fonts 取得失敗

- 発生日: 2026-05-22
- コマンド: `/Users/kentaokazaki/src/sora-player` で `npm run build`
- エラー概要: `next/font` が `https://fonts.googleapis.com` から `Geist` / `Geist Mono` を取得できず、Turbopack build が失敗した。
- 次回避けること: 同じ通常実行を繰り返して待ち続けない。
- 次回の推奨手順: build 確認が必要な場合は、ネットワーク許可付き再実行を依頼するか、フォント取得に依存しない構成へ変更する。
- 秘密情報: なし。トークン、Cookie、認証コード、秘密鍵は記録しない。

### wrangler による R2 bucket 作成の認証不足

- 発生日: 2026-05-23
- コマンド: `npx wrangler r2 bucket create sora-gallery-media`
- エラー概要: sandbox 内の通常実行では `registry.npmjs.org` の名前解決に失敗した。ネットワーク許可付き再実行では `wrangler` は起動したが、非対話環境では `CLOUDFLARE_API_TOKEN` が必要として失敗した。
- 次回避けること: API token なしで同じ `wrangler` コマンドを繰り返さない。
- 次回の推奨手順: ユーザーが Cloudflare dashboard で bucket を作成するか、R2 bucket 作成権限を持つ最小権限 API token をローカル環境変数 `CLOUDFLARE_API_TOKEN` に設定してから再実行する。
- 秘密情報: なし。トークン、Cookie、認証コード、秘密鍵は記録しない。

### sandbox 内 rclone ls の R2 endpoint 名前解決失敗

- 発生日: 2026-05-23
- コマンド: `rclone ls r2:sora-gallery-media/videos` および `rclone ls r2:sora-gallery-media/thumbnails`
- エラー概要: sandbox 内では R2 S3 endpoint の名前解決に失敗し、`no such host` になった。一方で、ネットワーク許可付き `rclone copy` は成功し、公開 `r2.dev` URL への `curl -I` も 200 OK だった。
- 次回避けること: sandbox 内通常実行の `rclone ls` だけを根拠にアップロード失敗と判断しない。
- 次回の推奨手順: R2 S3 API への確認が必要な `rclone` コマンドはネットワーク許可付きで実行する。公開可否は `https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev/...` への HEAD/GET でも確認する。
- 秘密情報: なし。トークン、Cookie、認証コード、秘密鍵は記録しない。

### sora-player manifest 生成の writable root 外書き込み失敗

- 発生日: 2026-05-23
- コマンド: `/Users/kentaokazaki/src/sora-player` で `npm run prepare:gallery-upload -- --public-base-url https://pub-35c5e9c8db484d13a29dd79cfefc0741.r2.dev --include-tag 高木ゆい --out /private/tmp/sora-gallery-upload`
- エラー概要: `sora-gallery` から作業している Codex sandbox では `/Users/kentaokazaki/src/sora-player` が writable root 外であり、`data/gallery-export-manifest.json` への書き込みが `EPERM` で失敗した。
- 次回避けること: `sora-player` 側に manifest などを書き込むコマンドを通常実行して失敗させない。
- 次回の推奨手順: `sora-player` 側にファイルを書き込むコマンドは最初から権限付きで実行する。読み取りや `git status` は通常実行でよい。
- 秘密情報: なし。トークン、Cookie、認証コード、秘密鍵は記録しない。

### dev server の port bind 権限失敗

- 発生日: 2026-05-23
- コマンド: `npm run dev -- --host 127.0.0.1`
- エラー概要: sandbox 内の通常実行では `listen EPERM: operation not permitted 127.0.0.1:5173` で Vite dev server が起動できなかった。
- 次回避けること: ローカルサーバー起動コマンドを通常実行して port bind で失敗させない。
- 次回の推奨手順: `npm run dev`、`npm run preview` など port bind を伴うコマンドは最初から権限付きで実行する。
- 秘密情報: なし。トークン、Cookie、認証コード、秘密鍵は記録しない。

### sora-player 型チェックの tsbuildinfo 書き込み失敗

- 発生日: 2026-05-23
- コマンド: `/Users/kentaokazaki/src/sora-player` で `npx tsc --noEmit`
- エラー概要: `sora-gallery` から作業している Codex sandbox では `/Users/kentaokazaki/src/sora-player` が writable root 外であり、`tsconfig.tsbuildinfo` への書き込みが `EPERM` で失敗した。
- 次回避けること: `sora-player` 側で `tsconfig.tsbuildinfo` を更新する可能性がある検証コマンドを通常実行して失敗させない。
- 次回の推奨手順: `npx tsc --noEmit` などの検証コマンドは、`sora-player` が writable root 外の場合は最初から権限付きで実行する。
- 秘密情報: なし。トークン、Cookie、認証コード、秘密鍵は記録しない。

### rclone copyto の bucket 作成確認による R2 403

- 発生日: 2026-05-23
- コマンド: `rclone copyto /private/tmp/.../948d5b80-c9a6-4827-8b94-0427507606c3.mp4 r2:sora-gallery-media/videos/948d5b80-c9a6-4827-8b94-0427507606c3.mp4`
- エラー概要: bucket 限定の R2 token では bucket 作成や存在確認に必要な権限がなく、`S3: CreateBucket` が `AccessDenied` になった。
- 次回避けること: R2 bucket 限定 token で `copyto` をそのまま実行し、bucket 作成確認を発生させない。
- 次回の推奨手順: 単一 object を R2 にアップロードする場合は `--s3-no-check-bucket` を付けるか、既に成功している `rclone copy <dir> r2:sora-gallery-media/<prefix>` 形式を使う。
- 秘密情報: なし。トークン、Cookie、認証コード、秘密鍵は記録しない。
