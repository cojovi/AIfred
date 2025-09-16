import { Workflow } from "../../types";

export const workflows: Workflow = {
  send_message: [
    {
      action: "slack.send_message",
      bind: {
        channel: "inputs.extra.channel",
        text: "inputs.extra.message"
      }
    }
  ],
  
  create_channel: [
    {
      action: "slack.create_channel",
      bind: {
        name: "inputs.extra.name",
        is_private: "inputs.extra.is_private"
      }
    }
  ],
  
  invite_users: [
    {
      action: "slack.invite_users",
      bind: {
        channel: "inputs.extra.channel",
        users: "inputs.extra.users"
      }
    }
  ],
  
  list_channels: [
    {
      action: "slack.list_channels",
      bind: {
        types: "inputs.extra.types",
        exclude_archived: "inputs.extra.exclude_archived"
      }
    }
  ],
  
  get_channel: [
    {
      action: "slack.get_channel",
      bind: {
        channel: "inputs.extra.channel"
      }
    }
  ]
};
