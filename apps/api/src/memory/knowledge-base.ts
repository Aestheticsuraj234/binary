import type {KnowledgeRepository} from '@binary/db';
import {
  MAX_DOCUMENT_LENGTH,
  type AddDocumentInput,
  type KnowledgeDocumentView,
  type KnowledgeMatch,
} from '@binary/shared';

import {ValidationError} from '../errors';
import {fetchPageText, type UrlGuard} from '../tools/web-page';
import {splitIntoChunks} from './chunking';
import {NoEmbedderError} from './agent-memory';
import type {EmbedderFactory} from './embedder';

// Below this score a passage is about something else. With OpenAI's
// embeddings, related questions scored 0.28–0.43 on a real handbook and an
// unrelated one 0.15.
const MIN_SCORE = 0.2;

type SavedDocument = Awaited<
  ReturnType<KnowledgeRepository['listForUser']>
>[number];

export function toDocumentView(document: SavedDocument): KnowledgeDocumentView {
  return {
    id: document.id,
    title: document.title,
    source:
      document.source === 'url' || document.source === 'file'
        ? document.source
        : 'text',
    sourceUrl: document.sourceUrl,
    characters: document.characters,
    chunks: document.chunks,
    createdAt: document.createdAt.toISOString(),
  };
}

/**
 * The user's knowledge: documents cut into passages and embedded, so any
 * of their agents can find the right passage by meaning and cite it.
 */
export class KnowledgeBase {
  constructor(
    private readonly documents: KnowledgeRepository,
    private readonly embedders: EmbedderFactory,
    private readonly guard: UrlGuard,
  ) {}

  /** Reads (or fetches), cuts, embeds and saves a document. */
  async add(
    userId: string,
    input: AddDocumentInput,
  ): Promise<KnowledgeDocumentView> {
    const embedder = await this.embedders.forUser(userId);
    if (!embedder) {
      throw new NoEmbedderError();
    }
    let title: string;
    let text: string;
    let sourceUrl: string | null = null;
    if (input.source === 'url') {
      let page: Awaited<ReturnType<typeof fetchPageText>>;
      try {
        page = await fetchPageText(input.url, this.guard, MAX_DOCUMENT_LENGTH);
      } catch (error) {
        throw new ValidationError(
          `Could not read that page: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
      title = page.title || new URL(page.url).host;
      text = page.text;
      sourceUrl = page.url;
    } else {
      title = input.title;
      text = input.text;
    }
    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) {
      throw new ValidationError('There is no text in it to add.');
    }
    const embeddings = await embedder.embed(chunks);
    const saved = await this.documents.create(
      {
        userId,
        title: title.slice(0, 120),
        source: input.source,
        sourceUrl,
        characters: text.length,
      },
      chunks.map((content, position) => ({
        position,
        content,
        embedding: embeddings[position] ?? [],
      })),
      embedder.model,
    );
    return toDocumentView(saved);
  }

  /** The passages closest in meaning to a question, best first. */
  async search(
    userId: string,
    query: string,
    limit = 5,
  ): Promise<KnowledgeMatch[]> {
    const embedder = await this.embedders.forUser(userId);
    if (!embedder) {
      throw new NoEmbedderError();
    }
    const [embedding = []] = await embedder.embed([query]);
    const found = await this.documents.search(
      userId,
      {embedding, embeddingModel: embedder.model},
      limit,
    );
    return found
      .map((match) => ({
        documentId: match.documentId,
        title: match.title,
        sourceUrl: match.sourceUrl,
        content: match.content,
        score: Number((1 - match.distance).toFixed(3)),
      }))
      .filter((match) => match.score >= MIN_SCORE);
  }

  async list(userId: string) {
    return (await this.documents.listForUser(userId)).map(toDocumentView);
  }

  delete(userId: string, id: string) {
    return this.documents.delete(userId, id);
  }
}
