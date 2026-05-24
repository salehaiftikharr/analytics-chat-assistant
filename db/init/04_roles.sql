-- Two application roles enforce the security boundary described in the README.
-- (Passwords here are local-dev-only and match .env.example.)

-- ── Read-only role ──────────────────────────────────────────────────────────
-- Runs LLM-generated SQL. SELECT on the analytics tables ONLY — no write
-- privileges anywhere, and deliberately NO access to the messages table, so
-- generated SQL can never read or alter chat history.
CREATE ROLE aca_readonly WITH LOGIN PASSWORD 'readonly_pw';
GRANT CONNECT ON DATABASE analytics TO aca_readonly;
GRANT USAGE ON SCHEMA public TO aca_readonly;
GRANT SELECT ON customers, products, orders, order_items TO aca_readonly;

-- Defense in depth at the DB level: force read-only transactions and cap how
-- long any single statement may run, regardless of what the app does.
ALTER ROLE aca_readonly SET default_transaction_read_only = on;
ALTER ROLE aca_readonly SET statement_timeout = '10s';

-- ── App role ────────────────────────────────────────────────────────────────
-- Handles chat persistence. Read/write on messages ONLY — no access to the
-- analytics tables.
CREATE ROLE aca_app WITH LOGIN PASSWORD 'app_pw';
GRANT CONNECT ON DATABASE analytics TO aca_app;
GRANT USAGE ON SCHEMA public TO aca_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO aca_app;
GRANT USAGE, SELECT ON SEQUENCE messages_id_seq TO aca_app;
ALTER ROLE aca_app SET statement_timeout = '10s';
