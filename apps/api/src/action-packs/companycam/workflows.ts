import { Workflow } from "../../types";

export const workflows: Workflow = {
  add_project_conversation: [
    {
      action: "companycam.search_project",
      bind: {
        name: "inputs.project_hint.name",
        address: "inputs.project_hint.address"
      },
      out: "project_id"
    },
    {
      action: "companycam.create_project_conversation",
      bind: {
        project_id: "$prev.project_id",
        message: "inputs.message"
      }
    }
  ],
  
  search_project: [
    {
      action: "companycam.search_project",
      bind: {
        name: "inputs.project_hint.name",
        address: "inputs.project_hint.address"
      }
    }
  ],
  
  create_project: [
    {
      action: "companycam.create_project",
      bind: {
        name: "inputs.extra.name",
        address: "inputs.extra.address",
        description: "inputs.extra.description"
      }
    }
  ],
  
  get_project: [
    {
      action: "companycam.get_project",
      bind: {
        project_id: "inputs.extra.project_id"
      }
    }
  ],
  
  list_projects: [
    {
      action: "companycam.list_projects",
      bind: {
        limit: "inputs.extra.limit",
        offset: "inputs.extra.offset"
      }
    }
  ]
};
