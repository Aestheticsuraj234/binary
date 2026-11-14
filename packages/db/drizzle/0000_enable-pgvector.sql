-- Agent memory (Chapter 12) stores embeddings in a `vector` column.
-- The pgvector extension must exist before any table uses that type.
CREATE EXTENSION IF NOT EXISTS vector;
