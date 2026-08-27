export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // `next build` prerenders pages. Do not assert runtime secrets or open
  // Postgres during that phase — Vercel has no request and may not reach the DB.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertProductionConfig, embeddedWorkerEnabled } = await import("@/server/config");
  assertProductionConfig();
  if (!embeddedWorkerEnabled()) return;
  const { startWorker } = await import("@/server/worker");
  startWorker();
}
