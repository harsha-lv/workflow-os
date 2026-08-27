import { processQueuedExecutions } from "@/server/services/executions";
import { ensureMigrated } from "@/db/client";
import { isProduction, seedOnBootEnabled } from "@/server/config";
import { maybeSeed } from "@/server/seed";

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export async function tickWorker(): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    await ensureMigrated();
    if (seedOnBootEnabled()) await maybeSeed();
    return await processQueuedExecutions(4);
  } catch (error) {
    console.error("[worker]", error);
    return 0;
  } finally {
    running = false;
  }
}

export function startWorker(): void {
  if (timer) return;
  const ms = Number(process.env.WORKER_POLL_MS ?? (isProduction() ? 1000 : 750));
  void tickWorker();
  timer = setInterval(() => {
    void tickWorker();
  }, Number.isFinite(ms) ? ms : 1000);
}

export function stopWorker(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
