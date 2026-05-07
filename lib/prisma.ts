import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

const createPrismaClient = () => {
  // `prisma+postgres://` URLs use Accelerate and should not use the pg adapter.
  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient()
  }

  const adapter = new PrismaPg(databaseUrl)
  return new PrismaClient({ adapter })
}

export const prisma =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (globalForPrisma.prisma ??= createPrismaClient())
