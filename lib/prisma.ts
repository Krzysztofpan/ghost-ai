import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

function normalizeSslMode(url: string): string {
  try {
    const parsed = new URL(url)
    const sslMode = parsed.searchParams.get("sslmode")

    if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
      parsed.searchParams.set("sslmode", "verify-full")
      return parsed.toString()
    }
  } catch {
    // Keep original URL if parsing fails.
  }

  return url
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

const createPrismaClient = () => {
  // `prisma+postgres://` URLs use Accelerate and should not use the pg adapter.
  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient()
  }

  const adapter = new PrismaPg({ connectionString: normalizeSslMode(databaseUrl) })
  return new PrismaClient({ adapter })
}

export const prisma = process.env.NODE_ENV === "production" ? createPrismaClient() : (globalForPrisma.prisma ??= createPrismaClient())
