export interface Env {
  DB: D1Database;
  INGESTION_SECRET?: string;
  REQUIRE_INGESTION_SECRET?: string;
}
