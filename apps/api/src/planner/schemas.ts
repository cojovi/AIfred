import { z } from "zod";
import { TaskSpec } from "@multibot/shared";

// Re-export the main TaskSpec
export { TaskSpec };

// Planner-specific schemas
export const PlannerRequest = z.object({
  userText: z.string().min(1),
  serviceHint: z.string().optional(),
  conversationId: z.string().optional()
});

export const PlannerResponse = z.object({
  taskSpec: TaskSpec.nullable(),
  clarification: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});

export type PlannerRequest = z.infer<typeof PlannerRequest>;
export type PlannerResponse = z.infer<typeof PlannerResponse>;

// OpenAI function calling schema for task specification
export const EmitTaskSpecFunction = {
  type: "function" as const,
  function: {
    name: "emit_task_spec",
    description: "Emit a structured task specification for execution",
    parameters: TaskSpec
  }
};

// Clarification response schema
export const ClarificationResponse = z.object({
  type: z.literal("clarification"),
  question: z.string(),
  context: z.string().optional()
});

export type ClarificationResponse = z.infer<typeof ClarificationResponse>;
