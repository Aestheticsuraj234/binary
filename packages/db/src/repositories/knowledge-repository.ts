import {and, asc, cosineDistance, count, desc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {knowledgeChunks, knowledgeDocuments} from '../schema';

export interface NewDocument {
  userId: string;
  title: string;
  source: 'text' | 'url' | 'file';
  sourceUrl?: string | null;
  characters: number;
}

export interface NewChunk {
  position: number;
  content: string;
  embedding: number[];
}

/**
 * The user's knowledge: documents, cut into passages with embeddings, that
 * every one of their agents can search. Every call takes the owner's id.
 */
export class KnowledgeRepository {
  constructor(private readonly db: Database) {}

  /** Saves a document and all its passages together, or neither. */
  async create(
    document: NewDocument,
    chunks: NewChunk[],
    embeddingModel: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [saved] = await tx
        .insert(knowledgeDocuments)
        .values(document)
        .returning();
      if (!saved) {
        throw new Error('Could not save the document.');
      }
      if (chunks.length > 0) {
        await tx.insert(knowledgeChunks).values(
          chunks.map((chunk) => ({
            ...chunk,
            documentId: saved.id,
            userId: document.userId,
            embeddingModel,
          })),
        );
      }
      return {...saved, chunks: chunks.length};
    });
  }

  /** Newest first, each with how many passages it has. */
  listForUser(userId: string) {
    return this.db
      .select({
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        source: knowledgeDocuments.source,
        sourceUrl: knowledgeDocuments.sourceUrl,
        characters: knowledgeDocuments.characters,
        createdAt: knowledgeDocuments.createdAt,
        chunks: count(knowledgeChunks.id),
      })
      .from(knowledgeDocuments)
      .leftJoin(
        knowledgeChunks,
        eq(knowledgeChunks.documentId, knowledgeDocuments.id),
      )
      .where(eq(knowledgeDocuments.userId, userId))
      .groupBy(knowledgeDocuments.id)
      .orderBy(desc(knowledgeDocuments.createdAt));
  }

  /** The passages closest in meaning, nearest first, with their document. */
  search(
    userId: string,
    {embedding, embeddingModel}: {embedding: number[]; embeddingModel: string},
    limit: number,
  ) {
    const distance = cosineDistance(
      knowledgeChunks.embedding,
      embedding,
    ).mapWith(Number);
    return this.db
      .select({
        documentId: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        sourceUrl: knowledgeDocuments.sourceUrl,
        position: knowledgeChunks.position,
        content: knowledgeChunks.content,
        distance,
      })
      .from(knowledgeChunks)
      .innerJoin(
        knowledgeDocuments,
        eq(knowledgeChunks.documentId, knowledgeDocuments.id),
      )
      .where(
        and(
          eq(knowledgeChunks.userId, userId),
          eq(knowledgeChunks.embeddingModel, embeddingModel),
        ),
      )
      .orderBy(asc(distance))
      .limit(limit);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.id, id),
          eq(knowledgeDocuments.userId, userId),
        ),
      )
      .returning({id: knowledgeDocuments.id});
    return deleted.length > 0;
  }
}
