import { config as loadEnv } from "dotenv"
import { resolve } from "node:path"
import { prismaExtension } from "@trigger.dev/build/extensions/prisma"
import { defineConfig } from "@trigger.dev/sdk/v3"

// Config is evaluated before the CLI merges env into `process.env`; load files explicitly.
loadEnv({ path: resolve(process.cwd(), ".env") })
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true })

const projectRef = process.env.TRIGGER_PROJECT_REF
if (!projectRef) {
  throw new Error("Missing TRIGGER_PROJECT_REF. Set it in .env or .env.local.")
}

export default defineConfig({
  project: projectRef,
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  build: {
    extensions: [prismaExtension({ mode: "modern" })],
  },
})
