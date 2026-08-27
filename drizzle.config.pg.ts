import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.pg.ts",
  out: "./drizzle/pg",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://workflow:workflow@127.0.0.1:5432/workflow_os",
  },
});
