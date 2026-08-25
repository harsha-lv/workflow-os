# Deployment

1. Set `AUTH_SECRET` and `ENCRYPTION_KEY` (64 hex chars).
2. Point `DATABASE_URL` at durable storage. SQLite is fine for a single node; Postgres is the intended production dialect.
3. Set `XAI_API_KEY` on the server.
4. Run `npm run build && npm start`.
5. Run `npm run worker` as a second process if the web dyno should not poll.

`docker compose up --build` builds the web image. Mount a volume on `/app/data` so the database survives restarts.

Webhook URL: `POST /api/webhooks/:token`. Rate limited. Authorization headers are stripped from stored payloads.
