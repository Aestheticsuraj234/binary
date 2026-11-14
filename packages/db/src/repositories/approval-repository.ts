import {and, asc, count, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {
  agents,
  approvalRequests,
  messages,
  threads,
  toolCalls,
} from '../schema';

// An approval with everything the inbox shows: the tool call, the agent
// that asked, and the chat it happened in.
const APPROVAL_COLUMNS = {
  id: approvalRequests.id,
  status: approvalRequests.status,
  summary: approvalRequests.summary,
  createdAt: approvalRequests.createdAt,
  decidedAt: approvalRequests.decidedAt,
  toolCall: {
    id: toolCalls.id,
    toolName: toolCalls.toolName,
    risk: toolCalls.risk,
    status: toolCalls.status,
    input: toolCalls.input,
    output: toolCalls.output,
  },
  agent: {id: agents.id, name: agents.name, avatar: agents.avatar},
  threadId: threads.id,
};

/**
 * Stores what agents asked to do and what the user decided. Every read
 * and decision goes through the owner's id.
 */
export class ApprovalRepository {
  constructor(private readonly db: Database) {}

  /** One request per tool call that is waiting for the user. */
  async createMany(
    userId: string,
    requests: {toolCallId: string; summary: string}[],
  ) {
    if (requests.length === 0) {
      return [];
    }
    return this.db
      .insert(approvalRequests)
      .values(requests.map((request) => ({...request, userId})))
      .returning({
        id: approvalRequests.id,
        toolCallId: approvalRequests.toolCallId,
      });
  }

  private select() {
    return this.db
      .select(APPROVAL_COLUMNS)
      .from(approvalRequests)
      .innerJoin(toolCalls, eq(approvalRequests.toolCallId, toolCalls.id))
      .innerJoin(messages, eq(toolCalls.messageId, messages.id))
      .innerJoin(threads, eq(messages.threadId, threads.id))
      .innerJoin(agents, eq(threads.agentId, agents.id));
  }

  /** Oldest first: the inbox is a queue. */
  listPendingForUser(userId: string) {
    return this.select()
      .where(
        and(
          eq(approvalRequests.userId, userId),
          eq(approvalRequests.status, 'pending'),
        ),
      )
      .orderBy(asc(approvalRequests.createdAt));
  }

  async countPendingForUser(userId: string): Promise<number> {
    const [row] = await this.db
      .select({pending: count()})
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.userId, userId),
          eq(approvalRequests.status, 'pending'),
        ),
      );
    return row?.pending ?? 0;
  }

  async findForUser(userId: string, id: string) {
    const [approval] = await this.select().where(
      and(eq(approvalRequests.userId, userId), eq(approvalRequests.id, id)),
    );
    return approval;
  }

  /**
   * Records the user's decision, but only if the request is still pending.
   * Two clicks (or two devices) racing can't both win: the second gets
   * false, and the tool never runs twice.
   */
  async decide(id: string, status: 'approved' | 'rejected'): Promise<boolean> {
    const decided = await this.db
      .update(approvalRequests)
      .set({status, decidedAt: new Date(), decidedFrom: 'web'})
      .where(
        and(
          eq(approvalRequests.id, id),
          eq(approvalRequests.status, 'pending'),
        ),
      )
      .returning({id: approvalRequests.id});
    return decided.length > 0;
  }

  /** The approved tool has run. */
  async markExecuted(id: string) {
    await this.db
      .update(approvalRequests)
      .set({status: 'executed'})
      .where(eq(approvalRequests.id, id));
  }
}
