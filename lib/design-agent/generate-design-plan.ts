import { generateText, tool, zodSchema } from "ai"

import { getDesignAgentLanguageModel, getDesignLlmProvider } from "@/lib/design-agent/design-llm"
import { designPlanSchema, type DesignPlan } from "@/lib/design-agent/schema"

/** Large tool-call JSON (many actions) exceeds small limits and yields finishReason=length with no tool result. */
const MAX_OUTPUT_TOKENS = 65536

const MAX_PLAN_ATTEMPTS = 3

/** Must match the key in `tools` and `toolChoice.toolName`. */
export const SUBMIT_DESIGN_PLAN_TOOL = "submit_design_plan"

const submitDesignPlan = tool({
  description:
    "Submit the canvas design plan. Call exactly once per user request with a short summary and an ordered list of canvas actions. Do not answer with plain text — use this tool only.",
  inputSchema: zodSchema(designPlanSchema),
  execute: async (plan: DesignPlan) => plan,
})

function buildSystemPrompt(): string {
  return [
    "You are an expert software architect helping users design diagrams on a collaborative canvas.",
    "",
    `You MUST call the tool ${SUBMIT_DESIGN_PLAN_TOOL} exactly once with the full plan.`,
    "Do not emit raw JSON or markdown in the assistant message — only invoke the tool.",
    "",
    "Plan rules:",
    "- Each action has string field op: add_node | move_node | resize_node | update_node_data | delete_node | add_edge | delete_edge.",
    "- shape must be one of: rectangle, diamond, circle, pill, cylinder, hexagon.",
    "- paletteIndex is integer 0–7 (0 neutral, 1 blue, 2 purple, 3 orange, 4 red, 5 pink, 6 green, 7 teal).",
    "- Node ids: unique; prefix new nodes with ai-. Edge ids: prefix ai-edge-.",
    "- Order actions so add_node comes before add_edge for those nodes.",
    "- Position on a 16px grid; ≥48px gap between node boxes when adding.",
    "- At most 16 actions per response (fewer is better). Keep node labels under ~48 characters.",
    "- Omit width/height on add_node unless a non-default size is needed.",
  ].join("\n")
}

function trimCanvasContext(json: string, maxChars: number): string {
  if (json.length <= maxChars) return json
  return `${json.slice(0, maxChars)}\n… [truncated ${json.length - maxChars} chars for token limits]`
}

export async function generateDesignPlan(prompt: string, canvasContextJson: string): Promise<DesignPlan> {
  let lastFeedback: string | undefined
  let lastFinishReason: string | undefined
  const canvasForPrompt = trimCanvasContext(canvasContextJson, 48_000)

  for (let attempt = 0; attempt < MAX_PLAN_ATTEMPTS; attempt++) {
    const truncationHint =
      lastFinishReason === "length"
        ? "IMPORTANT: Your last reply hit the output token limit before the tool finished. Use at most 8 actions, very short labels (≤32 chars), and only essential edges."
        : ""

    const repair =
      attempt === 0
        ? ""
        : `\n\nPrevious attempt failed: ${lastFeedback}\nCall ${SUBMIT_DESIGN_PLAN_TOOL} again with valid arguments.\n${truncationHint}\n`

    const userPrompt = [
      "User request:",
      prompt.trim(),
      "",
      "Current canvas (nodes and edges JSON):",
      canvasForPrompt,
      repair,
    ].join("\n")

    try {
      const llmProvider = getDesignLlmProvider()
      const result = await generateText({
        model: getDesignAgentLanguageModel(),
        tools: { [SUBMIT_DESIGN_PLAN_TOOL]: submitDesignPlan },
        toolChoice: { type: "tool", toolName: SUBMIT_DESIGN_PLAN_TOOL },
        system: buildSystemPrompt(),
        prompt: userPrompt,
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        ...(llmProvider === "google"
          ? {
              providerOptions: {
                google: {
                  thinkingConfig: {
                    thinkingLevel: "minimal",
                  },
                },
              },
            }
          : {}),
      })

      const hit = result.staticToolResults.find((r) => r.toolName === SUBMIT_DESIGN_PLAN_TOOL)
      if (hit?.output !== undefined && hit.output !== null) {
        return hit.output as DesignPlan
      }

      const reason = result.finishReason
      lastFinishReason = reason
      const detail =
        reason === "length"
          ? `Output hit max length before the tool call completed (tool JSON too large or model verbose).`
          : `No tool result; finishReason=${reason}`

      lastFeedback = `${detail} textSnippet=${result.text.slice(0, 400)}`
    } catch (error) {
      lastFeedback = error instanceof Error ? error.message : String(error)
    }
  }

  throw new Error(`Design plan generation failed: ${lastFeedback ?? "unknown error"}`)
}
