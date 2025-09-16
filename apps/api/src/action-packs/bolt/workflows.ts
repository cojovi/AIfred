import { Workflow } from "../../types";

export const workflows: Workflow = {
  create_estimate: [
    {
      action: "bolt.create_estimate",
      bind: {
        project_details: "inputs.extra.project_details",
        line_items: "inputs.extra.line_items"
      }
    }
  ],
  
  update_estimate: [
    {
      action: "bolt.update_estimate",
      bind: {
        estimate_id: "inputs.extra.estimate_id",
        updates: "inputs.extra.updates"
      }
    }
  ],
  
  search_estimate: [
    {
      action: "bolt.search_estimate",
      bind: {
        project_name: "inputs.extra.project_name",
        customer_name: "inputs.extra.customer_name",
        status: "inputs.extra.status"
      }
    }
  ],
  
  get_estimate: [
    {
      action: "bolt.get_estimate",
      bind: {
        estimate_id: "inputs.extra.estimate_id"
      }
    }
  ],
  
  list_estimates: [
    {
      action: "bolt.list_estimates",
      bind: {
        limit: "inputs.extra.limit",
        offset: "inputs.extra.offset"
      }
    }
  ]
};
