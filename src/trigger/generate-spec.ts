import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { randomUUID } from "node:crypto"
import { put } from "@vercel/blob"
import { logger, metadata, task } from "@trigger.dev/sdk/v3"

import { prisma } from "@/lib/prisma"
import { generateSpecPayloadSchema, type GenerateSpecPayload } from "@/lib/spec-agent/schema"

const SPEC_GEMINI_MODEL = "gemini-2.5-flash"

function getSpecGenerationModel() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error(
      "Spec generation requires GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY to be set.",
    )
  }
  return createGoogleGenerativeAI({ apiKey })(SPEC_GEMINI_MODEL)
}

function buildPrompt(input: GenerateSpecPayload): { system: string; prompt: string } {
  const chatBlock = input.chatHistory.length
    ? input.chatHistory.map((m) => `- (${m.role}) ${m.sender}: ${m.content}`).join("\n")
    : "(no chat messages)"

  const system = `You are a senior software architect. Write a technical specification in Markdown.
Use clear headings (##, ###), bullet lists, and tables where they improve readability.
Describe components (from diagram nodes), relationships (from edges and labels), data flows, interfaces, and non-functional considerations inferred from the diagram.
Output only the Markdown document — no surrounding quotes, no preamble like "Here is the spec".`

  const prompt = `Room/project id: ${input.roomId}

## Collaborative chat (optional context)
${chatBlock}

## Canvas nodes (JSON)
${JSON.stringify(input.nodes, null, 2)}

## Canvas edges (JSON)
${JSON.stringify(input.edges, null, 2)}`

  return { system, prompt }
}

export const generateSpecTask = task({
  id: "generate-spec",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
  run: async (payload: unknown) => {
    const input = generateSpecPayloadSchema.parse(payload)

    metadata.set("phase", "start")
    metadata.set("status", "starting")

    const model = getSpecGenerationModel()
    const { system, prompt } = buildPrompt(input)

    metadata.set("phase", "processing")
    metadata.set("status", "generating")

    try {
      const result = await generateText({
        model,
        system,
        prompt,
      })

      const markdown = result.text.trim()

      const specId = randomUUID()
      const blobPath = `specs/${input.projectId}/${specId}.md`

      let blobUrl: string
      try {
        const blob = await put(blobPath, markdown, {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "text/markdown; charset=utf-8",
        })
        blobUrl = blob.url
      } catch (error) {
        logger.error("generate-spec blob upload failed", { projectId: input.projectId, error })
        throw error
      }

      try {
        await prisma.projectSpec.create({
          data: {
            id: specId,
            projectId: input.projectId,
            filePath: blobUrl,
          },
        })
      } catch (error) {
        logger.error("generate-spec ProjectSpec persist failed", { projectId: input.projectId, error })
        throw error
      }

      metadata.set("phase", "complete")
      metadata.set("status", "done")

      return { markdown, specId }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Spec generation failed"
      logger.error("generate-spec failed", { message, error })

      metadata.set("phase", "error")
      metadata.set("status", "failed")

      throw error
    }
  },
})
