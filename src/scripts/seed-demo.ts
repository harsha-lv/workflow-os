import { loadEnv } from "@/server/load-env";

loadEnv();

import { closeDb, ensureMigrated, resetDbCache } from "@/db/client";
import { requireDemoCredentials } from "@/server/config";
import { seedDemo, seedTemplates } from "@/server/seed";

async function main() {
  resetDbCache();
  const { email } = requireDemoCredentials();
  await ensureMigrated();
  await seedTemplates();
  const result = await seedDemo();
  console.info(`FlowForge Demo workspace ready for ${email} (${result.status})`);
  await closeDb();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
