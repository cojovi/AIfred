import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  transport: isDevelopment ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname"
    }
  } : undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.secret",
      "*.key",
      "*.api_key",
      "*.apiKey"
    ],
    censor: "[REDACTED]"
  }
});

// Helper function to redact sensitive data from strings
export function redactSecrets(text: string): string {
  const patterns = [
    /Bearer\s+[A-Za-z0-9\-\._]+/g,
    /[A-Za-z0-9\-\._]{20,}/g, // Generic long tokens
    /password["\s]*[:=]["\s]*[^"\s,}]+/gi,
    /token["\s]*[:=]["\s]*[^"\s,}]+/gi,
    /key["\s]*[:=]["\s]*[^"\s,}]+/gi
  ];

  let redacted = text;
  patterns.forEach(pattern => {
    redacted = redacted.replace(pattern, "[REDACTED]");
  });

  return redacted;
}

// Structured logging helpers
export const logApiCall = (data: any) => {
  logger.info({
    type: "api_call",
    ...data,
    request: redactSecrets(JSON.stringify(data.request)),
    response: data.response ? redactSecrets(JSON.stringify(data.response)) : undefined
  });
};

export const logCommandRun = (data: any) => {
  logger.info({
    type: "command_run",
    ...data,
    stdout: data.stdout ? redactSecrets(data.stdout) : undefined,
    stderr: data.stderr ? redactSecrets(data.stderr) : undefined
  });
};

export const logTaskExecution = (data: any) => {
  logger.info({
    type: "task_execution",
    ...data
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error({
    type: "error",
    message: error.message,
    stack: error.stack,
    ...context
  });
};
