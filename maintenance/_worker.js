const page = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>公開を一時停止しています | Sora Gallery</title>
  <style>
    html { color-scheme: dark; }
    body { margin: 0; background: #121212; color: #fafafa; font: 18px/1.8 system-ui, sans-serif; }
    main { max-width: 42rem; margin: 12vh auto; padding: 1.5rem; }
    h1 { font-size: clamp(1.5rem, 5vw, 2rem); line-height: 1.5; }
    p { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>公開を一時停止しています</h1>
    <p>Sora Gallery はメンテナンスのため、一時的に公開を停止しています。</p>
    <p>再開までしばらくお待ちください。</p>
  </main>
</body>
</html>`;

// 通常のアプリ、公開データ、D1、外部サービスへ処理を渡さない。
export default {
  fetch(request) {
    return new Response(request.method === "HEAD" ? null : page, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "3600",
        "X-Sora-Gallery-Maintenance": "1",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      },
    });
  },
};
