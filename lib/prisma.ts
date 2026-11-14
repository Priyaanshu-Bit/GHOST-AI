import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  // Branch by DATABASE_URL:
  // - if it starts with prisma+postgres://, use Accelerate
  if (connectionString?.startsWith("prisma+postgres://")) {
    return new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
  }

  // - otherwise use direct @prisma/adapter-pg
  const pool = new Pool({
    connectionString: connectionString || undefined,
  });
  const schema = connectionString
    ? new URL(connectionString).searchParams.get("schema") || "public"
    : "public";
  const adapter = new PrismaPg(pool, { schema });

  return new PrismaClient({
    adapter,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
