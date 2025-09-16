import { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../telemetry/logger";

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Log the error
  logger.error({
    type: "http_error",
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers["user-agent"]
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === "development";
  
  const response: any = {
    error: error.message || "Internal Server Error",
    statusCode: error.statusCode || 500
  };

  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  reply.status(error.statusCode || 500).send(response);
}

// Validation error handler
export function validationErrorHandler(
  error: any,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  logger.warn({
    type: "validation_error",
    error: error.message,
    method: request.method,
    url: request.url,
    body: request.body,
    ip: request.ip
  });

  reply.status(400).send({
    error: "Validation Error",
    message: error.message,
    statusCode: 400
  });
}

// Not found handler
export function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  logger.warn({
    type: "not_found",
    method: request.method,
    url: request.url,
    ip: request.ip
  });

  reply.status(404).send({
    error: "Not Found",
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: 404
  });
}
