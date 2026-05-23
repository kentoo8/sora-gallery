interface Env {
  DB: D1Database;
}

// サーバーレスインスタンス内の簡易IPキャッシュ
const ipCache = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 2000; // 2秒

/**
 * 簡易IPレートリミット判定
 * 同じIPアドレスから連続してリクエストが来た場合に制限する
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const lastTime = ipCache.get(ip);

  if (lastTime && now - lastTime < RATE_LIMIT_WINDOW_MS) {
    return true; // レートリミット制限対象
  }

  ipCache.set(ip, now);

  // メモリ肥大化を防ぐために定期的に古いキャッシュをクリーンアップ
  if (ipCache.size > 1000) {
    const threshold = now - RATE_LIMIT_WINDOW_MS;
    for (const [key, val] of ipCache.entries()) {
      if (val < threshold) {
        ipCache.delete(key);
      }
    }
  }

  return false;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return new Response(
      JSON.stringify({ error: "D1 Database configuration (DB binding) is missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // 全てのいいねレコードを取得
    const { results } = await db.prepare("SELECT video_id, count FROM likes").all();
    
    // クライアント側で処理しやすいように { [video_id]: count } のオブジェクト形式に変換
    const likesMap: Record<string, number> = {};
    if (results) {
      for (const row of results) {
        const videoId = row.video_id as string;
        const count = row.count as number;
        likesMap[videoId] = count;
      }
    }

    return new Response(JSON.stringify({ likes: likesMap }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=10", // 10秒間のエッジキャッシュを許容
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to fetch likes" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return new Response(
      JSON.stringify({ error: "D1 Database configuration (DB binding) is missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 簡易IPレートリミットの適用
  const clientIp = context.request.headers.get("CF-Connecting-IP") || "unknown";
  if (clientIp !== "unknown" && checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await context.request.json()) as { video_id?: unknown };
    const videoId = body.video_id;

    if (!videoId || typeof videoId !== "string" || videoId.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Invalid video_id parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // UPSERT クエリ: 存在しなければ 1 で初期化、存在すれば count を +1
    const { success } = await db
      .prepare(
        `INSERT INTO likes (video_id, count, updated_at)
         VALUES (?1, 1, datetime('now'))
         ON CONFLICT(video_id) DO UPDATE SET
           count = count + 1,
           updated_at = datetime('now')`
      )
      .bind(videoId.trim())
      .run();

    if (!success) {
      throw new Error("Failed to register like inside D1");
    }

    // 更新後の最新カウントを取得して返却
    const updated = await db
      .prepare("SELECT count FROM likes WHERE video_id = ?1")
      .bind(videoId.trim())
      .first<{ count: number }>();

    return new Response(
      JSON.stringify({
        success: true,
        video_id: videoId,
        new_count: updated ? updated.count : 1,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to submit like" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
