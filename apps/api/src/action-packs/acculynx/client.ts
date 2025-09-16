import { HttpClient } from "../../executor/httpClient";
import { ToolResult } from "../../types";

export class AccuLynxClient extends HttpClient {
  constructor() {
    super({
      baseUrl: "https://api.acculynx.com",
      apiKey: process.env.ACCULYNX_API_KEY,
      headers: {
        "Accept": "application/json"
      }
    });
  }

  async createLead(params: {
    contact_info: any;
    project_details: any;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.post(
        "/api/leads",
        {
          contact_info: params.contact_info,
          project_details: params.project_details
        },
        params.taskId,
        params.stepId
      );

      return {
        success: true,
        data: {
          lead_id: data.id || data.lead_id,
          contact_info: params.contact_info,
          project_details: params.project_details
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create lead"
      };
    }
  }

  async updateLead(params: {
    lead_id: string;
    updates: any;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.put(
        `/api/leads/${params.lead_id}`,
        params.updates,
        params.taskId,
        params.stepId
      );

      return {
        success: true,
        data: {
          lead_id: params.lead_id,
          updates: params.updates
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update lead"
      };
    }
  }

  async searchLeads(params: {
    name?: string;
    email?: string;
    phone?: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params.name) queryParams.name = params.name;
      if (params.email) queryParams.email = params.email;
      if (params.phone) queryParams.phone = params.phone;

      const data = await this.get("/api/leads", queryParams, params.taskId, params.stepId);
      
      const leads = data.leads || data || [];
      const candidates = leads.map((l: any) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        status: l.status
      }));

      if (candidates.length === 0) {
        return {
          success: true,
          data: { leads: [], message: "No leads found matching your criteria" }
        };
      }

      if (candidates.length === 1) {
        return {
          success: true,
          data: {
            lead_id: candidates[0].id,
            lead: candidates[0],
            candidates: candidates
          }
        };
      }

      // Multiple candidates - need disambiguation
      return {
        success: true,
        data: { candidates: candidates },
        disambiguation: {
          question: `I found ${candidates.length} leads. Which one did you mean?`,
          choices: candidates.map(c => ({
            id: c.id,
            label: `${c.name} - ${c.email}`,
            value: c
          }))
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search leads"
      };
    }
  }

  async getLead(params: {
    lead_id: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.get(
        `/api/leads/${params.lead_id}`,
        undefined,
        params.taskId,
        params.stepId
      );

      return {
        success: true,
        data: {
          lead_id: data.id || data.lead_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: data.status,
          project_details: data.project_details
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get lead"
      };
    }
  }

  async listLeads(params: {
    limit?: number;
    offset?: number;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params.limit) queryParams.limit = params.limit.toString();
      if (params.offset) queryParams.offset = params.offset.toString();

      const data = await this.get("/api/leads", queryParams, params.taskId, params.stepId);
      
      const leads = data.leads || data || [];

      return {
        success: true,
        data: {
          leads: leads.map((l: any) => ({
            id: l.id,
            name: l.name,
            email: l.email,
            phone: l.phone,
            status: l.status
          })),
          total: leads.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list leads"
      };
    }
  }
}
