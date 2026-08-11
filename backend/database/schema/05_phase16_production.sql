-- Phase 16: Production Readiness Migration
-- Adds: email_log table, payment_events table, full-text search support

-- ============================================================
-- 1. EMAIL LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS email_log (
    email_log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    recipient_email VARCHAR(150) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'QUEUED',  -- QUEUED, SENT, FAILED
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_log_user ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);

-- ============================================================
-- 2. PAYMENT EVENTS TABLE (Razorpay Webhooks)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_events (
    event_id SERIAL PRIMARY KEY,
    razorpay_event_id VARCHAR(100) UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_razorpay_id ON payment_events(razorpay_event_id);

-- ============================================================
-- 3. FULL-TEXT SEARCH SUPPORT
-- ============================================================

-- Enable trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_services_search ON services USING GIN(search_vector);

-- Create trigram index for fuzzy matching on service_name
CREATE INDEX IF NOT EXISTS idx_services_name_trgm ON services USING GIN(service_name gin_trgm_ops);

-- Trigger function to auto-update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION services_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.service_name, '') || ' ' || COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_services_search_vector ON services;
CREATE TRIGGER trig_services_search_vector
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION services_search_vector_update();

-- Backfill existing rows
UPDATE services SET search_vector = to_tsvector('english',
  COALESCE(service_name, '') || ' ' || COALESCE(description, '')
);
