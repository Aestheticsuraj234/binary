'use client';

import {
  MAX_DOCUMENT_LENGTH,
  type AddDocumentInput,
  type KnowledgeDocumentView,
  type KnowledgeMatch,
} from '@binary/shared';
import {
  ExternalLink,
  FileText,
  Globe,
  Library,
  LoaderCircle,
  Search,
  Trash2,
  Type,
} from 'lucide-react';
import {useState} from 'react';

import {EmbeddingKeyNotice} from '@/components/memory/unavailable-notice';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {addDocument, deleteDocument, searchKnowledge} from '@/lib/memory';
import {cn} from '@/lib/utils';

type Mode = 'text' | 'file' | 'url';

const MODES: {id: Mode; label: string; icon: typeof Type}[] = [
  {id: 'text', label: 'Paste text', icon: Type},
  {id: 'file', label: 'Upload a file', icon: FileText},
  {id: 'url', label: 'Web page', icon: Globe},
];

const SOURCE_LABEL: Record<KnowledgeDocumentView['source'], string> = {
  text: 'Text',
  file: 'File',
  url: 'Web page',
};

interface KnowledgeLibraryProps {
  available: boolean;
  initialDocuments: KnowledgeDocumentView[];
}

/**
 * The user's knowledge: add pasted text, a text file or a public page;
 * see and delete documents; and try a question to see what an agent would
 * find.
 */
export function KnowledgeLibrary({
  available,
  initialDocuments,
}: KnowledgeLibraryProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [mode, setMode] = useState<Mode>('text');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState('');
  const [matches, setMatches] = useState<KnowledgeMatch[]>();

  async function handleFile(file: File | undefined) {
    setError('');
    if (!file) {
      return;
    }
    const content = await file.text();
    if (content.length > MAX_DOCUMENT_LENGTH) {
      setError(
        'That file is too long for now (about 50 pages of text at most).',
      );
      return;
    }
    setTitle(file.name.replace(/\.[^.]+$/, ''));
    setText(content);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const input: AddDocumentInput =
      mode === 'url' ? {source: 'url', url} : {source: mode, title, text};
    setAdding(true);
    const {data, error: failed} = await addDocument(input);
    setAdding(false);
    if (!data) {
      setError(failed ?? 'Could not add it.');
      return;
    }
    setDocuments((current) => [data.document, ...current]);
    setTitle('');
    setText('');
    setUrl('');
  }

  async function handleDelete(document: KnowledgeDocumentView) {
    if (!window.confirm(`Delete “${document.title}” from your knowledge?`)) {
      return;
    }
    const {error: failed} = await deleteDocument(document.id);
    if (failed) {
      setError(failed);
      return;
    }
    setDocuments((current) =>
      current.filter((item) => item.id !== document.id),
    );
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const {data} = await searchKnowledge(question);
    setMatches(data?.matches ?? []);
  }

  const ready =
    mode === 'url'
      ? url.trim() !== ''
      : title.trim() !== '' && text.trim() !== '';

  return (
    <div className="space-y-10">
      {!available && <EmbeddingKeyNotice what="Knowledge" />}

      <section className="space-y-4 rounded-3xl border bg-card p-5">
        <h2 className="font-semibold">Add to your knowledge</h2>
        <div className="flex flex-wrap gap-2" role="tablist">
          {MODES.map(({id, label, icon: Icon}) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              variant={mode === id ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full"
              onClick={() => setMode(id)}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </div>
        <form onSubmit={handleAdd} className="space-y-3">
          {mode === 'url' ? (
            <div className="space-y-2">
              <Label htmlFor="knowledge-url">Address</Label>
              <Input
                id="knowledge-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://…"
              />
              <p className="text-xs text-muted-foreground">
                A public page; its text is read once and saved.
              </p>
            </div>
          ) : (
            <>
              {mode === 'file' && (
                <div className="space-y-2">
                  <Label htmlFor="knowledge-file">File</Label>
                  <Input
                    id="knowledge-file"
                    type="file"
                    accept=".txt,.md,.markdown,.csv,.json,text/*"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Text, Markdown, CSV or JSON.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="knowledge-title">Title</Label>
                <Input
                  id="knowledge-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Team handbook"
                />
              </div>
              {mode === 'text' && (
                <div className="space-y-2">
                  <Label htmlFor="knowledge-text">Text</Label>
                  <Textarea
                    id="knowledge-text"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    className="min-h-40 resize-y"
                    placeholder="Paste notes, a handbook, a spec…"
                  />
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="rounded-full"
            disabled={!available || !ready || adding}
          >
            {adding && <LoaderCircle className="animate-spin" />}
            {adding ? 'Reading and indexing…' : 'Add'}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
        {documents.length === 0 ? (
          <div className="flex items-center gap-4 rounded-3xl border border-dashed p-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
              <Library className="size-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nothing here yet. What you add, every character can search and
              cite.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-3xl border bg-card px-5">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">{document.title}</p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="font-normal">
                      {SOURCE_LABEL[document.source]}
                    </Badge>
                    {document.characters.toLocaleString('en')} characters ·{' '}
                    {document.chunks}{' '}
                    {document.chunks === 1 ? 'passage' : 'passages'}
                    {document.sourceUrl && (
                      <a
                        href={document.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <ExternalLink className="size-3" />
                        {new URL(document.sourceUrl).host}
                      </a>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(document)}
                  aria-label={`Delete ${document.title}`}
                  title="Delete"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {available && documents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Try a question
          </h2>
          <p className="text-sm text-muted-foreground">
            See which passages a character would find.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              aria-label="A question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="How many holiday days do we get?"
            />
            <Button
              type="submit"
              variant="secondary"
              className="rounded-full"
              disabled={question.trim() === ''}
            >
              <Search />
              Search
            </Button>
          </form>
          {matches && <KnowledgeMatches matches={matches} />}
        </section>
      )}
    </div>
  );
}

/** Passages a search found, with their document and how close they are. */
export function KnowledgeMatches({
  matches,
  className,
}: {
  matches: KnowledgeMatch[];
  className?: string;
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing found.</p>;
  }
  return (
    <ol className={cn('space-y-2', className)}>
      {matches.map((match, index) => (
        <li
          key={`${match.documentId}-${index}`}
          className="space-y-1 rounded-2xl border bg-background/60 p-3"
        >
          <p className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">{match.title}</span>
            <span className="shrink-0 font-mono text-muted-foreground">
              {Math.round(match.score * 100)}% match
            </span>
          </p>
          <p className="line-clamp-4 text-xs text-muted-foreground">
            {match.content}
          </p>
        </li>
      ))}
    </ol>
  );
}
