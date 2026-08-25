# Local development

```bash
npm install
npm run dev
```

The first request migrates SQLite and seeds Northstar Labs unless `SEED_ON_BOOT=false`.

Useful scripts:

- `npm test` — vitest
- `npm run typecheck`
- `npm run worker` — standalone poller
- `npm run seed` — re-seed (fails if users already exist; wipe `data/` first)

The canvas is desktop-first. Mobile still reaches runs, approvals, settings, and node inspection via the bottom sheet inspector.

Do not run the Next.js dev server as the production worker. Use `npm run worker` or a future queue consumer.
