import { execa } from "execa";
import { CommandMode, ToolResult } from "../types";
import { logger, logCommandRun } from "../telemetry/logger";
import { db } from "../storage/supabase";

export interface CommandRunArgs {
  command: string;
  cwd?: string;
  timeoutMs?: number;
  mode?: CommandMode;
  taskId?: string;
  stepId?: string;
}

export async function runCommandTool(args: CommandRunArgs): Promise<ToolResult> {
  // Check if shell execution is allowed
  if (process.env.ALLOW_SHELL !== "1") {
    logger.warn({
      type: "command_blocked",
      reason: "ALLOW_SHELL not enabled",
      command: args.command
    });
    
    return {
      success: false,
      error: "Shell command execution is disabled. Set ALLOW_SHELL=1 to enable."
    };
  }

  const mode = args.mode || (process.env.COMMAND_MODE as CommandMode) || "SANDBOX";
  const timeoutMs = args.timeoutMs || 60000; // 60 seconds default
  const cwd = args.cwd || process.cwd();
  
  const startTime = Date.now();
  
  try {
    logger.info({
      type: "command_start",
      command: args.command,
      mode: mode,
      cwd: cwd,
      timeoutMs: timeoutMs,
      taskId: args.taskId,
      stepId: args.stepId
    });

    let result;
    
    if (mode === "SANDBOX") {
      // Run in Docker container for safety
      const dockerCommand = `docker run --rm -v "${cwd}:/work" -w /work alpine:3.20 sh -lc ${JSON.stringify(args.command)}`;
      
      result = await execa("sh", ["-lc", dockerCommand], {
        timeout: timeoutMs,
        cwd: process.cwd()
      });
    } else {
      // Run directly on host (dangerous!)
      logger.warn({
        type: "host_command_execution",
        command: args.command,
        cwd: cwd
      });
      
      result = await execa("sh", ["-lc", args.command], {
        cwd: cwd,
        timeout: timeoutMs
      });
    }

    const durationMs = Date.now() - startTime;
    
    const commandLog = {
      command: args.command,
      args: null,
      cwd: cwd,
      mode: mode,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: durationMs,
      taskId: args.taskId,
      stepId: args.stepId
    };

    // Log to database
    await db.commandRun.create({
      data: commandLog
    });

    // Log to structured logger
    logCommandRun(commandLog);

    logger.info({
      type: "command_success",
      command: args.command,
      exitCode: result.exitCode,
      durationMs: durationMs,
      taskId: args.taskId,
      stepId: args.stepId
    });

    return {
      success: result.exitCode === 0,
      data: {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: durationMs
      },
      error: result.exitCode !== 0 ? `Command failed with exit code ${result.exitCode}` : undefined
    };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    const commandLog = {
      command: args.command,
      args: null,
      cwd: cwd,
      mode: mode,
      exitCode: -1,
      stdout: null,
      stderr: error instanceof Error ? error.message : "Unknown error",
      durationMs: durationMs,
      taskId: args.taskId,
      stepId: args.stepId
    };

    // Log to database
    await db.commandRun.create({
      data: commandLog
    });

    // Log to structured logger
    logCommandRun(commandLog);

    logger.error({
      type: "command_error",
      command: args.command,
      error: error instanceof Error ? error.message : "Unknown error",
      durationMs: durationMs,
      taskId: args.taskId,
      stepId: args.stepId
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Helper function to validate command safety
export function validateCommand(command: string): { safe: boolean; reason?: string } {
  // Basic safety checks
  const dangerousPatterns = [
    /rm\s+-rf\s+\//, // rm -rf /
    /format\s+[a-z]:/i, // format C:
    /del\s+\/s\s+\/q\s+[a-z]:/i, // del /s /q C:
    /shutdown/i,
    /reboot/i,
    /halt/i,
    /poweroff/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return {
        safe: false,
        reason: "Command contains potentially dangerous operations"
      };
    }
  }

  return { safe: true };
}
