# ADR 0005: likes は初期リリース後に Workers + DB で検討する

## Status

Accepted

## Context

いいね機能は公開ギャラリーとして早めに検討したいが、初期リリースの範囲には含めない。

匿名ローカル保存だけの likes は全体集計としての価値が弱く、後で DB 版に移行すると仕様がぶれやすい。

## Decision

初期リリースでは likes を入れない。

公開直後の優先検討事項として、Cloudflare Workers + DB による最小 API を検討する。

初期 UI には likes のダミー表示や余白を置かない。

## Consequences

- 初期リリースを静的サイトとして単純に保てる。
- likes 実装時は `GalleryVideo.id` を安定キーとして使える。
- Workers はまず likes 用の最小 API から導入する。
