import { HttpClient } from "../../executor/httpClient";
import { ToolResult } from "../../types";

export class BoltClient extends HttpClient {
  constructor() {
    super({
      baseUrl: "https://api.bolt.com",
      apiKey: process.env.BOLT_API_KEY,
      headers: {
        "Accept": "application/json"
      }
    });
  }

  async createEstimate(params: {
    project_details: any;
    line_items: any[];
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.post(
        "/api/estimates",
        {
          project_details: params.project_details,
          line_items: params.line_items
        },
        params.taskId,
        params.stepId
      );

      return {
        success: true,
        data: {
          estimate_id: data.id || data.estimate_id,
          project_details: params.project_details,
          line_items: params.line_items,
          total: data.total
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create estimate"
      };
    }
  }

  async updateEstimate(params: {
    estimate_id: string;
    updates: any;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.put(
        `/api/estimates/${params.estimate_id}`,
        params.updates,
        params.taskId,
        params.stepId
      );

      return {
        success: true,
        data: {
          estimate_id: params.estimate_id,
          updates: params.updates
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update estimate"
      };
    }
  }

  async searchEstimates(params: {
    project_name?: string;
    customer_name?: string;
    status?: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params.project_name) queryParams.project_name = params.project_name;
      if (params.customer_name) queryParams.customer_name = params.customer_name;
      if (params.status) queryParams.status = params.status;

      const data = await this.get("/api/estimates", queryParams, params.taskId, params.stepId);
      
      const estimates = data.estimates || data || [];
      const candidates = estimates.map((e: any) => ({
        id: e.id,
        project_name: e.project_name,
        customer_name: e.customer_name,
        status: e.status,
        total: e.total
      }));

      if (candidates.length === 0) {
        return {
          success: true,
          data: { estimates: [], message: "No estimates found matching your criteria" }
        };
      }

      if (candidates.length === 1) {
        return {
          success: true,
          data: {
            estimate_id: candidates[0].id,
            estimate: candidates[0],
            candidates: candidates
          }
        };
      }

      // Multiple candidates - need disambiguation
      return {
        success: true,
        data: { candidates: candidates },
        disambiguation: {
          question: `I found ${candidates.length} estimates. Which one did you mean?`,
          choices: candidates.map(c => ({
            id: c.id,
            label: `${c.project_name} - ${c.customer_name} (${c.status})`,
            value: c
          }))
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search estimates"
      };
    }
  }

  async getEstimate(params: {
    estimate_id: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.get(
        `/api/estimates/${params.estimate_id}`,
        undefined,
        params.taskId,
        params.stepId
      );

      return {
        success: true,
        data: {
          estimate_id: data.id || data.estimate_id,
          project_name: data.project_name,
          customer_name: data.customer_name,
          status: data.status,
          total: data.total,
          line_items: data.line_items
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get estimate"
      };
    }
  }

  async listEstimates(params: {
    limit?: number;
    offset?: number;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params.limit) queryParams.limit = params.limit.toString();
      if (params.offset) queryParams.offset = params.offset.toString();

      const data = await this.get("/api/estimates", queryParams, params.taskId, params.stepId);
      
      const estimates = data.estimates || data || [];

      return {
        success: true,
        data: {
          estimates: estimates.map((e: any) => ({
            id: e.id,
            project_name: e.project_name,
            customer_name: e.customer_name,
            status: e.status,
            total: e.total
          })),
          total: estimates.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list estimates"
      };
    }
  }
}
