# sora-gallery 要件定義

## 概要

`sora-gallery` は、選別済みの Sora 生成動画を Web 公開するための静的ギャラリーサイトである。

既存の `sora-player` はローカル管理・選別用アプリとして扱い、`sora-gallery` は公開用の読み取り専用サイトとして分離する。

## 初期リリースの前提

- Vite + React + TypeScript で実装する。
- Cloudflare Pages にデプロイする。
- 一覧、検索、再生、タグ絞り込みは静的 `public/videos.json` を正としてクライアント側で処理する。
- 例外として、いいね機能のみ Cloudflare Pages Functions + D1 を使う。
- 公開用データは `public/videos.json` を正とする。
- 動画とサムネイルは R2 などに置いた `https://...` の絶対公開 URL のみを使う。
- DB は likes の集計用 D1 のみに限定する。
- 書き込み API は `POST /api/likes` のみに限定する。
- 認証、管理画面、ローカル管理用 API は初期リリースでは入れない。

## UI 方針

`sora-gallery` は完全新規 UI ではなく、既存の `sora-player` のガワ・雰囲気・操作感を Web 公開用に削ぎ落として再構成する。

初期画面は一覧画面とする。一覧画面は `sora-player` の全画面オーバーレイ風ギャラリーを基準にする。

流用するもの:

- 黒背景、動画中心、薄いグラス UI、密度感。
- 縦長動画カード。
- 2-6 列程度のレスポンシブグリッド。
- 一覧上部のタイトル、件数、ソート UI。
- 下部検索バー。
- タグチップ。
- 再生画面の動画表示、prompt 表示、操作感。
- Tailwind CSS ベースのスタイル方針。
- 再生画面の左上に統合されたポータルヘッダー（Sora風マスコットアイコン ＋ 検索バー）。

持ち込まないもの:

- Express `server.js`。
- `config.json`。
- ローカル `videos/` ディレクトリ参照。
- `fs` / `path` など Node.js のファイルシステム処理。
- Finder / Explorer / `xdg-open` 連携。
- ローカルタグ編集。
- 動画カードの選択チェック UI。
- 一括選択操作。
- `data/tags.json` の直接利用。
- 任意ローカルパス指定。
- `generations.json` / `account.json` の生データ利用。
- サムネイルの Canvas 生成とサーバー保存。
- 動画データ用 DB。
- 認証。
- likes 以外の書き込み API。

## 一覧画面

- 初期表示は一覧画面とする。
- カードには `thumbnail` と `prompt` のみを表示する。
- カードには `filename`, `account`, `createdAt`, `tags` は表示しない。
- カードクリックで個別動画の再生画面へ遷移する。
- 一覧上部に公開タグの絞り込みチップを表示する。
- `未分類` フィルタを表示する。
  - `未分類` は「公開済みだがタグなし」の動画を探すための公開カテゴリとして扱う。
  - `未分類` は非公開候補や管理状態を意味しない。
- ソートは `createdAt` 順を基準にする。
  - `createdAt` が欠損している動画は最後に回す。
  - `createdAt` 欠損同士は `id` 順に並べる。
  - 新しい順 / 古い順の切り替えを提供する。

## 動画カード

- 必須表示はサムネイル画像と prompt のみ。
- サムネイルは `thumbnailUrl` を使う。
- `thumbnailUrl` は必須項目とする。
- サムネイル欠損または読み込み失敗時は、その動画を一覧、タグ件数、再生移動対象から除外する。
- 再生画面で動画本体の読み込みに失敗した場合も、その動画を再生移動対象から除外する。
- 動画からクライアント側でサムネイルを生成しない。
- カード上にタグ編集、選択、Finder 連携、ファイル名表示を出さない。

## 再生画面

