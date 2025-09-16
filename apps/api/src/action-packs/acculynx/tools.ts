import { z } from "zod";
import { AccuLynxClient } from "./client";
import { ToolFunction } from "../../types";
import { registerTool } from "../../executor/toolRegistry";

const client = new AccuLynxClient();

// Tool schemas
const createLeadSchema = z.object({
  contact_info: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional()
  }),
  project_details: z.object({
    type: z.string().min(1),
    description: z.string().optional(),
    address: z.string().optional()
  })
});

const updateLeadSchema = z.object({
  lead_id: z.string().min(1),
  updates: z.record(z.any())
});

const searchLeadSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional()
});

const getLeadSchema = z.object({
  lead_id: z.string().min(1)
});

const listLeadsSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional()
});

// Tool functions
export const acculynxCreateLead: ToolFunction = async (args) => {
  const validatedArgs = createLeadSchema.parse(args);
  return await client.createLead(validatedArgs);
};

export const acculynxUpdateLead: ToolFunction = async (args) => {
  const validatedArgs = updateLeadSchema.parse(args);
  return await client.updateLead(validatedArgs);
};

export const acculynxSearchLead: ToolFunction = async (args) => {
  const validatedArgs = searchLeadSchema.parse(args);
  return await client.searchLeads(validatedArgs);
};

export const acculynxGetLead: ToolFunction = async (args) => {
  const validatedArgs = getLeadSchema.parse(args);
  return await client.getLead(validatedArgs);
};

export const acculynxListLeads: ToolFunction = async (args) => {
  const validatedArgs = listLeadsSchema.parse(args);
  return await client.listLeads(validatedArgs);
};

// Export all tools
export const acculynxTools = {
  "acculynx.create_lead": acculynxCreateLead,
  "acculynx.update_lead": acculynxUpdateLead,
  "acculynx.search_lead": acculynxSearchLead,
  "acculynx.get_lead": acculynxGetLead,
  "acculynx.list_leads": acculynxListLeads
};

// Register tools with the registry
registerTool("acculynx.create_lead", acculynxCreateLead, createLeadSchema);
registerTool("acculynx.update_lead", acculynxUpdateLead, updateLeadSchema);
registerTool("acculynx.search_lead", acculynxSearchLead, searchLeadSchema);
registerTool("acculynx.get_lead", acculynxGetLead, getLeadSchema);
registerTool("acculynx.list_leads", acculynxListLeads, listLeadsSchema);
