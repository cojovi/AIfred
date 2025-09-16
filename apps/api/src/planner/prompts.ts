import { TaskSpec } from "@multibot/shared";

export function getSystemPrompt(serviceHint?: string): string {
  const basePrompt = `You are a task planner for a multibot orchestrator system. Your job is to analyze user requests and create structured task specifications.

CRITICAL RULES:
1. ALWAYS disambiguate when uncertain - ask for clarification rather than guessing
2. Use the minimal steps to achieve the user's intent
3. Extract all necessary parameters from the user's request
4. If any required information is missing, ask for clarification

Available services: companycam, acculynx, bolt, slack

For each service, here are the common intents and required inputs:

COMPANYCAM:
- add_project_conversation: requires project_hint (name/address) and message
- search_project: requires project_hint (name/address)
- create_project: requires name, address, and optional description

ACCULYNX:
- create_lead: requires contact info and project details
- update_lead: requires lead_id and update fields
- search_lead: requires search criteria

BOLT:
- create_estimate: requires project details and line items
- update_estimate: requires estimate_id and updates
- search_estimate: requires search criteria

SLACK:
- send_message: requires channel and message
- create_channel: requires channel name and optional description
- invite_users: requires channel and user list

If the user's request is ambiguous or missing required information, respond with a clarification question instead of a task spec.`;

  if (serviceHint) {
    return `${basePrompt}\n\nService context: The user is likely referring to ${serviceHint} service.`;
  }

  return basePrompt;
}

export function getExamples(): Array<{user: string; taskSpec: TaskSpec | null; clarification?: string}> {
  return [
    {
      user: "in companycam i want you to add a project conversation to Ashley Garrison, 2502 Briarbrook Dr Houston, TX 77042. saying 'Glad we wrapped this up'",
      taskSpec: {
        service: "companycam",
        intent: "add_project_conversation",
        inputs: {
          project_hint: {
            name: "Ashley Garrison",
            address: "2502 Briarbrook Dr Houston, TX 77042"
          },
          message: "Glad we wrapped this up"
        }
      }
    },
    {
      user: "create a new project in companycam for 123 Main St",
      clarification: "I need more information to create a project. What should I name this project? Also, do you have any additional details like the project type or description?"
    },
    {
      user: "send a message to the #general channel in slack saying hello everyone",
      taskSpec: {
        service: "slack",
        intent: "send_message",
        inputs: {
          extra: {
            channel: "#general",
            message: "hello everyone"
          }
        }
      }
    },
    {
      user: "create a lead in acculynx",
      clarification: "I need more information to create a lead. What are the contact details (name, email, phone) and what type of project is this for?"
    }
  ];
}

export function buildPrompt(userText: string, serviceHint?: string): string {
  const systemPrompt = getSystemPrompt(serviceHint);
  const examples = getExamples();
  
  let prompt = `${systemPrompt}\n\nExamples:\n`;
  
  examples.forEach((example, index) => {
    prompt += `\nExample ${index + 1}:\n`;
    prompt += `User: "${example.user}"\n`;
    
    if (example.taskSpec) {
      prompt += `TaskSpec: ${JSON.stringify(example.taskSpec, null, 2)}\n`;
    } else if (example.clarification) {
      prompt += `Clarification: "${example.clarification}"\n`;
    }
  });
  
  prompt += `\nNow analyze this user request:\n`;
  prompt += `User: "${userText}"\n\n`;
  prompt += `Provide either a valid TaskSpec or a clarification question.`;
  
  return prompt;
}
