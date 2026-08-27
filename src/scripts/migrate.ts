import { loadEnv } from "@/server/load-env";

loadEnv();

import { closeDb, databaseUrl, ensureMigrated } from "@/db/client";
import { isPostgresUrl } from "@/server/config";

async function main() {
  await ensureMigrated();
  console.info(`Migrated ${isPostgresUrl(databaseUrl()) ? "PostgreSQL" : "SQLite"} database`);
  await closeDb();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
