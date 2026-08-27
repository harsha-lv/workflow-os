import { loadEnv } from "@/server/load-env";

loadEnv();

import { closeDb, ensureMigrated, resetDbCache } from "@/db/client";
import { seedDemo, seedTemplates } from "@/server/seed";

async function main() {
  resetDbCache();
  await ensureMigrated();
  await seedTemplates();
  const result = await seedDemo();
  console.info(`Seeded FlowForge Demo workspace for ${result.email} (${result.status})`);
  await closeDb();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
