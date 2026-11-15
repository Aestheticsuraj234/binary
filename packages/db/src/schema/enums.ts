import {
  AGENT_ENGINES,
  APPROVAL_STATUSES,
  COMPUTER_KINDS,
  PROVIDERS,
  ROUTING_MODES,
  RUN_STATUSES,
  TOOL_CALL_STATUSES,
  TOOL_RISKS,
} from '@binary/shared';
import {pgEnum} from 'drizzle-orm/pg-core';

// Postgres enums: the database itself rejects any value not in these lists.

// Shared with the API validation and web forms, so all three always agree.
export const providerEnum = pgEnum('provider', PROVIDERS);

// Shared with the agent form (Chapter 11), in the original order.
export const agentEngineEnum = pgEnum('agent_engine', AGENT_ENGINES);

// Mirrors APPROVAL_MODES in packages/shared, which lists the same values
// from most careful to most trusting. Postgres enums keep their order, so
// building this from that list would force a migration for nothing.
export const approvalModeEnum = pgEnum('approval_mode', [
  'ask_first',
  'accept_edits',
  'auto_approve_reads',
  'plan_only',
]);

// Shared with the API and the web app (Chapter 9), in the original order.
export const computerKindEnum = pgEnum('computer_kind', COMPUTER_KINDS);

export const deviceStatusEnum = pgEnum('device_status', ['online', 'offline']);

// Shared with the room form (Chapter 13), in the original order.
export const routingModeEnum = pgEnum('routing_mode', ROUTING_MODES);

export const messageRoleEnum = pgEnum('message_role', [
  'user',
  'assistant',
  'tool',
]);

// Shared with the API and the web app (Chapter 6), like the provider list.
export const toolRiskEnum = pgEnum('tool_risk', TOOL_RISKS);

export const toolCallStatusEnum = pgEnum(
  'tool_call_status',
  TOOL_CALL_STATUSES,
);

export const approvalStatusEnum = pgEnum('approval_status', APPROVAL_STATUSES);

export const clientEnum = pgEnum('client', ['web', 'mobile']);

export const computerSessionStatusEnum = pgEnum('computer_session_status', [
  'running',
  'paused',
  'closed',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'todo',
  'in_progress',
  'done',
]);

export const triggerTypeEnum = pgEnum('trigger_type', [
  'cron',
  'webhook',
  'manual',
]);

export const runStatusEnum = pgEnum('run_status', RUN_STATUSES);

export const mcpServerStatusEnum = pgEnum('mcp_server_status', [
  'active',
  'error',
  'disabled',
]);
