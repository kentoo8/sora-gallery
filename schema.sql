-- D1 データベース初期化スキーマ
CREATE TABLE IF NOT EXISTS likes (
  video_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
