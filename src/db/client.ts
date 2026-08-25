import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import { schema } from "./schema";
import { applySchema } from "./migrate";

export type Database = LibSQLDatabase<typeof schema>;

let cached: { db: Database; client: Client; url: string } | null = null;

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? "file:./data/workflow-os.db";
}

function ensureFileUrl(url: string): string {
  if (!url.startsWith("file:")) return url;
  const raw = url.slice("file:".length);
  const filePath = path.isAbsolute(raw)
    ? raw
    : path.join(/* turbopackIgnore: true */ process.cwd(), raw.replace(/^\.\//, ""));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return `file:${filePath}`;
}

export function getDb(): Database {
  const url = ensureFileUrl(databaseUrl());
  if (cached && cached.url === url) return cached.db;
  const client = createClient({ url });
  const db = drizzle(client, { schema });
  cached = { db, client, url };
  return db;
}

export function getClient(): Client {
  getDb();
  if (!cached) throw new Error("Database client not initialized");
  return cached.client;
}

let migrated = false;

export async function ensureMigrated(): Promise<Database> {
  const db = getDb();
  if (!migrated) {
    await applySchema(getClient());
    migrated = true;
  }
  return db;
}

export function resetDbCache(): void {
  cached = null;
  migrated = false;
}
