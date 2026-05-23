# ADR 0001: sora-gallery は静的公開ギャラリーを基本にする

## Status

Accepted

## Context

`sora-player` はローカル動画の管理・閲覧に便利だが、Express server、Next API、`fs`、`config.json`、Finder 連携、ローカルタグ編集など、Web 公開サイトに持ち込むべきではない機能を含む。

`sora-gallery` は公開用の読み取り専用サイトとして分離する必要がある。

## Decision

初期リリースの `sora-gallery` は Vite + React + TypeScript の静的公開ギャラリーを基本とする。

- Cloudflare Pages に静的デプロイする。
- `public/videos.json` を正とする。
- 一覧、検索、タグ絞り込み、再生画面はクライアント側で処理する。
- 認証、管理画面、ローカル管理用 API は入れない。
- 例外として、likes のみ Pages Functions + D1 で扱う。

## Consequences

- `sora-player` のローカル管理機能を明確に排除できる。
- Cloudflare Pages で単純に公開できる。
- 動画一覧、検索、タグ絞り込みはクライアント側で処理する。
- 動的機能の範囲は likes に限定される。
