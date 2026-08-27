export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertProductionConfig, embeddedWorkerEnabled } = await import("@/server/config");
  assertProductionConfig();
  if (!embeddedWorkerEnabled()) return;
  const { startWorker } = await import("@/server/worker");
  startWorker();
}
