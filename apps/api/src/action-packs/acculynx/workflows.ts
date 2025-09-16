import { Workflow } from "../../types";

export const workflows: Workflow = {
  create_lead: [
    {
      action: "acculynx.create_lead",
      bind: {
        contact_info: "inputs.extra.contact_info",
        project_details: "inputs.extra.project_details"
      }
    }
  ],
  
  update_lead: [
    {
      action: "acculynx.update_lead",
      bind: {
        lead_id: "inputs.extra.lead_id",
        updates: "inputs.extra.updates"
      }
    }
  ],
  
  search_lead: [
    {
      action: "acculynx.search_lead",
      bind: {
        name: "inputs.extra.name",
        email: "inputs.extra.email",
        phone: "inputs.extra.phone"
      }
    }
  ],
  
  get_lead: [
    {
      action: "acculynx.get_lead",
      bind: {
        lead_id: "inputs.extra.lead_id"
      }
    }
  ],
  
  list_leads: [
    {
      action: "acculynx.list_leads",
      bind: {
        limit: "inputs.extra.limit",
        offset: "inputs.extra.offset"
      }
    }
  ]
};
