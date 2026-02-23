import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

// Parse DATABASE_URL - remove 'file:' prefix if present and resolve to absolute path
function getDatabasePath(): string {
  let dbPath = process.env.DATABASE_URL || "./data/recipes.db";

  // Remove 'file:' prefix if present (common in SQLite connection strings)
  if (dbPath.startsWith("file:")) {
    dbPath = dbPath.slice(5);
  }

  // If relative path, resolve from project root
  if (dbPath.startsWith("./") || dbPath.startsWith("../") || !dbPath.startsWith("/")) {
    dbPath = resolve(process.cwd(), dbPath);
  }

  return dbPath;
}

const DB_PATH = getDatabasePath();

// Ensure the data directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create the SQLite database connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better performance
sqlite.pragma("journal_mode = WAL");

// Create the Drizzle database instance with schema
export const db = drizzle(sqlite, { schema });

// Export schema for use in other files
export * from "./schema";
