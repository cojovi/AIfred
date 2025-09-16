import { HttpClient } from "../../executor/httpClient";
import { ToolResult } from "../../types";

export class CompanyCamClient extends HttpClient {
  constructor() {
    super({
      baseUrl: "https://api.companycam.com",
      apiKey: process.env.COMPANYCAM_API_KEY,
      headers: {
        "Accept": "application/json"
      }
    });
  }

  async searchProjects(params: {
    name?: string;
    address?: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params.name) queryParams.name = params.name;
      if (params.address) queryParams.address = params.address;

      const data = await this.get("/v1/projects", queryParams, params.taskId, params.stepId);
      
      const projects = data.projects || data || [];
      const candidates = projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        description: p.description
      }));

      if (candidates.length === 0) {
        return {
          success: true,
          data: { projects: [], message: "No projects found matching your criteria" }
        };
      }

      if (candidates.length === 1) {
        return {
          success: true,
          data: {
            project_id: candidates[0].id,
            project: candidates[0],
            candidates: candidates
          }
        };
      }

      // Multiple candidates - need disambiguation
      return {
        success: true,
        data: { candidates: candidates },
        disambiguation: {
          question: `I found ${candidates.length} projects. Which one did you mean?`,
          choices: candidates.map(c => ({
            id: c.id,
            label: `${c.name} - ${c.address}`,
            value: c
          }))
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search projects"
      };
    }
  }

  async createProjectConversation(params: {
    project_id: string;
    message: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.post(
        `/v1/projects/${params.project_id}/conversations`,
        { message: params.message },
        params.taskId,
        params.stepId
      );

      return {
        success: true,
        data: {
          conversation_id: data.id || data.conversation_id,
          message: params.message,
          project_id: params.project_id
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create project conversation"
      };
    }
  }

  async createProject(params: {
    name: string;
    address: string;
    description?: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.post(
        "/v1/projects",
        {
          name: params.name,
          address: params.address,
          description: params.description
        },
        params.taskId,
        params.stepId
      );

      return {
        success: true,
        data: {
          project_id: data.id || data.project_id,
          name: params.name,
          address: params.address,
          description: params.description
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create project"
      };
    }
  }

  async getProject(params: {
    project_id: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.get(
        `/v1/projects/${params.project_id}`,
        undefined,
        params.taskId,
        params.stepId
      );

      return {
        success: true,
        data: {
          project_id: data.id || data.project_id,
          name: data.name,
          address: data.address,
          description: data.description,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get project"
      };
    }
  }

  async listProjects(params: {
    limit?: number;
    offset?: number;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params.limit) queryParams.limit = params.limit.toString();
      if (params.offset) queryParams.offset = params.offset.toString();

      const data = await this.get("/v1/projects", queryParams, params.taskId, params.stepId);
      
      const projects = data.projects || data || [];

      return {
        success: true,
        data: {
          projects: projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            address: p.address,
            description: p.description
          })),
          total: projects.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list projects"
      };
    }
  }
}
