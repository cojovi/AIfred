import OpenAI from "openai";
import { TaskSpec, PlannerRequest, PlannerResponse, EmitTaskSpecFunction } from "./schemas";
import { buildPrompt } from "./prompts";
import { logger } from "../telemetry/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function planTask(request: PlannerRequest): Promise<PlannerResponse> {
  try {
    const prompt = buildPrompt(request.userText, request.serviceHint);
    
    logger.info({
      type: "planner_request",
      userText: request.userText,
      serviceHint: request.serviceHint,
      conversationId: request.conversationId
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a task planner. Analyze the user request and either provide a structured TaskSpec or ask for clarification. Always use the emit_task_spec function when you have enough information."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      tools: [EmitTaskSpecFunction],
      tool_choice: "auto",
      temperature: 0.1
    });

    const message = completion.choices[0]?.message;
    
    if (!message) {
      throw new Error("No response from OpenAI");
    }

    // Check if the model wants to use the function
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      
      if (toolCall.function.name === "emit_task_spec") {
        try {
          const taskSpec = JSON.parse(toolCall.function.arguments) as TaskSpec;
          
          // Validate the task spec
          const validatedTaskSpec = TaskSpec.parse(taskSpec);
          
          logger.info({
            type: "planner_success",
            taskSpec: validatedTaskSpec,
            conversationId: request.conversationId
          });

          return {
            taskSpec: validatedTaskSpec,
            clarification: null,
            confidence: 0.95
          };
        } catch (error) {
          logger.error({
            type: "planner_validation_error",
            error: error instanceof Error ? error.message : "Unknown error",
            rawTaskSpec: toolCall.function.arguments
          });

          return {
            taskSpec: null,
            clarification: "I encountered an error processing your request. Could you please rephrase it?",
            confidence: 0.0
          };
        }
      }
    }

    // If no tool call, treat as clarification request
    const clarification = message.content || "I need more information to help you. Could you please provide more details?";
    
    logger.info({
      type: "planner_clarification",
      clarification: clarification,
      conversationId: request.conversationId
    });

    return {
      taskSpec: null,
      clarification: clarification,
      confidence: 0.8
    };

  } catch (error) {
    logger.error({
      type: "planner_error",
      error: error instanceof Error ? error.message : "Unknown error",
      userText: request.userText,
      conversationId: request.conversationId
    });

    return {
      taskSpec: null,
      clarification: "I'm having trouble processing your request right now. Please try again.",
      confidence: 0.0
    };
  }
}

// Helper function to validate task spec against available services
export async function validateTaskSpec(taskSpec: TaskSpec): Promise<boolean> {
  // This would check against the database to ensure the service is enabled
  // and the intent is valid for that service
  // For now, we'll do basic validation
  
  const validServices = ["companycam", "acculynx", "bolt", "slack"];
  
  if (!validServices.includes(taskSpec.service)) {
    return false;
  }
  
  if (!taskSpec.intent || taskSpec.intent.length === 0) {
    return false;
  }
  
  return true;
}
