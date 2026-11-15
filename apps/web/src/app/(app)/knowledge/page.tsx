import type {KnowledgeDocumentView} from '@binary/shared';
import type {Metadata} from 'next';

import {KnowledgeLibrary} from '@/components/memory/knowledge-library';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Knowledge · Binary'};

/** Documents every character can search and cite. */
export default async function KnowledgePage() {
  const data = await getFromApi<{
    available: boolean;
    documents: KnowledgeDocumentView[];
  }>('/api/knowledge');

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-8 sm:px-6 lg:py-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Knowledge</h1>
        <p className="max-w-2xl text-muted-foreground">
          Add your notes, handbooks and pages once. Every character can search
          them by meaning, and says which document it used.
        </p>
      </div>
      <KnowledgeLibrary
        available={data?.available ?? false}
        initialDocuments={data?.documents ?? []}
      />
    </main>
  );
}
