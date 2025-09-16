import { TaskSpec, ServiceConfig, WorkflowStep, ToolResult, CommandMode } from "@multibot/shared";

// Re-export shared types
export type { TaskSpec, ServiceConfig, WorkflowStep, ToolResult, CommandMode };

// API-specific types
export interface RouteResult {
  service: string | null;
  confidence: number;
}

export interface PlanResult {
  taskSpec: TaskSpec | null;
  clarification: string | null;
}

export interface ExecutionContext {
  taskId: string;
  conversationId?: string;
  askUser: (question: string, choices?: any[]) => Promise<any>;
}

export interface ApiCallLog {
  service: string;
  method: string;
  url: string;
  request: any;
  response?: any;
  status?: number;
  latencyMs: number;
  taskId?: string;
  stepId?: string;
}

export interface CommandRunLog {
  command: string;
  args?: string;
  cwd?: string;
  mode: CommandMode;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  durationMs: number;
  taskId?: string;
  stepId?: string;
}

// Tool function signature
export type ToolFunction = (args: any) => Promise<ToolResult>;

// Workflow definition
export interface Workflow {
  [intent: string]: WorkflowStep[];
}

// Service action pack structure
export interface ActionPack {
  config: ServiceConfig;
  client: any;
  tools: Record<string, ToolFunction>;
  workflows: Workflow;
}
