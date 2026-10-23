CREATE TABLE contact_picks (
 user_id TEXT NOT NULL,
 request_id INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 result TEXT,
 PRIMARY KEY (user_id, request_id)
);
--> statement-breakpoint
CREATE INDEX contact_picks_expiry ON contact_picks(expires_at);
