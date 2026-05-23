# likes API レート制限強化方針

## 結論

`POST /api/likes` の強化は、まず Cloudflare WAF Rate Limiting Rules で行う。

アプリ内の Pages Functions メモリ Map による簡易制限は、一般ユーザーの軽い連打抑制として残す。ただし、これはセキュリティ境界ではない。

## 採用しない初期案

### D1 に IP / User-Agent 系の識別子を保存する

初期強化では採用しない。

理由:

- likes は軽量な反応機能であり、ユーザー識別を強くしたくない。
- IP ハッシュや User-Agent ハッシュでも、運用上はクライアント識別子として扱う必要がある。
- D1 の schema と削除・保持期間の設計が増える。

### Turnstile を likes ボタンに入れる

初期強化では採用しない。

理由:

- いいね操作の軽さを損なう。
- UI 実装、token 検証、secret 管理が増える。
- 明確な bot abuse が出てからでよい。

### Durable Objects でレート制限する

初期強化では採用しない。

理由:

- likes の初期運用には重い。
- ルーティング、状態管理、運用対象が増える。
- まず edge の WAF Rate Limiting Rules で十分かを見る。

## 推奨 Cloudflare WAF ルール

対象:

```text
http.request.uri.path eq "/api/likes" and http.request.method eq "POST"
```

初期しきい値:

```text
10 requests / 1 minute / IP
```

初期アクション:

1. 可能なら log / simulate で開始する。
2. 誤検知が少なければ block または managed challenge に変える。

注意:

- preview と production の両方に効く場合、preview 確認中の連打で制限に当たる可能性がある。
- production の通常ユーザーは LocalStorage により同一動画を連打できないため、1分10回でもかなり余裕がある。
- しきい値は実アクセスを見て調整する。

## アプリ側に残すもの

- LocalStorage による同一ブラウザでの重複 like 防止。
- Pages Functions 内メモリ Map による 2 秒の簡易 IP ガード。
- `public/videos.json` の公開動画 ID 許可リスト検証。
- 壊れた JSON / 不正 ID / 非公開 ID の拒否。

## 将来の見直し条件

以下が起きたら、Turnstile または D1 側の重複制御を再検討する。

- WAF Rate Limiting Rules を入れても likes の異常増加が続く。
- 特定動画に対する明確な bot 投票が発生する。
- likes をランキング、集計表示、審査、課金などの重い意味に使いたくなった。
- IP ベース制限の誤検知が多く、別の識別粒度が必要になった。
