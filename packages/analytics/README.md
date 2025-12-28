# TypeSlayer Analytics Worker

This Cloudflare Worker ingests analytics events and stores them in a D1 database.

## Initial Setup (One-Time)

### 1. Find Your D1 Database ID

You mentioned you already created the `typeslayer` database. Get its ID:

```bash
cd packages/analytics
pnpm wrangler d1 list
```

This will output something like:

```
┌─────────────┬──────────────────────────────────────┬─────────────────────┐
│ Name        │ UUID                                 │ Created At          │
├─────────────┼──────────────────────────────────────┼─────────────────────┤
│ typeslayer  │ 12345678-abcd-1234-abcd-123456789abc │ 2025-12-27 12:00:00 │
└─────────────┴──────────────────────────────────────┴─────────────────────┘
```

Copy the UUID (the long string in the middle column).

### 2. Configure wrangler.jsonc

Open `wrangler.jsonc` and replace `REPLACE_WITH_D1_DATABASE_ID` with your UUID:

```jsonc
{
  "name": "typeslayer-analytics",
  "main": "src/index.ts",
  "compatibility_date": "2024-12-01",
  "routes": ["https://analytics.typeslayer.dev/collect"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "typeslayer",
      "database_id": "12345678-abcd-1234-abcd-123456789abc"  // <- Your UUID here
    }
  ],
  "vars": {
    "REQUIRE_INGESTION_SECRET": "0"  // Set to "1" if you want to require auth
  }
}
```

### 3. Apply Database Migrations

The migrations create the `events` table with proper indexes.

**For local development:**
```bash
pnpm migrate:local
```

**For production (remote):**
```bash
pnpm migrate:apply
```

You should see:

```
🌀 Executing on remote database typeslayer (12345678-abcd-1234-abcd-123456789abc):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 1 migration(s) in 0.42 seconds
┌────────┬───────────────────┬──────┐
│ Status │ Name              │      │
├────────┼───────────────────┼──────┤
│ ✅     │ 0001_init.sql     │      │
└────────┴───────────────────┴──────┘
```

### 4. Verify Tables Were Created

Query your database to confirm:

```bash
pnpm wrangler d1 execute typeslayer --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

You should see the `events` table listed.

## Local Development

Start the worker locally (with persistence):

```bash
pnpm dev
```

This runs on `http://localhost:8787` by default.

### Test Local Endpoint

Send a test event:

```bash
curl -X POST http://localhost:8787/collect \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_event",
    "sessionId": "test-123",
    "timestamp": 1735318800000,
    "version": "0.1.0",
    "platform": "test",
    "mode": "CLI",
    "data": {"foo": "bar"}
  }'
```

Should return: `OK`

### Query Local Data

```bash
pnpm wrangler d1 execute typeslayer --local --command="SELECT * FROM events"
```

## Optional: Set Up Authentication

If you want to require a secret key for ingestion:

### 1. Create a Secret

```bash
pnpm wrangler secret put INGESTION_SECRET
```

Wrangler will prompt you to enter a value. Use a strong random string (e.g., generate with `openssl rand -hex 32`).

### 2. Enable Secret Requirement

In `wrangler.jsonc`, change:

```jsonc
"vars": {
  "REQUIRE_INGESTION_SECRET": "1"  // Changed from "0" to "1"
}
```

### 3. Include Secret in Requests

Now all POST requests must include the header:

```bash
curl -X POST http://localhost:8787/collect \
  -H "Content-Type: application/json" \
  -H "X-Typeslayer-Analytics-Key: your-secret-here" \
  -d '{"name":"test",...}'
```

## Deploy to Production

### 1. First-Time Setup: Configure DNS Route

Your `wrangler.jsonc` specifies `analytics.typeslayer.dev/collect` as the route.

**Requirements:**
- `typeslayer.dev` must be a zone in your Cloudflare account
- DNS can be a CNAME or A/AAAA record (Cloudflare will route based on the worker route config)

If the domain isn't set up yet, you can deploy without routes first:

