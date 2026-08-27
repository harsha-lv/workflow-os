import { createClient, type Client } from "@libsql/client";
import { drizzle as drizzleSqlite, type LibSQLDatabase } from "drizzle-orm/libsql";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import fs from "node:fs";
import path from "node:path";
import postgres, { type Sql } from "postgres";
import {
  databasePoolMax,
  databaseUrl as configDatabaseUrl,
  isPostgresUrl,
  postgresSsl,
} from "@/server/config";
import { schema as sqliteSchema } from "./schema.sqlite";
import { schema as pgSchema } from "./schema.pg";
import { applySchema } from "./migrate";
import { applyPgSchema } from "./migrate.pg";

export type Database = LibSQLDatabase<typeof sqliteSchema>;
type PgDatabase = PostgresJsDatabase<typeof pgSchema>;

let sqliteCache: { db: Database; client: Client; url: string } | null = null;
let pgCache: { db: PgDatabase; sql: Sql; url: string } | null = null;

export function databaseUrl(): string {
  return configDatabaseUrl();
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

function asAppDb(db: Database | PgDatabase): Database {
  return db as unknown as Database;
}

export function getDb(): Database {
  const url = databaseUrl();
  if (isPostgresUrl(url)) {
    if (pgCache && pgCache.url === url) return asAppDb(pgCache.db);
    const sql = postgres(url, {
      max: databasePoolMax(),
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 15,
      ssl: postgresSsl(url),
      prepare: false,
    });
    const db = drizzlePg(sql, { schema: pgSchema });
    pgCache = { db, sql, url };
    return asAppDb(db);
  }

  const fileUrl = ensureFileUrl(url);
  if (sqliteCache && sqliteCache.url === fileUrl) return sqliteCache.db;
  const client = createClient({ url: fileUrl });
  const db = drizzleSqlite(client, { schema: sqliteSchema });
  sqliteCache = { db, client, url: fileUrl };
  return db;
}

export function getClient(): Client {
  getDb();
  if (!sqliteCache) {
    throw new Error("SQLite client is only available when DATABASE_URL is a file: URL");
  }
  return sqliteCache.client;
}

let migrated = false;

export async function ensureMigrated(): Promise<Database> {
  const db = getDb();
  if (!migrated) {
    if (isPostgresUrl(databaseUrl())) {
      if (!pgCache) throw new Error("PostgreSQL client not initialized");
      await applyPgSchema(pgCache.sql);
    } else {
      await applySchema(getClient());
    }
    migrated = true;
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (pgCache) {
    await pgCache.sql.end({ timeout: 5 });
    pgCache = null;
  }
  if (sqliteCache) {
    sqliteCache.client.close();
    sqliteCache = null;
  }
  migrated = false;
}

export function resetDbCache(): void {
  if (pgCache) {
    void pgCache.sql.end({ timeout: 1 });
    pgCache = null;
  }
  sqliteCache = null;
  migrated = false;
}
