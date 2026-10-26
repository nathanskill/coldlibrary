-- WRITE ONLY in this task. Run manually before deploying the new API.
-- Additive: no existing rows are changed, backfilled, deleted or constrained.
-- Requires CREATE TABLE / CREATE INDEX privileges. Rerunning is safe when the
-- existing objects have this schema; IF NOT EXISTS does not repair schema drift.
BEGIN;
CREATE TABLE IF NOT EXISTS mail_dispatches (
  recipient_hash text NOT NULL,
  reserved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS mail_dispatches_time ON mail_dispatches (reserved_at);
CREATE INDEX IF NOT EXISTS mail_dispatches_recipient_time ON mail_dispatches (recipient_hash, reserved_at);
COMMIT;
