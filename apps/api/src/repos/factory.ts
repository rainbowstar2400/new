import { Pool } from "pg";
import { loadEnv } from "../env";
import { MemoryRepository } from "./memory-repo";
import { PgRepository } from "./pg-repo";
import type { AppRepository } from "./types";

let memorySingleton: MemoryRepository | null = null;

export function createRepository(): AppRepository {
  const env = loadEnv();

  if (env.DATABASE_URL) {
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    return new PgRepository(pool);
  }

  if (env.ALLOW_MEMORY_REPO === "1") {
    if (!memorySingleton) memorySingleton = new MemoryRepository();
    return memorySingleton;
  }

  throw new Error("DATABASE_URL is required when ALLOW_MEMORY_REPO is disabled.");
}
