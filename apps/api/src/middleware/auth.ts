import { FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../telemetry/logger";

export interface AuthenticatedRequest extends FastifyRequest {
  userId?: string;
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      logger.warn({
        type: "auth_missing",
        ip: request.ip,
        userAgent: request.headers["user-agent"]
      });
      
      return reply.status(401).send({
        error: "Authorization header required"
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      logger.warn({
        type: "auth_invalid_format",
        ip: request.ip,
        userAgent: request.headers["user-agent"]
      });
      
      return reply.status(401).send({
        error: "Invalid authorization format. Use 'Bearer <token>'"
      });
    }

    const token = authHeader.substring(7);
    const expectedToken = process.env.AUTH_DEV_TOKEN;

    if (!expectedToken) {
      logger.error({
        type: "auth_config_error",
        message: "AUTH_DEV_TOKEN not configured"
      });
      
      return reply.status(500).send({
        error: "Authentication not configured"
      });
    }

    if (token !== expectedToken) {
      logger.warn({
        type: "auth_invalid_token",
        ip: request.ip,
        userAgent: request.headers["user-agent"]
      });
      
      return reply.status(401).send({
        error: "Invalid token"
      });
    }

    // For now, we'll use a default user ID since we don't have real auth
    request.userId = "dev-user";
    
    logger.info({
      type: "auth_success",
      userId: request.userId,
      ip: request.ip
    });

  } catch (error) {
    logger.error({
      type: "auth_error",
      error: error instanceof Error ? error.message : "Unknown error",
      ip: request.ip
    });
    
    return reply.status(500).send({
      error: "Authentication error"
    });
  }
}

// Optional auth middleware for endpoints that don't require authentication
export async function optionalAuthMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const expectedToken = process.env.AUTH_DEV_TOKEN;
      
      if (expectedToken && token === expectedToken) {
        request.userId = "dev-user";
      }
    }
  } catch (error) {
    // Ignore auth errors for optional auth
    logger.debug({
      type: "optional_auth_error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
