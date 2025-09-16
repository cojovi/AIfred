import { z } from "zod";
import { ToolFunction, ToolResult } from "../types";
import { runCommandTool } from "./commandRunner";

// Tool registry - maps action names to tool functions
export const tools: Record<string, ToolFunction> = {
  "system.run_command": runCommandTool
};

// Tool schemas for validation
export const toolSchemas: Record<string, z.ZodSchema> = {
  "system.run_command": z.object({
    command: z.string().min(1),
    cwd: z.string().optional(),
    timeoutMs: z.number().int().positive().max(300000).optional(),
    mode: z.enum(["SANDBOX", "HOST"]).optional()
  })
};

// Register a tool with validation
export function registerTool(name: string, tool: ToolFunction, schema: z.ZodSchema): void {
  tools[name] = tool;
  toolSchemas[name] = schema;
}

// Execute a tool with validation
export async function executeTool(
  action: string,
  args: any,
  taskId?: string,
  stepId?: string
): Promise<ToolResult> {
  const tool = tools[action];
  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${action}`
    };
  }

  const schema = toolSchemas[action];
  if (schema) {
    try {
      const validatedArgs = schema.parse(args);
      return await tool({ ...validatedArgs, taskId, stepId });
    } catch (error) {
      return {
        success: false,
        error: `Invalid arguments for ${action}: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  return await tool({ ...args, taskId, stepId });
}

// Get all registered tool names
export function getRegisteredTools(): string[] {
  return Object.keys(tools);
}

// Check if a tool is registered
export function isToolRegistered(name: string): boolean {
  return name in tools;
}
