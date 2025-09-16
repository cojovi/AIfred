import { z } from "zod";
import { SlackClient } from "./client";
import { ToolFunction } from "../../types";
import { registerTool } from "../../executor/toolRegistry";

const client = new SlackClient();

// Tool schemas
const sendMessageSchema = z.object({
  channel: z.string().min(1),
  text: z.string().min(1)
});

const createChannelSchema = z.object({
  name: z.string().min(1),
  is_private: z.boolean().optional()
});

const inviteUsersSchema = z.object({
  channel: z.string().min(1),
  users: z.array(z.string().min(1))
});

const listChannelsSchema = z.object({
  types: z.string().optional(),
  exclude_archived: z.boolean().optional()
});

const getChannelSchema = z.object({
  channel: z.string().min(1)
});

// Tool functions
export const slackSendMessage: ToolFunction = async (args) => {
  const validatedArgs = sendMessageSchema.parse(args);
  return await client.sendMessage(validatedArgs);
};

export const slackCreateChannel: ToolFunction = async (args) => {
  const validatedArgs = createChannelSchema.parse(args);
  return await client.createChannel(validatedArgs);
};

export const slackInviteUsers: ToolFunction = async (args) => {
  const validatedArgs = inviteUsersSchema.parse(args);
  return await client.inviteUsers(validatedArgs);
};

export const slackListChannels: ToolFunction = async (args) => {
  const validatedArgs = listChannelsSchema.parse(args);
  return await client.listChannels(validatedArgs);
};

export const slackGetChannel: ToolFunction = async (args) => {
  const validatedArgs = getChannelSchema.parse(args);
  return await client.getChannel(validatedArgs);
};

// Export all tools
export const slackTools = {
  "slack.send_message": slackSendMessage,
  "slack.create_channel": slackCreateChannel,
  "slack.invite_users": slackInviteUsers,
  "slack.list_channels": slackListChannels,
  "slack.get_channel": slackGetChannel
};

// Register tools with the registry
registerTool("slack.send_message", slackSendMessage, sendMessageSchema);
registerTool("slack.create_channel", slackCreateChannel, createChannelSchema);
registerTool("slack.invite_users", slackInviteUsers, inviteUsersSchema);
registerTool("slack.list_channels", slackListChannels, listChannelsSchema);
registerTool("slack.get_channel", slackGetChannel, getChannelSchema);
