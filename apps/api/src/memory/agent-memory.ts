import type {MemoryRepository} from '@binary/db';
import type {MemoryStatus, MemoryView} from '@binary/shared';

import type {EmbedderFactory} from './embedder';

// Closer than this, a new memory says the same as an old one.
const DUPLICATE_DISTANCE = 0.1;
// An agent with this few memories gets all of them in every prompt: a
// preference like "likes short answers" matters to every message but is
// never "close" to one. (Found with a real model.)
const ALL_MEMORIES_UP_TO = 10;
// With more, the closest ones go in: this many at most, and only close ones.
const PROMPT_MEMORIES = 5;
const PROMPT_MAX_DISTANCE = 0.75;

/** Thrown when the user has no OpenAI or Google key to embed with. */
export class NoEmbedderError extends Error {
  constructor() {
    super(
      'Memory needs an OpenAI or Google key (for embeddings). Add one under API keys.',
    );
  }
}

export function toMemoryView(memory: {
  id: string;
  content: string;
  source: string;
  createdAt: Date;
}): MemoryView {
  return {
    id: memory.id,
    content: memory.content,
    from: memory.source === 'manual' ? 'you' : 'chat',
    createdAt: memory.createdAt.toISOString(),
  };
}

/**
 * An agent's long-term memory: facts it saves about the user, found again
 * by meaning (pgvector), not by exact words.
 */
export class AgentMemory {
  constructor(
    private readonly memories: MemoryRepository,
    private readonly embedders: EmbedderFactory,
  ) {}

  /** Whether this user has a key to embed with. */
  async available(userId: string) {
    return (await this.embedders.forUser(userId)) !== undefined;
  }

  async status(userId: string, agentId: string): Promise<MemoryStatus> {
    const embedder = await this.embedders.forUser(userId);
    return {
      available: embedder !== undefined,
      model: embedder?.model ?? null,
      unsearchable: embedder
        ? await this.memories.countOtherModels(agentId, embedder.model)
        : 0,
    };
  }

  /**
   * Saves a memory, unless the agent already remembers the same thing.
   * `source` is the chat's id, or "manual" when the user added it.
   */
  async remember(
    userId: string,
    agentId: string,
    content: string,
    source: string,
  ): Promise<{saved: MemoryView} | {alreadyKnown: string}> {
    const embedder = await this.embedders.forUser(userId);
    if (!embedder) {
      throw new NoEmbedderError();
    }
    const [embedding = []] = await embedder.embed([content]);
    const [closest] = await this.memories.search(
      agentId,
      {embedding, embeddingModel: embedder.model},
      1,
    );
    if (closest && closest.distance < DUPLICATE_DISTANCE) {
      return {alreadyKnown: closest.content};
    }
    const saved = await this.memories.add({
      agentId,
      content,
      embedding,
      embeddingModel: embedder.model,
      source,
    });
    return {saved: toMemoryView(saved)};
  }

  /** Memories closest in meaning to a query, with a 0–1 score. */
  async recall(userId: string, agentId: string, query: string, limit = 5) {
    const embedder = await this.embedders.forUser(userId);
    if (!embedder) {
      throw new NoEmbedderError();
    }
    const [embedding = []] = await embedder.embed([query]);
    const found = await this.memories.search(
      agentId,
      {embedding, embeddingModel: embedder.model},
      limit,
    );
    return found.map((memory) => ({
      id: memory.id,
      content: memory.content,
      score: Number((1 - memory.distance).toFixed(3)),
    }));
  }

  /**
   * What the agent should keep in mind for this message: all its memories
   * while there are few (no embedding call), else the closest ones.
   */
  async forPrompt(userId: string, agentId: string, message: string) {
    const total = await this.memories.countForAgent(agentId);
    if (total === 0) {
      return [];
    }
    if (total <= ALL_MEMORIES_UP_TO) {
      return (await this.memories.listForAgent(agentId)).map(
        (memory) => memory.content,
      );
    }
    const found = await this.recall(
      userId,
      agentId,
      message,
      PROMPT_MEMORIES,
    ).catch(() => []);
    return found
      .filter((memory) => 1 - memory.score < PROMPT_MAX_DISTANCE)
      .map((memory) => memory.content);
  }

  forget(agentId: string, id: string) {
    return this.memories.delete(agentId, id);
  }

  async list(agentId: string) {
    return (await this.memories.listForAgent(agentId)).map(toMemoryView);
  }
}
