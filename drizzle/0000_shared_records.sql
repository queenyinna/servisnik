CREATE TABLE shared_records (
 id TEXT PRIMARY KEY NOT NULL,
 creator_id TEXT NOT NULL,
 provider_id TEXT,
 client_id TEXT,
 token_hash TEXT NOT NULL UNIQUE,
 expires_at INTEGER NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 data TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX shared_provider ON shared_records(provider_id);
--> statement-breakpoint
CREATE INDEX shared_client ON shared_records(client_id);
--> statement-breakpoint
CREATE INDEX shared_creator ON shared_records(creator_id, updated_at);
