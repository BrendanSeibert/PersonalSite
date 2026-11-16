-- One row per like: visitor_id liked entry_id. A frog's tally is the number of its rows.
CREATE TABLE favorites (
    visitor_id uuid NOT NULL,
    entry_id   text NOT NULL REFERENCES frogs (id) ON DELETE CASCADE,   -- removing a frog removes its likes
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (visitor_id, entry_id)   -- a visitor likes a frog at most once
);

-- Counting a frog's likes, and the top ten, read by entry_id.
CREATE INDEX favorites_entry_id_idx ON favorites (entry_id);
