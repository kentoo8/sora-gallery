interface Env {
  DB: D1Database;
}

type GalleryVideoRecord = {
  id?: unknown;
};

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const VIDEO_ID_CACHE_TTL_MS = 60_000;

let allowedVideoIdsCache:
  | {
      expiresAt: number;
      ids: Set<string>;
    }
  | undefined;

// サーバーレスインスタンス内の簡易IPキャッシュ
const ipCache = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 2000; // 2秒

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function normalizeVideoId(videoId: unknown): string | null {
  if (typeof videoId !== "string") {
    return null;
  }

  const trimmed = videoId.trim();
  if (!VIDEO_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

async function loadAllowedVideoIds(request: Request): Promise<Set<string>> {
  const now = Date.now();
  if (allowedVideoIdsCache && allowedVideoIdsCache.expiresAt > now) {
    return allowedVideoIdsCache.ids;
  }

  const videosUrl = new URL("/videos.json", request.url);
  const response = await fetch(videosUrl.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load public video list: ${response.status}`);
  }

  const videos = (await response.json()) as unknown;
  if (!Array.isArray(videos)) {
    throw new Error("public videos list is not an array");
  }

  const ids = new Set<string>();
  for (const video of videos as GalleryVideoRecord[]) {
    const id = normalizeVideoId(video.id);
    if (id) {
      ids.add(id);
    }
  }

  allowedVideoIdsCache = {
    expiresAt: now + VIDEO_ID_CACHE_TTL_MS,
    ids,
  };

  return ids;
}

async function parseJsonBody(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}

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
    return jsonResponse(
      { error: "D1 Database configuration (DB binding) is missing" },
      { status: 500 }
    );
  }

  try {
    const allowedVideoIds = await loadAllowedVideoIds(context.request);

    // 全てのいいねレコードを取得
    const { results } = await db.prepare("SELECT video_id, count FROM likes").all<{
      video_id: string;
      count: number;
    }>();
    
    // クライアント側で処理しやすいように { [video_id]: count } のオブジェクト形式に変換
    const likesMap: Record<string, number> = {};
    if (results) {
      for (const row of results) {
        if (allowedVideoIds.has(row.video_id)) {
          likesMap[row.video_id] = row.count;
        }
      }
    }

    return jsonResponse({ likes: likesMap }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    return jsonResponse({
      error: err instanceof Error ? err.message : "Failed to fetch likes",
    }, {
      status: 500,
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse(
      { error: "D1 Database configuration (DB binding) is missing" },
      { status: 500 }
    );
  }

  // 簡易IPレートリミットの適用
  const clientIp = context.request.headers.get("CF-Connecting-IP") || "unknown";
  if (clientIp !== "unknown" && checkRateLimit(clientIp)) {
    return jsonResponse(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  const body = await parseJsonBody(context.request);
  if (body instanceof Response) {
    return body;
  }

  try {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { video_id: requestedVideoId } = body as { video_id?: unknown };
    const videoId = normalizeVideoId(requestedVideoId);

    if (!videoId) {
      return jsonResponse(
        { error: "Invalid video_id parameter" },
        { status: 400 }
      );
    }

    const allowedVideoIds = await loadAllowedVideoIds(context.request);
    if (!allowedVideoIds.has(videoId)) {
      return jsonResponse(
        { error: "video_id is not in the public video list" },
        { status: 404 }
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
      .bind(videoId)
      .run();

    if (!success) {
      throw new Error("Failed to register like inside D1");
    }

    // 更新後の最新カウントを取得して返却
    const updated = await db
      .prepare("SELECT count FROM likes WHERE video_id = ?1")
      .bind(videoId)
      .first<{ count: number }>();

    return jsonResponse(
      {
        success: true,
        video_id: videoId,
        new_count: updated ? updated.count : 1,
      }
    );
  } catch (err: unknown) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Failed to submit like" },
      { status: 500 }
    );
  }
};
