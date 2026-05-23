# ADR 0005: likes は Pages Functions + D1 で最小実装する

## Status

Accepted

## Context

いいね機能は公開ギャラリーとして早めに検討したい機能だった。

匿名ローカル保存だけの likes は全体集計としての価値が弱く、後で DB 版に移行すると仕様がぶれやすい。

初期方針では初期リリース範囲外としていたが、公開体験として必要性が高いため、動画本体データや管理機能とは分離した最小機能として初期から含める。

## Decision

likes は Cloudflare Pages Functions + D1 で最小実装する。

- API は `GET /api/likes` と `POST /api/likes` のみにする。
- `video_id` は `public/videos.json` の `id` と一致する公開動画 ID のみ受け付ける。
- D1 は likes 集計専用とし、動画本体データは引き続き `public/videos.json` を正とする。
- 認証、管理画面、ランキング、ユーザー単位の厳密な投票制御は入れない。
- LocalStorage と簡易レート制限は一般ユーザーの誤操作・軽い連打を抑える暫定対策として扱う。

一覧カードには likes UI を出さず、再生画面にのみ表示する。

## Consequences

- 公開直後から軽い反応機能を提供できる。
- 完全静的サイトではなくなるが、動的範囲を likes に限定できる。
- `GalleryVideo.id` を安定キーとして使える。
- `public/videos.json` から外れた動画には likes を追加しない。
- preview / production で D1 を分ける必要がある。
