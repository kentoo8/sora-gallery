# ADR 0006: sora-player が sora-gallery 用データを export する

## Status

Accepted

## Context

`sora-gallery` は公開用の静的サイトであり、ローカルファイルシステム、ローカルタグ編集、`generations.json`、`data/tags.json`、Finder 連携を持ち込まない方針である。

一方で、公開対象の選別、元ファイル ULID からの `createdAt` 算出、公開用 ID の維持、R2 オブジェクト名の決定は、ローカル管理情報を知っている `sora-player` 側で行う必要がある。

## Decision

`sora-player` が `sora-gallery` 用の `public/videos.json` を export する。

`sora-gallery` は export 済み JSON を読み取り、検証し、静的サイトとして表示するだけにする。

公開用 `id` は export 時に別生成し、元ファイル名や元 ULID は公開しない。

`createdAt` は export 時に元ファイル名 ULID や `task_id` から算出してよい。

公開用 ID とローカル動画の対応表は `sora-player` 側で非公開に管理する。

## Consequences

- `sora-gallery` の責務を読み取り専用表示に保てる。
- ローカル情報を公開サイトへ持ち込むリスクを下げられる。
- 公開用 ID を安定させ、将来の likes / DB / 個別 URL のキーとして使える。
- `sora-player` 側に export script と非公開 manifest の設計が必要になる。
