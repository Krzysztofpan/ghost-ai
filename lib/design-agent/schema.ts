import { z } from "zod"

import { NODE_SHAPES, type NodeShape } from "@/types/canvas"

/** Allowed canvas node shapes. `z.coerce` on numerics tolerates stringified numbers from Gemini tool args. */
const shapeEnum = z.enum(NODE_SHAPES as unknown as [NodeShape, ...NodeShape[]])

export const designActionSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add_node"),
    id: z.string().min(1),
    x: z.coerce.number(),
    y: z.coerce.number(),
    label: z.string(),
    shape: shapeEnum,
    paletteIndex: z.coerce.number().int().min(0).max(7),
    width: z.coerce.number().positive().optional(),
    height: z.coerce.number().positive().optional(),
  }),
  z.object({
    op: z.literal("move_node"),
    id: z.string().min(1),
    x: z.coerce.number(),
    y: z.coerce.number(),
  }),
  z.object({
    op: z.literal("resize_node"),
    id: z.string().min(1),
    width: z.coerce.number().positive(),
    height: z.coerce.number().positive(),
  }),
  z.object({
    op: z.literal("update_node_data"),
    id: z.string().min(1),
    label: z.string().optional(),
    paletteIndex: z.coerce.number().int().min(0).max(7).optional(),
    shape: shapeEnum.optional(),
  }),
  z.object({
    op: z.literal("delete_node"),
    id: z.string().min(1),
  }),
  z.object({
    op: z.literal("add_edge"),
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    label: z.string().optional(),
  }),
  z.object({
    op: z.literal("delete_edge"),
    id: z.string().min(1),
  }),
])

export type DesignAction = z.infer<typeof designActionSchema>

export const designPlanSchema = z.object({
  summary: z.string(),
  actions: z.array(designActionSchema),
})

export type DesignPlan = z.infer<typeof designPlanSchema>
