import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { LanguageModel } from "ai"

/** Gemini when `DESIGN_AGENT_LLM=google`. */
const GOOGLE_DESIGN_MODEL = "gemini-2.5-flash"

/**
 * Default: OpenRouter **free** router (zero inference cost; picks an available free model).
 * Override with `OPENROUTER_MODEL`, e.g. `meta-llama/llama-3.2-3b-instruct:free` for a fixed free variant.
 * @see https://openrouter.ai/docs/guides/routing/routers/free-router
 * @see https://openrouter.ai/docs/features/variants/free
 */
const DEFAULT_OPENROUTER_MODEL = "openrouter/free"

export type DesignLlmProvider = "openrouter" | "google"

export function getDesignLlmProvider(): DesignLlmProvider {
  const raw = process.env.DESIGN_AGENT_LLM?.trim().toLowerCase()
  if (raw === "google") return "google"
  return "openrouter"
}

/**
 * Language model for design-plan generation (`generateText` + tools).
 * - Default: OpenRouter (`OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`).
 * - Opt-in Gemini: `DESIGN_AGENT_LLM=google` and `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`.
 */
export function getDesignAgentLanguageModel(): LanguageModel {
  const provider = getDesignLlmProvider()

  if (provider === "google") {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      throw new Error(
        "DESIGN_AGENT_LLM=google requires GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.",
      )
    }
    return createGoogleGenerativeAI({ apiKey })(GOOGLE_DESIGN_MODEL)
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      "Set OPENROUTER_API_KEY for the design agent (https://openrouter.ai/keys). " +
        "Or use Gemini: DESIGN_AGENT_LLM=google with GEMINI_API_KEY.",
    )
  }

  const modelId = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL

  const openrouter = createOpenRouter({
    apiKey,
    ...(process.env.OPENROUTER_APP_NAME ? { appName: process.env.OPENROUTER_APP_NAME } : {}),
    ...(process.env.OPENROUTER_APP_URL ? { appUrl: process.env.OPENROUTER_APP_URL } : {}),
  })

  return openrouter.chat(modelId)
}
