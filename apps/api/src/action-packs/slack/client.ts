import { HttpClient } from "../../executor/httpClient";
import { ToolResult } from "../../types";

export class SlackClient extends HttpClient {
  constructor() {
    super({
      baseUrl: "https://slack.com/api",
      apiKey: process.env.SLACK_BOT_TOKEN,
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    });
  }

  async sendMessage(params: {
    channel: string;
    text: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.post(
        "/chat.postMessage",
        {
          channel: params.channel,
          text: params.text
        },
        params.taskId,
        params.stepId
      );

      if (!data.ok) {
        return {
          success: false,
          error: data.error || "Failed to send message"
        };
      }

      return {
        success: true,
        data: {
          message_id: data.ts,
          channel: params.channel,
          text: params.text,
          timestamp: data.ts
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send message"
      };
    }
  }

  async createChannel(params: {
    name: string;
    is_private?: boolean;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.post(
        "/conversations.create",
        {
          name: params.name,
          is_private: params.is_private || false
        },
        params.taskId,
        params.stepId
      );

      if (!data.ok) {
        return {
          success: false,
          error: data.error || "Failed to create channel"
        };
      }

      return {
        success: true,
        data: {
          channel_id: data.channel.id,
          channel_name: data.channel.name,
          is_private: data.channel.is_private
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create channel"
      };
    }
  }

  async inviteUsers(params: {
    channel: string;
    users: string[];
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.post(
        "/conversations.invite",
        {
          channel: params.channel,
          users: params.users.join(",")
        },
        params.taskId,
        params.stepId
      );

      if (!data.ok) {
        return {
          success: false,
          error: data.error || "Failed to invite users"
        };
      }

      return {
        success: true,
        data: {
          channel: params.channel,
          users: params.users,
          invited_count: data.channel.num_members
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to invite users"
      };
    }
  }

  async listChannels(params: {
    types?: string;
    exclude_archived?: boolean;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params.types) queryParams.types = params.types;
      if (params.exclude_archived !== undefined) {
        queryParams.exclude_archived = params.exclude_archived.toString();
      }

      const data = await this.get("/conversations.list", queryParams, params.taskId, params.stepId);

      if (!data.ok) {
        return {
          success: false,
          error: data.error || "Failed to list channels"
        };
      }

      const channels = data.channels || [];
      const channelList = channels.map((c: any) => ({
        id: c.id,
        name: c.name,
        is_private: c.is_private,
        is_archived: c.is_archived,
        num_members: c.num_members
      }));

      return {
        success: true,
        data: {
          channels: channelList,
          total: channelList.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list channels"
      };
    }
  }

  async getChannel(params: {
    channel: string;
    taskId?: string;
    stepId?: string;
  }): Promise<ToolResult> {
    try {
      const data = await this.get(
        "/conversations.info",
        { channel: params.channel },
        params.taskId,
        params.stepId
      );

      if (!data.ok) {
        return {
          success: false,
          error: data.error || "Failed to get channel info"
        };
      }

      const channel = data.channel;

      return {
        success: true,
        data: {
          channel_id: channel.id,
          channel_name: channel.name,
          is_private: channel.is_private,
          is_archived: channel.is_archived,
          num_members: channel.num_members,
          topic: channel.topic?.value,
          purpose: channel.purpose?.value
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get channel info"
      };
    }
  }
}
