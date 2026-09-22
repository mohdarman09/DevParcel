-- Migration: 002_add_share_security.sql
-- Description: Adds sender tracking, password protection, and indexing to shares table

ALTER TABLE shares
  ADD COLUMN IF NOT EXISTS sender_id TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_protected BOOLEAN NOT NULL DEFAULT FALSE;

-- Index sender_id for fast history lookups
CREATE INDEX IF NOT EXISTS idx_shares_sender_id ON shares(sender_id);
