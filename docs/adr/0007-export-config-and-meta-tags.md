# ADR 0007: export 設定と meta タグで公開対象を制御する

## Status

Accepted

## Context

`sora-gallery` は公開済み JSON を読むだけの静的サイトであり、管理画面や公開状態フィールドを持たない。

一方で、公開前に動画を見ながら個別動画を非公開にしたり、特定タグの動画をまとめて公開対象から外したりする運用が必要になった。

## Decision

公開対象の選別は `sora-player` 側の export 設定で行う。

- 実設定は `sora-player/data/gallery-export-config.json` に置き、Git 管理しない。
- コミットするのは `data/gallery-export-config.example.json` のような例だけにする。
- `includeTags` のいずれかが付いた動画だけを公開候補にする。
- `excludeTags` のいずれかが付いた動画は公開候補であっても除外する。
- `meta:public` は個別動画を公開候補に入れるためのローカル制御タグとする。
- `meta:no-public` は個別動画を公開対象から外すためのローカル制御タグとする。
- `meta:public` と `meta:no-public` が同じ動画に付いている場合は、意図が矛盾しているため export を失敗させる。
- 通常タグによる include / exclude の競合は矛盾とは扱わず、exclude を優先する。
- `meta:` は予約 prefix とし、公開タグとしては出力しない。
- 公開候補に許可されていない `meta:*` タグが付いている場合、export は失敗させる。

## Consequences

- `sora-gallery` に `visibility`, `private`, `deletedAt` を追加せずに非公開化を運用できる。
- タグ単位の除外を CLI 引数の羅列ではなく設定ファイルで管理できる。
- `meta:*` の誤公開を防げる。
- 公開対象から外した動画は R2 からも削除するため、再公開時は manifest で維持された同じ公開 ID の object を再アップロードする。
- 設定ファイルの実体はローカル個人データなので、紛失すると次回 export の選別条件が再現しにくくなる。
