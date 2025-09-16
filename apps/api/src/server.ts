import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { logger } from "./telemetry/logger";
import { errorHandler, validationErrorHandler, notFoundHandler } from "./middleware/error";
import { authMiddleware, optionalAuthMiddleware } from "./middleware/auth";
import { AuthenticatedRequest } from "./middleware/auth";
import { routeService } from "./router/serviceRouter";
import { planTask } from "./planner/planner";
import { executeTask } from "./executor";
import { db } from "./storage/supabase";
import { ChatResponse } from "@multibot/shared";

const fastify = Fastify({
  logger: false, // We're using our own logger
  trustProxy: true
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.NODE_ENV === "development" ? true : false,
  credentials: true
});

await fastify.register(helmet, {
  contentSecurityPolicy: false // Disable for development
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute"
});

// Error handlers
fastify.setErrorHandler(errorHandler);
fastify.setNotFoundHandler(notFoundHandler);

// Health check endpoint
fastify.get("/health", async (request, reply) => {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    };
  } catch (error) {
    logger.error({
      type: "health_check_failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
    
    reply.status(503);
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Database connection failed"
    };
  }
});

// Chat endpoint - main entry point
fastify.post<{
  Body: {
    conversationId?: string;
    message: string;
  }
}>("/api/chat", {
  preHandler: [authMiddleware]
}, async (request: AuthenticatedRequest, reply) => {
  try {
    const { conversationId, message } = request.body;

    logger.info({
      type: "chat_request",
      conversationId: conversationId,
      message: message,
      userId: request.userId
    });

    // Create or get conversation
    let conversation;
    if (conversationId) {
      conversation = await db.conversation.findUnique({
        where: { id: conversationId }
      });
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          title: message.substring(0, 100)
        }
      });
    }

    // Save user message
    await db.message.create({
      data: {
        role: "user",
        content: message,
        conversationId: conversation.id
      }
    });

    // Route to appropriate service
    const routeResult = await routeService(message);
    
    if (!routeResult.service) {
      // No service identified - ask for clarification
      const response: ChatResponse = {
        type: "clarification",
        message: "I'm not sure which service you'd like to use. Please specify: CompanyCam, AccuLynx, Bolt, or Slack."
      };

      await db.message.create({
        data: {
          role: "assistant",
          content: response.message,
          conversationId: conversation.id
        }
      });

      return response;
    }

    // Plan the task
    const planResult = await planTask({
      userText: message,
      serviceHint: routeResult.service,
      conversationId: conversation.id
    });

    if (planResult.clarification) {
      // Need clarification
      const response: ChatResponse = {
        type: "clarification",
        message: planResult.clarification
      };

      await db.message.create({
        data: {
          role: "assistant",
          content: planResult.clarification,
          conversationId: conversation.id
        }
      });

      return response;
    }

    if (!planResult.taskSpec) {
      throw new Error("Failed to create task specification");
    }

    // Create task record
    const task = await db.task.create({
      data: {
        service: planResult.taskSpec.service,
        intent: planResult.taskSpec.intent,
        inputs: planResult.taskSpec.inputs,
        status: "planned",
        conversationId: conversation.id
      }
    });

    // Generate step descriptions for plan preview
    const steps = [
      {
        action: `${planResult.taskSpec.service}.${planResult.taskSpec.intent}`,
        description: `Execute ${planResult.taskSpec.intent} in ${planResult.taskSpec.service}`,
        args: planResult.taskSpec.inputs
      }
    ];

    const response: ChatResponse = {
      type: "plan",
      plan: planResult.taskSpec,
      steps: steps,
      taskId: task.id
    };

    await db.message.create({
      data: {
        role: "assistant",
        content: `I'll help you with ${planResult.taskSpec.intent} in ${planResult.taskSpec.service}. Please confirm to proceed.`,
        conversationId: conversation.id
      }
    });

    return response;

  } catch (error) {
    logger.error({
      type: "chat_error",
      error: error instanceof Error ? error.message : "Unknown error",
      conversationId: request.body.conversationId,
      userId: request.userId
    });

    const response: ChatResponse = {
      type: "error",
      message: "I encountered an error processing your request. Please try again."
    };

    return response;
  }
});

// Execute endpoint
fastify.post<{
  Body: {
    taskId: string;
    confirm: boolean;
    disambiguation?: {
      choiceId: string;
    };
  }
}>("/api/execute", {
  preHandler: [authMiddleware]
}, async (request: AuthenticatedRequest, reply) => {
  try {
    const { taskId, confirm, disambiguation } = request.body;

    if (!confirm) {
      return reply.status(400).send({
        error: "Confirmation required to execute task"
      });
    }

    // Get task
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { conversation: true }
    });

    if (!task) {
      return reply.status(404).send({
        error: "Task not found"
      });
    }

    if (task.status !== "planned" && task.status !== "awaiting_user") {
      return reply.status(400).send({
        error: `Task is in ${task.status} status and cannot be executed`
      });
    }

    // Create execution context
    const context = {
      taskId: task.id,
      conversationId: task.conversationId,
      askUser: async (question: string, choices?: any[]) => {
        // For now, we'll store the disambiguation in the task result
        // In a real implementation, this would be handled by the UI
        await db.task.update({
          where: { id: task.id },
          data: {
            status: "awaiting_user",
            result: { disambiguation: { question, choices } }
          }
        });
        
        // Return the disambiguation choice if provided
        if (disambiguation) {
          return choices?.find(c => c.id === disambiguation.choiceId)?.value;
        }
        
        throw new Error("Disambiguation required");
      }
    };

    // Execute the task
    const result = await executeTask(task as any, context);

    const response: ChatResponse = {
      type: "result",
      result: result
    };

    // Save assistant response
    if (task.conversationId) {
      await db.message.create({
        data: {
          role: "assistant",
          content: result.success ? "Task completed successfully!" : `Task failed: ${result.error}`,
          conversationId: task.conversationId
        }
      });
    }

    return response;

  } catch (error) {
    logger.error({
      type: "execute_error",
      error: error instanceof Error ? error.message : "Unknown error",
      taskId: request.body.taskId,
      userId: request.userId
    });

    const response: ChatResponse = {
      type: "error",
      message: "I encountered an error executing the task. Please try again."
    };

    return response;
  }
});

// Get conversations
fastify.get("/api/conversations", {
  preHandler: [authMiddleware]
}, async (request: AuthenticatedRequest, reply) => {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 10
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    return { conversations };

  } catch (error) {
    logger.error({
      type: "conversations_error",
      error: error instanceof Error ? error.message : "Unknown error",
      userId: request.userId
    });

    return reply.status(500).send({
      error: "Failed to fetch conversations"
    });
  }
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "8080");
    const host = process.env.HOST || "0.0.0.0";
    
    await fastify.listen({ port, host });
    
    logger.info({
      type: "server_started",
      port: port,
      host: host,
      environment: process.env.NODE_ENV || "development"
    });
    
  } catch (error) {
    logger.error({
      type: "server_start_error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
    
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info({ type: "server_shutdown_start" });
  
  try {
    await fastify.close();
    await db.$disconnect();
    
    logger.info({ type: "server_shutdown_complete" });
    process.exit(0);
  } catch (error) {
    logger.error({
      type: "server_shutdown_error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
    process.exit(1);
  }
});

start();
