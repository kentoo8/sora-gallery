# sora-player export 要件定義

## 概要

`sora-player` はローカル管理・選別用アプリであり、`sora-gallery` へ公開用データを export する責務を持つ。

`sora-gallery` は export 済みの `public/videos.json` と公開 URL を読むだけにする。`sora-gallery` 側にローカルファイルシステム、管理画面、書き込み API、認証を持ち込まない。

## export の目的

ローカルの Sora 生成動画、メタデータ、ローカルタグから、Web 公開に必要な最小データだけを生成する。

出力先は `sora-gallery/public/videos.json` を想定する。ただし実装上は任意の出力パスを指定できるようにしてよい。

## 入力

`sora-player` 側で扱う入力:

- ローカル動画ファイル。
- `generations.json`。
- `account.json`。
- `data/tags.json`。
- 既存サムネイル、または事前生成済みサムネイル。
- export 用の公開設定。

## 出力

`sora-gallery/public/videos.json` のスキーマに合わせる。

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

## フィールド変換

### id

- 元ファイル名、元 ULID、ローカル相対パスは使わない。
- export 時に公開用 ULID または UUID を別生成する。
- 一度生成した公開用 ID は維持する。
- ID 維持のため、非公開の対応表を `sora-player` 側に持つ。

### createdAt

- 元ファイル名 ULID または `generations.json` の `task_id` から算出してよい。
- 公開するのは ISO 8601 文字列のみ。
- 元ファイル名や元 ULID は公開しない。

### videoUrl / thumbnailUrl

- R2 などにアップロード済みの `https://...` 絶対公開 URL を出力する。
- `/videos/...`、ローカルパス、相対パス、localhost は出力しない。
- R2 オブジェクト名にも元ファイル名やローカルディレクトリ構造を含めない。
- 推奨パス:
  - `videos/{publicId}.mp4`
  - `thumbnails/{publicId}.webp`

### prompt

- 公開してよい prompt のみを出力する。
- 非公開にしたい prompt は export 対象から外すか、公開前に明示的に除外する。

### tags

- `data/tags.json` のローカル管理タグをそのまま出さない。
- 公開用に選別済みのタグだけを出力する。
- タグなし動画は `tags: []` として出力してよい。
- `未分類` は `sora-gallery` 側で `tags: []` から表示する公開カテゴリであり、タグ文字列としては出力しない。

### description

- 任意の公開コメント。
- 未設定なら省略する。
- ローカルメモや内部向けコメントは出力しない。

## export 対象の選別

初期方針:

- `sora-player` 側で「公開対象」だけを export する。
- `sora-gallery` 側には `visibility`, `private`, `deletedAt` を持たせない。
- 非公開化や削除は次回 export で `videos.json` から除外する。

## 非公開の対応表

公開用 ID を安定させるため、`sora-player` 側に非公開の対応表を持つ。

推奨スキーマ:

```ts
type GalleryExportManifest = {
  version: 1;
  videos: Record<
    string,
    {
      publicId: string;
      videoObjectKey: string;
      thumbnailObjectKey: string;
      exportedAt: string;
    }
  >;
};
```

対応表のキーはローカル側の安定識別子とする。例:

- `filename`
- `relativePath`
- `generation id`

この対応表は公開しない。

## 実行形態

初期実装は `sora-player` 側の CLI script として始めるのがよい。

想定:

```bash
npm run export:gallery -- --out ../sora-gallery/public/videos.json
```

将来、必要なら `sora-player` の UI から実行できるようにする。

## R2 アップロードとの関係

初期は export と R2 アップロードを分けてよい。

段階:

1. `sora-player` が公開対象を選別し、公開用 ID と object key を決める。
2. 動画とサムネイルを R2 にアップロードする。
3. R2 の公開 URL を使って `videos.json` を生成する。
4. `sora-gallery` で `npm run validate:data` を実行する。

将来は `sora-player` 側 export script が R2 アップロードまで行ってもよい。

## export 後の検証

export 後は `sora-gallery` 側で必ず以下を実行する。

```bash
npm run validate:data
npm run build
```

検証で落とすべきもの:

- 未定義フィールド。
- ローカルパス。
- localhost URL。
- `filename`, `account` などローカル専用フィールド。
- 重複 ID。
- 重複 URL。
- 空 prompt。
- 不正な `createdAt`。

## 初期実装でやらないこと

- `sora-gallery` 側の管理画面。
- `sora-gallery` 側の書き込み API。
- `sora-gallery` 側の認証。
- likes / Workers / DB。
- 公開サイトからのタグ編集。
- 公開サイトからの R2 アップロード。
