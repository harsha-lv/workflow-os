# Local development

```bash
npm install
npm run dev
```

The first request migrates SQLite and seeds the local demo workspace unless `SEED_ON_BOOT=false`. Production never seeds on boot.

Useful scripts:

- `npm test` — vitest
- `npm run typecheck`
- `npm run worker` — standalone poller
- `npm run db:migrate` — apply SQLite or PostgreSQL schema
- `npm run seed:demo` — idempotent FlowForge Demo workspace (requires `DEMO_EMAIL` / `DEMO_PASSWORD` in production)

The canvas is desktop-first. Mobile still reaches runs, approvals, settings, and node inspection via the bottom sheet inspector.

Do not run the Next.js dev server as the production worker. Use `npm run worker` or a future queue consumer.

Blockchain verification is off by default (`BLOCKCHAIN_ENABLED=false`). Demo mode (`BLOCKCHAIN_MODE=demo`) produces a labeled mock proof without RPC, wallets, or funds. Real EVM mode needs `CHAIN_RPC_URL`, `CHAIN_ID`, `CHAIN_CONTRACT_ADDRESS`, and `CHAIN_PRIVATE_KEY` on the **server** only.