- prompt を全文公開する。
- `description` がある場合は、公開コメントとして表示できる。
- prompt コピー機能はデスクトップ限定で残す。
- prompt 内の `@...` 表記をクリックすると、その文字列で検索した一覧を開く。
- 公開タグを prompt 付近に表示し、クリックでタグ絞り込み一覧を開く。
- 動画はループ再生を基本とする。
- ミュート、フルスクリーン、再生/一時停止、シャッフルモードを提供する。
- PC 版のシャッフルボタンはオン/オフのトグルとする。
- シャッフルモードがオンの間は、次へ進む操作、戻る操作、動画終了時の自動再生による移動先をランダムにする。
- 個別動画 URL を初期リリースから提供する。
- 再生画面の左上に、検索バー（Search）およびSoraパロディマスコットアイコン（雲とうるうるした目のSVG）を統合したポータルヘッダーを配置する。これにより、全画面で動画を見ている状態を基本としつつ、その場で別の動画を検索・シームレスに切り替えられる「トップ画面」としての役割を持たせる。
- 左上の「ロゴ＆検索バー」と、その直下に並ぶ操作パネル（戻る/進む/消音/シャッフル等のボタン群）との縦方向の距離を少し離し、窮屈さのない洗練された空間レイアウトにする。

## 検索 UI

- 検索対象は `prompt`, `description`, `tags` とする。
- 検索は空白区切り AND 検索とする。
- `/` キーで検索欄にフォーカスする。
- 日本語 IME 対応は必須とする。
  - composition 中に Enter 確定や検索確定が走らないようにする。
- 検索結果から動画を開いた場合、検索結果内で前後移動できることを目指す。

## キーボード操作

初期リリースで残す操作:

- `/`: 一覧で検索欄にフォーカス。
- `Esc`: 検索解除、または再生画面から一覧へ戻る。
- `↑` / `↓`: 再生画面で前後動画。
- `←` / `→`: 閲覧履歴、または一覧/再生の戻る/進む。
- `Space`: 再生/一時停止。
- `M`: ミュート。
- `F`: フルスクリーン。
- `R`: シャッフルモードのオン/オフ。
- `?`: ショートカット表示。

初期リリースでは入れない操作:

- 番号ジャンプ。
- `Shift + ↑↓` の 10 件スキップ。
- `Command + ↑↓` の 100 件スキップ。
- `Shift + Command + ↑↓` の先頭/末尾ジャンプ。

## スマホ操作

- 再生画面の縦スワイプで前後動画に移動する。
- 横スワイプによる履歴移動は初期リリースでは控えめに扱う。
- ブラウザ標準の戻る操作や OS ジェスチャーとの衝突を避ける。
- prompt コピー用のボタンや操作導線はスマホ版には出さない。
- prompt コピー用ボタンを置いていたスマホ版の縦ツール列の位置には、シャッフルモードのオン/オフトグルを表示する。

## 公開データ

`public/videos.json` の動画要素は以下のスキーマを正とする。

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

必須項目:

- `id`
- `videoUrl`
- `thumbnailUrl`
- `prompt`
- `tags`

任意項目:

- `createdAt`
- `description`

フィールドの意味:

- `id`: 公開用の安定 ID。個別動画 URL、将来の likes、将来 DB のキーに使う。
- `videoUrl`: 動画ファイルの絶対公開 URL。
- `thumbnailUrl`: サムネイル画像の絶対公開 URL。
- `prompt`: 公開する Sora 生成 prompt。フィールドは必須だが、空文字は許容する。
- `tags`: 公開用に選別済みのタグ。
- `createdAt`: ソート用日時。export 時に元ファイル ULID などから算出してよい。
- `description`: 後日自由に入れられる公開コメント。

## 公開 ID と createdAt

- `id` は元ファイル名を使わない。
- `id` は export 時に別生成した ULID または UUID とする。
- 元ファイル名の ULID は公開しない。
- `createdAt` は export 時に元ファイル名 ULID から算出してよい。
- 公開サイト側は元ファイル名や元 ULID を知らない。

## 公開 URL

- `videoUrl` と `thumbnailUrl` は `https://...` の絶対 URL のみ許可する。
- ローカルパス、相対パス、`/videos/...` は使わない。
- R2 のオブジェクト名にも元ファイル名やローカル構造を含めない方針とする。

