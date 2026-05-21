# ADR 0001: sora-gallery は完全静的な公開ギャラリーにする

## Status

Accepted

## Context

`sora-player` はローカル動画の管理・閲覧に便利だが、Express server、Next API、`fs`、`config.json`、Finder 連携、ローカルタグ編集など、Web 公開サイトに持ち込むべきではない機能を含む。

`sora-gallery` は公開用の読み取り専用サイトとして分離する必要がある。

## Decision

初期リリースの `sora-gallery` は Vite + React + TypeScript の完全静的サイトとする。

- Cloudflare Pages に静的デプロイする。
- 初期リリースでは Pages Functions / Workers を使わない。
- `public/videos.json` を正とする。
- DB、認証、書き込み API、管理画面、いいね機能は入れない。

## Consequences

- `sora-player` のローカル管理機能を明確に排除できる。
- Cloudflare Pages で単純に公開できる。
- 動画一覧、検索、タグ絞り込みはクライアント側で処理する。
- 動的機能は将来 Workers + DB で追加する。
