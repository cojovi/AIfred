import { z } from "zod";
import { BoltClient } from "./client";
import { ToolFunction } from "../../types";
import { registerTool } from "../../executor/toolRegistry";

const client = new BoltClient();

// Tool schemas
const createEstimateSchema = z.object({
  project_details: z.object({
    name: z.string().min(1),
    customer_name: z.string().min(1),
    address: z.string().optional(),
    description: z.string().optional()
  }),
  line_items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    total: z.number().positive()
  }))
});

const updateEstimateSchema = z.object({
  estimate_id: z.string().min(1),
  updates: z.record(z.any())
});

const searchEstimateSchema = z.object({
  project_name: z.string().optional(),
  customer_name: z.string().optional(),
  status: z.string().optional()
});

const getEstimateSchema = z.object({
  estimate_id: z.string().min(1)
});

const listEstimatesSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional()
});

// Tool functions
export const boltCreateEstimate: ToolFunction = async (args) => {
  const validatedArgs = createEstimateSchema.parse(args);
  return await client.createEstimate(validatedArgs);
};

export const boltUpdateEstimate: ToolFunction = async (args) => {
  const validatedArgs = updateEstimateSchema.parse(args);
  return await client.updateEstimate(validatedArgs);
};

export const boltSearchEstimate: ToolFunction = async (args) => {
  const validatedArgs = searchEstimateSchema.parse(args);
  return await client.searchEstimates(validatedArgs);
};

export const boltGetEstimate: ToolFunction = async (args) => {
  const validatedArgs = getEstimateSchema.parse(args);
  return await client.getEstimate(validatedArgs);
};

export const boltListEstimates: ToolFunction = async (args) => {
  const validatedArgs = listEstimatesSchema.parse(args);
  return await client.listEstimates(validatedArgs);
};

// Export all tools
export const boltTools = {
  "bolt.create_estimate": boltCreateEstimate,
  "bolt.update_estimate": boltUpdateEstimate,
  "bolt.search_estimate": boltSearchEstimate,
  "bolt.get_estimate": boltGetEstimate,
  "bolt.list_estimates": boltListEstimates
};

// Register tools with the registry
registerTool("bolt.create_estimate", boltCreateEstimate, createEstimateSchema);
registerTool("bolt.update_estimate", boltUpdateEstimate, updateEstimateSchema);
registerTool("bolt.search_estimate", boltSearchEstimate, searchEstimateSchema);
registerTool("bolt.get_estimate", boltGetEstimate, getEstimateSchema);
registerTool("bolt.list_estimates", boltListEstimates, listEstimatesSchema);
