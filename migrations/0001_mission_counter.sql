CREATE TABLE mission_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  manual_total INTEGER NOT NULL DEFAULT 0 CHECK (typeof(manual_total) = 'integer' AND manual_total >= 0)
);

INSERT INTO mission_counter (id, manual_total) VALUES (1, 0);

CREATE TABLE mission_counter_receipts (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36)
) WITHOUT ROWID;
