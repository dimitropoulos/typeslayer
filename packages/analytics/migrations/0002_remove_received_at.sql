-- Remove received_at column as timestamp is sufficient but also being on Cloudflare Workers means you can't use time things
ALTER TABLE events DROP COLUMN received_at;
