import { seedDemo, seedTemplates } from "@/server/seed";
import { ensureMigrated, resetDbCache } from "@/db/client";

resetDbCache();
await ensureMigrated();
await seedTemplates();
await seedDemo();
console.info("Seeded Northstar Labs workspace");
