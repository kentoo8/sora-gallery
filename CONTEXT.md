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
