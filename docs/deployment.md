# Deployment

The canonical production guide is **[DEPLOYMENT.md](../DEPLOYMENT.md)** at the repository root.

Short version:

1. PostgreSQL for production. SQLite stays local-only.
2. Set `APP_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`.
3. `npm run db:migrate`
4. `npm run seed:demo` with `DEMO_EMAIL` and `DEMO_PASSWORD`
5. `npm run build && npm start`
6. `npm run worker` as a second process

`SEED_ON_BOOT` must not be enabled in production. Webhook URLs use `APP_URL`, never localhost.

Optional blockchain verification: see [DEPLOYMENT.md](../DEPLOYMENT.md#blockchain-verification-optional). Default is off.
