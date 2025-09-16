import fetch from "node-fetch";
import { logger, logApiCall } from "../telemetry/logger";
import { db } from "../storage/supabase";
import { ApiCallLog } from "../types";

export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export class HttpClient {
  private config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config
    };
  }

  async request<T = any>(
    method: string,
    path: string,
    body?: any,
    queryParams?: Record<string, string>,
    taskId?: string,
    stepId?: string
  ): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    
    // Add query parameters
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value);
        }
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers
    };

    // Add API key if provided
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const requestBody = body ? JSON.stringify(body) : undefined;
    const startTime = Date.now();

    try {
      logger.info({
        type: "http_request_start",
        method: method,
        url: url.toString(),
        service: this.extractServiceFromUrl(url.toString()),
        taskId: taskId,
        stepId: stepId
      });

      const response = await fetch(url.toString(), {
        method: method,
        headers: headers,
        body: requestBody,
        timeout: this.config.timeout
      });

      const responseText = await response.text();
      let responseData: any;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const latencyMs = Date.now() - startTime;

      const apiCallLog: ApiCallLog = {
        service: this.extractServiceFromUrl(url.toString()),
        method: method,
        url: url.toString(),
        request: { body, queryParams },
        response: responseData,
        status: response.status,
        latencyMs: latencyMs,
        taskId: taskId,
        stepId: stepId
      };

      // Log to database
      await db.apiCall.create({
        data: apiCallLog
      });

      // Log to structured logger
      logApiCall(apiCallLog);

      if (!response.ok) {
        logger.error({
          type: "http_request_error",
          method: method,
          url: url.toString(),
          status: response.status,
          response: responseData,
          latencyMs: latencyMs,
          taskId: taskId,
          stepId: stepId
        });

        throw new Error(`HTTP ${response.status}: ${JSON.stringify(responseData)}`);
      }

      logger.info({
        type: "http_request_success",
        method: method,
        url: url.toString(),
        status: response.status,
        latencyMs: latencyMs,
        taskId: taskId,
        stepId: stepId
      });

      return responseData as T;

    } catch (error) {
      const latencyMs = Date.now() - startTime;

      const apiCallLog: ApiCallLog = {
        service: this.extractServiceFromUrl(url.toString()),
        method: method,
        url: url.toString(),
        request: { body, queryParams },
        response: null,
        status: null,
        latencyMs: latencyMs,
        taskId: taskId,
        stepId: stepId
      };

      // Log to database
      await db.apiCall.create({
        data: apiCallLog
      });

      // Log to structured logger
      logApiCall(apiCallLog);

      logger.error({
        type: "http_request_exception",
        method: method,
        url: url.toString(),
        error: error instanceof Error ? error.message : "Unknown error",
        latencyMs: latencyMs,
        taskId: taskId,
        stepId: stepId
      });

      throw error;
    }
  }

  async get<T = any>(
    path: string,
    queryParams?: Record<string, string>,
    taskId?: string,
    stepId?: string
  ): Promise<T> {
    return this.request<T>("GET", path, undefined, queryParams, taskId, stepId);
  }

  async post<T = any>(
    path: string,
    body?: any,
    taskId?: string,
    stepId?: string
  ): Promise<T> {
    return this.request<T>("POST", path, body, undefined, taskId, stepId);
  }

  async put<T = any>(
    path: string,
    body?: any,
    taskId?: string,
    stepId?: string
  ): Promise<T> {
    return this.request<T>("PUT", path, body, undefined, taskId, stepId);
  }

  async delete<T = any>(
    path: string,
    taskId?: string,
    stepId?: string
  ): Promise<T> {
    return this.request<T>("DELETE", path, undefined, undefined, taskId, stepId);
  }

  private extractServiceFromUrl(url: string): string {
    // Extract service name from URL for logging
    if (url.includes("companycam")) return "companycam";
    if (url.includes("acculynx")) return "acculynx";
    if (url.includes("bolt")) return "bolt";
    if (url.includes("slack")) return "slack";
    return "unknown";
  }
}
