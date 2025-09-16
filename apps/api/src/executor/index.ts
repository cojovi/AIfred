import { TaskSpec, ExecutionContext, ToolResult, WorkflowStep } from "../types";
import { executeTool } from "./toolRegistry";
import { logger, logTaskExecution } from "../telemetry/logger";
import { db } from "../storage/supabase";
import { allWorkflows } from "./workflows";

export async function executeTask(
  taskSpec: TaskSpec,
  context: ExecutionContext
): Promise<ToolResult> {
  try {
    logger.info({
      type: "task_execution_start",
      taskId: context.taskId,
      taskSpec: taskSpec
    });

    // Update task status to executing
    await db.task.update({
      where: { id: context.taskId },
      data: { status: "executing" }
    });

    // Get workflow for this service and intent
    const serviceWorkflows = allWorkflows[taskSpec.service];
    if (!serviceWorkflows) {
      throw new Error(`No workflows found for service: ${taskSpec.service}`);
    }

    const workflow = serviceWorkflows[taskSpec.intent];
    if (!workflow) {
      throw new Error(`No workflow found for intent: ${taskSpec.intent} in service: ${taskSpec.service}`);
    }

    let previousResults: Record<string, any> = {};
    const stepResults: any[] = [];

    // Execute each step in the workflow
    for (let i = 0; i < workflow.length; i++) {
      const step = workflow[i];
      
      // Create step record
      const stepRecord = await db.step.create({
        data: {
          taskId: context.taskId,
          index: i,
          action: step.action,
          args: bindArguments(step.bind, taskSpec, previousResults),
          status: "running"
        }
      });

      try {
        // Bind arguments for this step
        const args = bindArguments(step.bind, taskSpec, previousResults);
        
        logger.info({
          type: "step_execution_start",
          taskId: context.taskId,
          stepId: stepRecord.id,
          action: step.action,
          args: args
        });

        // Execute the tool
        const result = await executeTool(step.action, args, context.taskId, stepRecord.id);

        // Update step record
        await db.step.update({
          where: { id: stepRecord.id },
          data: {
            output: result,
            status: result.success ? "done" : "error"
          }
        });

        stepResults.push(result);

        if (!result.success) {
          throw new Error(result.error || "Step execution failed");
        }

        // Check for disambiguation
        if (result.disambiguation) {
          logger.info({
            type: "disambiguation_required",
            taskId: context.taskId,
            stepId: stepRecord.id,
            question: result.disambiguation.question
          });

          // Update task status to awaiting user
          await db.task.update({
            where: { id: context.taskId },
            data: { status: "awaiting_user" }
          });

          // Ask user for disambiguation
          const userChoice = await context.askUser(
            result.disambiguation.question,
            result.disambiguation.choices
          );

          // Continue with user's choice
          previousResults[step.out || "choice"] = userChoice;
        } else {
          // Store result for next step
          if (step.out) {
            previousResults[step.out] = result.data;
          }
        }

        logger.info({
          type: "step_execution_success",
          taskId: context.taskId,
          stepId: stepRecord.id,
          action: step.action
        });

      } catch (error) {
        // Update step record with error
        await db.step.update({
          where: { id: stepRecord.id },
          data: {
            output: { error: error instanceof Error ? error.message : "Unknown error" },
            status: "error"
          }
        });

        logger.error({
          type: "step_execution_error",
          taskId: context.taskId,
          stepId: stepRecord.id,
          action: step.action,
          error: error instanceof Error ? error.message : "Unknown error"
        });

        // Update task status to error
        await db.task.update({
          where: { id: context.taskId },
          data: { status: "error" }
        });

        throw error;
      }
    }

    // Task completed successfully
    const finalResult = stepResults[stepResults.length - 1];
    
    await db.task.update({
      where: { id: context.taskId },
      data: {
        status: "done",
        result: finalResult
      }
    });

    logTaskExecution({
      taskId: context.taskId,
      status: "completed",
      result: finalResult
    });

    logger.info({
      type: "task_execution_success",
      taskId: context.taskId,
      result: finalResult
    });

    return finalResult;

  } catch (error) {
    // Update task status to error
    await db.task.update({
      where: { id: context.taskId },
      data: {
        status: "error",
        result: { error: error instanceof Error ? error.message : "Unknown error" }
      }
    });

    logTaskExecution({
      taskId: context.taskId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });

    logger.error({
      type: "task_execution_error",
      taskId: context.taskId,
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Helper function to bind arguments from task spec and previous results
function bindArguments(
  bind: Record<string, string>,
  taskSpec: TaskSpec,
  previousResults: Record<string, any>
): Record<string, any> {
  const args: Record<string, any> = {};

  for (const [key, path] of Object.entries(bind)) {
    if (path.startsWith("$prev.")) {
      // Reference to previous step result
      const prevKey = path.substring(6);
      args[key] = previousResults[prevKey];
    } else if (path.startsWith("inputs.")) {
      // Reference to task spec inputs
      const inputPath = path.substring(7);
      args[key] = getNestedValue(taskSpec.inputs, inputPath);
    } else {
      // Direct value
      args[key] = path;
    }
  }

  return args;
}

// Helper function to get nested object values by dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Get available workflows for a service
export function getWorkflowsForService(service: string): Record<string, WorkflowStep[]> {
  return allWorkflows[service] || {};
}

// Get all available workflows
export function getAllWorkflows(): Record<string, Record<string, WorkflowStep[]>> {
  return allWorkflows;
}