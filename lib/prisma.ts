import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"

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
  // Accelerate URLs must use `accelerateUrl`; driver adapters require direct TCP URLs.
  if (databaseUrl.startsWith("prisma+postgres://") || databaseUrl.startsWith("prisma://")) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    })
  }

  const adapter = new PrismaPg({ connectionString: normalizeSslMode(databaseUrl) })
  return new PrismaClient({ adapter })
}

function getPrismaSingleton(): PrismaClient {
  const existing = globalForPrisma.prisma

  // After `prisma generate` or schema changes, Next.js can hot-reload while `globalThis`
  // still holds an older PrismaClient — newer model delegates (e.g. `projectSpec`) are then missing.
  if (
    existing &&
    process.env.NODE_ENV !== "production" &&
    // Delegate exists on every fresh client; stale cached instances omit new models.
    !existing.projectSpec
  ) {
    void existing.$disconnect().catch(() => undefined)
    globalForPrisma.prisma = undefined
  }

  globalForPrisma.prisma ??= createPrismaClient()
  return globalForPrisma.prisma
}

export const prisma = getPrismaSingleton()
