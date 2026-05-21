# ADR 0003: 公開 ID と createdAt を分離する

## Status

Accepted

## Context

元ファイル名の多くは ULID を含む。`sora-player` では、その ULID から生成時刻を推定している。

一方で、元ファイル名や元 ULID を公開 URL の ID として使うと、ローカル管理情報や元データ由来の識別子を公開してしまう可能性がある。

## Decision

公開用 `id` は元ファイル名を使わず、export 時に別生成した ULID または UUID とする。

`createdAt` は export 時に元ファイル名 ULID から算出してよい。

公開する `public/videos.json` には元ファイル名や元 ULID を含めない。

## Consequences

- 個別動画 URL、将来の likes、将来 DB のキーとして安定した公開 ID を使える。
- 元ファイル名由来の情報を公開しない。
- `createdAt` ソートは維持できる。
- export 側では、元ファイルと公開 ID の対応を非公開に管理する必要がある。
