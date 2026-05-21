# AGENTS.md

## 必ず読む文書

作業前に以下を読むこと。

- `CONTEXT.md`
- `docs/sora_gallery_requirements.md`
- `docs/adr/`
- `docs/skills/grill-me/SKILL.md`

## 作業ルール

- 実装前に要件を確認する。
- UIは既存の `sora-player` を基準にする。
- `sora-gallery` は完全新規UIではなく、`sora-player` のガワ・雰囲気・操作感をWeb公開用に削ぎ落として再構成する。
- ただし、ローカルファイルシステム、Finder連携、`config.json`、`server.js`、ローカルタグ編集、`data/tags.json` の直接利用は持ち込まない。
- 公開用データは `public/videos.json` を正とする。
- DB、認証、書き込みAPIは初期リリースでは入れない。
- 変更後、ユーザーの確認を待たずにコミットしてよい。
- コミット直後に訂正があった場合は、必要に応じて `git commit --amend` で対応する。
- push は決してしない。
