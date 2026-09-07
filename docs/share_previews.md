# 個別動画URLの共有プレビュー

## 仕組み

`npm run build` は Vite のビルド後、公開対象の `dist/videos.json` から `dist/video/{id}.html` を生成する。各ページは通常のアプリを読み込み、初期HTMLに Open Graph と Twitter Card のメタ情報を持つ。JavaScriptを実行しないクローラーもサムネイル、prompt由来のタイトル、説明文を読める。

- 説明文は公開コメントがあればそれを優先し、なければpromptの抜粋を使う。
- `og:image` に既存の公開サムネイル、`og:video` に公開動画URLを指定する。MP4/WebMはMIME typeも指定する。寸法は現行データにないため推測値を入れない。
- `twitter:card` は `summary_large_image` とする。任意のサービスでのインライン動画再生を保証するものではない。
- 正規URLはタグ・検索条件を含めない。実際に開いたURLのクエリは変更せず、既存の絞り込み復元を維持する。
- 公開URLの既定値は `https://sora-gallery.pages.dev`。別ドメインを使う場合は `SITE_URL=https://gallery.example.com npm run build` のようにHTTPS originを指定する。
- Pagesの拡張子なしHTML配信で `/video/{id}` を処理する。全URLを `/index.html` へ書き換える `_redirects` は置かない。不明なURLはPages標準のSPAフォールバックで既存アプリへ渡す。
- 公開対象から外したページは次回ビルド・デプロイで除去される。外部サービスが保存したプレビューはすぐには更新されない場合がある。

開発用の `npm run dev` では個別の共有HTMLを生成しない。確認にはビルド成果物またはPagesの公開URLを使う。

## 公開後の確認

1. 通常どおりビルドしてPagesへデプロイする。
2. 個別動画URLを直接開き、再読み込みして動画を表示できることを確認する。タグ付きURLでも絞り込みが保持されることを確認する。
3. `curl -fsSL 'https://sora-gallery.pages.dev/video/公開ID'` で、対象動画の `og:image` と `og:video` がHTML内にあることを確認する。
4. Discordで個別動画URLを投稿し、該当サムネイルと説明文、インライン再生の可否を確認する。過去のプレビューが残る場合は、未共有の動画URLでも試す。リンクの埋め込み表示が有効であることも確認する。

Discord実機でのサムネイル表示・インライン動画再生は未確認。サイトからは標準メタ情報を提供し、最終的な表示方法は共有先が決定する。

参照: [Open Graph protocol](https://ogp.me/)、[PagesのHTML配信とSPAフォールバック](https://developers.cloudflare.com/pages/configuration/serving-pages/)、[Pagesのリダイレクト優先順位](https://developers.cloudflare.com/pages/configuration/redirects/)。
