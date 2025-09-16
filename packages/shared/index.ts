import { z } from "zod";

// Core TaskSpec schema for the planner
export const TaskSpec = z.object({
  service: z.enum(["companycam", "acculynx", "bolt", "slack"]),
  intent: z.string(), // e.g., "add_project_conversation"
  inputs: z.object({
    project_hint: z.object({
      name: z.string().optional(),
      address: z.string().optional()
    }).optional(),
    message: z.string().optional(),
    // generic bag for other services
    extra: z.record(z.any()).optional()
  })
});

export type TaskSpec = z.infer<typeof TaskSpec>;

// API Response types
export const ChatResponse = z.object({
  type: z.enum(["clarification", "plan", "result", "error"]),
  message: z.string().optional(),
  plan: TaskSpec.optional(),
  steps: z.array(z.object({
    action: z.string(),
    description: z.string(),
    args: z.record(z.any())
  })).optional(),
  result: z.record(z.any()).optional(),
  disambiguation: z.object({
    question: z.string(),
    choices: z.array(z.object({
      id: z.string(),
      label: z.string(),
      value: z.any()
    }))
  }).optional(),
  taskId: z.string().optional()
});

export type ChatResponse = z.infer<typeof ChatResponse>;

// Service configuration
export const ServiceConfig = z.object({
  service: z.string(),
  openapiRef: z.string(),
  enabled: z.boolean(),
  synonyms: z.array(z.string()),
  operations: z.record(z.object({
    summary: z.string(),
    method: z.string(),
    path: z.string(),
    query: z.array(z.string()).optional(),
    body: z.array(z.string()).optional()
  }))
});

export type ServiceConfig = z.infer<typeof ServiceConfig>;

// Workflow step definition
export const WorkflowStep = z.object({
  action: z.string(),
  bind: z.record(z.string()),
  out: z.string().optional()
});

export type WorkflowStep = z.infer<typeof WorkflowStep>;

// Tool execution result
export const ToolResult = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  candidates: z.array(z.any()).optional(),
  disambiguation: z.object({
    question: z.string(),
    choices: z.array(z.any())
  }).optional()
});

export type ToolResult = z.infer<typeof ToolResult>;

// Command execution modes
export const CommandMode = z.enum(["SANDBOX", "HOST"]);
export type CommandMode = z.infer<typeof CommandMode>;

// Constants
export const SERVICES = ["companycam", "acculynx", "bolt", "slack"] as const;
export const TASK_STATUSES = ["planned", "awaiting_user", "executing", "done", "error"] as const;
export const STEP_STATUSES = ["pending", "running", "done", "error"] as const;
export const MESSAGE_ROLES = ["user", "assistant", "system"] as const;

export type Service = typeof SERVICES[number];
export type TaskStatus = typeof TASK_STATUSES[number];
export type StepStatus = typeof STEP_STATUSES[number];
export type MessageRole = typeof MESSAGE_ROLES[number];
