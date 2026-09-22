-- Migration: 001_create_shares_table.sql
-- Description: Creates the shares table, non-negative checks, and performance indexes for DevParcel

-- Enable UUID extension if available (pgcrypto or uuid-ossp)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create shares table
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  project_name TEXT NOT NULL,
  file_count INTEGER NOT NULL,
  original_size BIGINT NOT NULL,
  package_size BIGINT NOT NULL,
  excluded_count INTEGER NOT NULL DEFAULT 0,
  sensitive_file_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',

  -- Constraints
  CONSTRAINT uq_shares_token UNIQUE (token),
  CONSTRAINT chk_shares_file_count CHECK (file_count >= 0),
  CONSTRAINT chk_shares_original_size CHECK (original_size >= 0),
  CONSTRAINT chk_shares_package_size CHECK (package_size >= 0),
  CONSTRAINT chk_shares_excluded_count CHECK (excluded_count >= 0),
  CONSTRAINT chk_shares_sensitive_count CHECK (sensitive_file_count >= 0),
  CONSTRAINT chk_shares_download_count CHECK (download_count >= 0),
  CONSTRAINT chk_shares_status CHECK (status IN ('active', 'expired', 'revoked', 'cleaned'))
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_shares_status ON shares(status);
CREATE INDEX IF NOT EXISTS idx_shares_status_expires_at ON shares(status, expires_at);
