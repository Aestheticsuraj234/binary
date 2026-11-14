import {
  PROVIDERS,
  RUN_STATUSES,
  TOOL_CALL_STATUSES,
  TOOL_RISKS,
} from '@binary/shared';
import {pgEnum} from 'drizzle-orm/pg-core';

// Postgres enums: the database itself rejects any value not in these lists.

// Shared with the API validation and web forms, so all three always agree.
export const providerEnum = pgEnum('provider', PROVIDERS);

export const agentEngineEnum = pgEnum('agent_engine', [
  'api',
  'claude_code',
  'codex',
]);

export const approvalModeEnum = pgEnum('approval_mode', [
  'ask_first',
  'accept_edits',
  'auto_approve_reads',
  'plan_only',
]);

export const computerKindEnum = pgEnum('computer_kind', [
  'runner',
  'sandbox',
  'desktop',
  'browser',
]);

export const deviceStatusEnum = pgEnum('device_status', ['online', 'offline']);

export const routingModeEnum = pgEnum('routing_mode', ['mention', 'auto']);

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

export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
  'executed',
]);

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
