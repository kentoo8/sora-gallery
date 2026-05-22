# CONTEXT.md

## 認証・権限エラーの記録

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
