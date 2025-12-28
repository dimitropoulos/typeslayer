-- Initial schema for analytics events
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  version TEXT,
  platform TEXT,
  mode TEXT,
  data TEXT NOT NULL,
  received_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_events_name_ts ON events (name, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_session ON events (session_id);
