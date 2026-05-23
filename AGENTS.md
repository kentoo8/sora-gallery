# AGENTS.md

## 必ず読む文書

作業前に以下を読むこと。

- `CONTEXT.md`
- `docs/sora_gallery_requirements.md`
- `docs/sora_player_export_requirements.md`
- `docs/adr/`
- `docs/skills/grill-me/SKILL.md`

## 作業ルール

- 実装前に要件を確認する。
- UIは既存の `sora-player` を基準にする。
- `sora-gallery` は完全新規UIではなく、`sora-player` のガワ・雰囲気・操作感をWeb公開用に削ぎ落として再構成する。
- ただし、ローカルファイルシステム、Finder連携、`config.json`、`server.js`、ローカルタグ編集、`data/tags.json` の直接利用は持ち込まない。
- 公開用データは `public/videos.json` を正とする。
- 認証、管理画面、ローカル管理用の書き込みAPIは入れない。
- 例外として、公開ユーザー向けの likes API は Pages Functions + D1 で扱う。
- 変更後、ユーザーの確認を待たずにコミットしてよい。
- コミット直後に訂正があった場合は、必要に応じて `git commit --amend` で対応する。
- 作業完了時は、実施内容・確認結果・コミットIDに加えて、次にやるべき候補を簡潔に示す。
- 次にやるべき候補は、優先度が高いものを1-3個に絞る。
- 不確実なものは「未確認」と明記する。
- push は決してしない。

## 隣接リポジトリ操作

- `/Users/kentaokazaki/src/sora-gallery` から作業している場合、`/Users/kentaokazaki/src/sora-player` は writable root 外である。
- `sora-player` 側にファイルを書き込むコマンド、または `sora-player/data/gallery-export-manifest.json` のような非公開 manifest を生成・更新するコマンドは、最初から権限付きで実行する。
- 例: `npm run prepare:gallery-upload` を `/Users/kentaokazaki/src/sora-player` で実行して manifest を作る場合、通常実行で失敗させてから再実行しない。
- ただし、単なる読み取りや `git status` などの確認コマンドは通常実行でよい。

## ローカルサーバー起動

- Codex sandbox では `127.0.0.1:5173` などへの port bind が `listen EPERM` で失敗することがある。
- `npm run dev`、`npm run preview` などローカルサーバーを起動するコマンドは、最初から権限付きで実行する。
- 通常実行で port bind を失敗させてから再実行しない。

## 認証・権限エラー時の運用

- 認証、権限、ネットワーク許可、CLIログイン状態で失敗した場合は、同じ方法を無批判に繰り返さない。
- 失敗したコマンド、エラー概要、次回避けるべき行動、推奨する次の確認手順を `CONTEXT.md` または該当ドキュメントに記録する。
- トークン、Cookie、認証コード、秘密鍵、個人情報は記録しない。
- 認証や外部サービス権限が必要な操作は、ユーザーに必要なログイン・権限付与・接続確認を依頼してから再試行する。
- push は決してしない。
