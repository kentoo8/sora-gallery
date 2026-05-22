# CONTEXT.md

## 認証・権限エラーの記録

### npm install のネットワーク制限

- 発生日: 2026-05-22
- コマンド: `npm install`
- エラー概要: sandbox 内の通常実行では `registry.npmjs.org` の名前解決に失敗し、`ENOTFOUND` になった。
- 次回避けること: 同じ通常実行を繰り返して待ち続けない。
- 次回の推奨手順: `npm install` が DNS / network 系エラーで失敗したら、`require_escalated` でネットワーク許可付き再実行を依頼する。
- 秘密情報: なし。トークン、Cookie、認証コード、秘密鍵は記録しない。
