import { z } from "zod";
import { CompanyCamClient } from "./client";
import { ToolFunction } from "../../types";
import { registerTool } from "../../executor/toolRegistry";

const client = new CompanyCamClient();

// Tool schemas
const searchProjectSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional()
});

const createProjectConversationSchema = z.object({
  project_id: z.string().min(1),
  message: z.string().min(1)
});

const createProjectSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  description: z.string().optional()
});

const getProjectSchema = z.object({
  project_id: z.string().min(1)
});

const listProjectsSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional()
});

// Tool functions
export const companycamSearchProject: ToolFunction = async (args) => {
  const validatedArgs = searchProjectSchema.parse(args);
  return await client.searchProjects(validatedArgs);
};

export const companycamCreateProjectConversation: ToolFunction = async (args) => {
  const validatedArgs = createProjectConversationSchema.parse(args);
  return await client.createProjectConversation(validatedArgs);
};

export const companycamCreateProject: ToolFunction = async (args) => {
  const validatedArgs = createProjectSchema.parse(args);
  return await client.createProject(validatedArgs);
};

export const companycamGetProject: ToolFunction = async (args) => {
  const validatedArgs = getProjectSchema.parse(args);
  return await client.getProject(validatedArgs);
};

export const companycamListProjects: ToolFunction = async (args) => {
  const validatedArgs = listProjectsSchema.parse(args);
  return await client.listProjects(validatedArgs);
};

// Export all tools
export const companycamTools = {
  "companycam.search_project": companycamSearchProject,
  "companycam.create_project_conversation": companycamCreateProjectConversation,
  "companycam.create_project": companycamCreateProject,
  "companycam.get_project": companycamGetProject,
  "companycam.list_projects": companycamListProjects
};

// Register tools with the registry
registerTool("companycam.search_project", companycamSearchProject, searchProjectSchema);
registerTool("companycam.create_project_conversation", companycamCreateProjectConversation, createProjectConversationSchema);
registerTool("companycam.create_project", companycamCreateProject, createProjectSchema);
registerTool("companycam.get_project", companycamGetProject, getProjectSchema);
registerTool("companycam.list_projects", companycamListProjects, listProjectsSchema);
