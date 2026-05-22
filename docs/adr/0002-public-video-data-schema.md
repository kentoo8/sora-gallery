# ADR 0002: public/videos.json を公開データの正とする

## Status

Accepted

## Context

公開サイトでは、ローカルファイルシステム、`generations.json`、`data/tags.json`、元ファイル名、ディレクトリ構造を直接参照しない。

公開対象として選別済みのデータだけを読み取る契約が必要である。

## Decision

`public/videos.json` の動画要素は以下を正とする。

```ts
type GalleryVideo = {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  prompt: string;
  tags: string[];
  createdAt?: string;
  description?: string;
};
```

`id`, `videoUrl`, `thumbnailUrl`, `prompt`, `tags` は必須とする。

`prompt` は文字列であれば空文字を許容する。

`videoUrl` と `thumbnailUrl` は `https://...` の絶対公開 URL のみ許可する。

## Consequences

- 公開サイトはローカル環境に依存しない。
- 検索対象は `prompt`, `description`, `tags` に限定できる。
- `description` は後から自由に入れられる公開コメント欄として扱える。
- 非公開化や削除は `public/videos.json` から除外する運用になる。