## 公開タグ

- `sora-player` のローカル管理タグをそのまま公開しない。
- 公開用に選別済みのタグだけを `public/videos.json` に含める。
- タグは一覧上部の絞り込みチップと再生画面に表示する。
- 動画カードにはタグを表示しない。
- `meta:` prefix は `sora-player` 側の export 制御用として予約し、公開タグとしては出力しない。
- `meta:public` は個別動画を公開候補に入れるためのローカル制御タグとする。
- `meta:no-public` は個別動画を公開対象から外すためのローカル制御タグとする。
- `meta:public` と `meta:no-public` の共存は矛盾として export を失敗させる。
- `ぼっちざろっく！` や `けいおん！` のように、タグ単位で公開対象から除外したいものは `sora-player` 側の export 設定で管理する。

## 公開禁止情報

以下は公開しない。

- ローカルパス。
- 元ファイル名。
- `sora-player` の `config.json`。
- `videos/` のディレクトリ構造。
- `generations.json` / `account.json` の生データ。
- `data/tags.json` の生データ。
- 内部管理タグ。
- 非公開にしたい prompt / description。
- Finder 連携に必要な ID やパス情報。
- likes 以外の書き込み API、管理 API、ローカルファイル操作。

## 非公開化・削除

- 初期リリースでは `visibility`, `deletedAt`, `private` のような状態フィールドを持たない。
- 公開対象だけを `public/videos.json` に含める。
- 非公開化や削除は `public/videos.json` から除外する運用とする。
- 個別動画の一時的な非公開化は、`sora-player` 側で `meta:no-public` を付け、次回 export で除外する。
- タグ単位の非公開化は、`sora-player/data/gallery-export-config.json` の `excludeTags` で管理する。
- 公開対象から外した動画は、原則として R2 の動画本体とサムネイルも削除する。
- manifest の対象 entry は、再公開時に同じ公開 ID を使えるように残す。
- Cloudflare CDN にキャッシュが残る場合は、必要に応じて purge する。

## Cloudflare Pages

- Cloudflare Pages にデプロイする。
- Pages Functions は likes API のみに使う。
- `public/videos.json` をクライアントから fetch する。
- 検索、一覧、タグ絞り込み、再生画面の動画データは DB 化しない。

## 将来検討

### likes

- 初期リリースに含める。
- Cloudflare Pages Functions + D1 で実装する。
- `id` を likes の安定キーとして使う。
- API は `GET /api/likes` と `POST /api/likes` のみにする。
- `POST /api/likes` は `public/videos.json` に存在する公開動画 ID のみ受け付ける。
- `POST /api/likes` は `action: "like"` と `action: "unlike"` を受け付ける。
- ユーザーはいいね後にもう一度押していいねを取り消せる。
- 取り消し可否は LocalStorage の liked cache に依存する。cache が消えた場合、そのブラウザでは過去のいいねを自分のものとして判定できないため、取り消しは諦める。
- likes は動画本体データとは別に `video_id` に紐づける。
- 一覧カードには likes のボタンや件数を表示しない。
- 再生画面にのみ likes UI を表示する。
- likes は軽量な反応機能であり、厳密な投票・ランキング・課金・審査の根拠には使わない。

### DB

- 動画本体データはしばらく `public/videos.json` 運用でよい。
- 将来 DB 化する場合も、`public/videos.json` のスキーマを原型として扱う。
- likes 用 D1 は動画本体 DB とは別の最小集計 DB として扱う。

### 管理・export

- 管理、選別、公開データ生成は `sora-player` 側で行う。
- `sora-gallery` に管理画面を入れない。
- `sora-gallery` は export された `public/videos.json` と公開 URL を読むだけにする。

### Workers

- Pages Functions / Workers 系の動的機能は likes 用の最小 API から始める。
- 検索や動画一覧配信は当面静的 `public/videos.json` のままとする。