1. Remove or comment out the `routes` line in `wrangler.jsonc`
2. Deploy (you'll get a `*.workers.dev` URL)
3. Add the custom domain later via Cloudflare dashboard: Workers & Pages → your worker → Settings → Triggers → Routes

### 2. Deploy

```bash
pnpm deploy
```

Output will show:

```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded typeslayer-analytics (X.XX sec)
Published typeslayer-analytics (X.XX sec)
  https://analytics.typeslayer.dev/collect
  https://typeslayer-analytics.<your-subdomain>.workers.dev
Current Deployment ID: <deployment-id>
```

### 3. Test Production Endpoint

```bash
curl -X POST https://analytics.typeslayer.dev/collect \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production_test",
    "sessionId": "prod-123",
    "timestamp": 1735318800000,
    "version": "0.1.0",
    "platform": "Ubuntu",
    "mode": "GUI",
    "data": {"test": true}
  }'
```

### 4. Verify Data in Production

```bash
pnpm wrangler d1 execute typeslayer --remote --command="SELECT * FROM events ORDER BY received_at DESC LIMIT 10"
```

## Monitoring & Debugging

### View Worker Logs

```bash
pnpm wrangler tail
```

This streams live logs from your deployed worker. Leave it running and make requests to see real-time logging.

### Query Specific Events

```bash
# Count events by name
pnpm wrangler d1 execute typeslayer --remote --command="SELECT name, COUNT(*) as count FROM events GROUP BY name"

# Recent events from a session
pnpm wrangler d1 execute typeslayer --remote --command="SELECT * FROM events WHERE session_id = 'your-session-id'"

# Events in the last hour
pnpm wrangler d1 execute typeslayer --remote --command="SELECT * FROM events WHERE timestamp > (strftime('%s','now') - 3600) * 1000"
```

## Useful Commands

```bash
# List all D1 databases
pnpm wrangler d1 list

# Backup database to SQL dump
pnpm wrangler d1 export typeslayer --remote --output=backup.sql

# Execute arbitrary SQL
pnpm wrangler d1 execute typeslayer --remote --command="YOUR SQL HERE"

# Create a new migration
pnpm migrate:gen new_migration_name

# Deploy after config changes
pnpm deploy

# View deployment info
pnpm wrangler deployments list
```

## Troubleshooting

### "Database not found"
- Verify `database_id` in `wrangler.jsonc` matches output from `pnpm wrangler d1 list`
- Ensure you've run `pnpm migrate:apply` for remote database

### "Unauthorized" on POST
- If `REQUIRE_INGESTION_SECRET` is "1", ensure you've set the secret: `pnpm wrangler secret put INGESTION_SECRET`
- Include `X-Typeslayer-Analytics-Key` header in requests

### Route not working
- Ensure `typeslayer.dev` is in your Cloudflare account
- Check Workers & Pages → your worker → Settings → Triggers → Routes
- DNS record must exist (can be a placeholder A record with orange cloud)

### "DB error" response
- Check migrations were applied: `pnpm migrate:apply`
- View logs: `pnpm wrangler tail`
- Verify table exists: `pnpm wrangler d1 execute typeslayer --remote --command="SELECT name FROM sqlite_master"`

## What Gets Deployed?

The Worker accepts POST requests to `/collect` with this schema:

```typescript
{
  name: string;           // Event type: "app_started_success", etc.
  sessionId: string;      // Unique session identifier
  timestamp: number;      // Unix timestamp in milliseconds
  version?: string;       // App version
  platform?: string;      // OS/platform info
  mode?: string;          // "GUI" or "CLI"
  data: object;           // Event-specific payload (stored as JSON string)
}
```

It also supports:
- Batch uploads (array of events)
- NDJSON format (newline-delimited JSON)
- CORS for browser testing
- Health check: `GET /health`

## Next Steps

Once deployed, you'll want to:
1. Update the Rust analytics sender to use `https://analytics.typeslayer.dev/collect`
2. Add the ingestion secret header (if enabled)
3. Set up a dashboard to query/visualize the D1 data
4. Consider adding indexes for your most common queries

## Security Notes

- **Ingestion Secret**: Highly recommended for production to prevent spam
- **CORS**: Currently set to `*` - consider restricting to your domain
- **Rate Limiting**: Not implemented - consider adding wrangler rate limiting or Cloudflare Rate Limiting rules
- **Data Retention**: No automatic cleanup - consider adding a cleanup job/migration for old events
