// Import all workflows from action packs
import { workflows as companycamWorkflows } from '../action-packs/companycam/workflows';
import { workflows as acculynxWorkflows } from '../action-packs/acculynx/workflows';
import { workflows as boltWorkflows } from '../action-packs/bolt/workflows';
import { workflows as slackWorkflows } from '../action-packs/slack/workflows';

// Combine all workflows
export const allWorkflows = {
  companycam: companycamWorkflows,
  acculynx: acculynxWorkflows,
  bolt: boltWorkflows,
  slack: slackWorkflows
};
