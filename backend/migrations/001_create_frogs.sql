-- Every frog that exists. Its title, description and image still live in the frontend's en.json;
-- the admin page will add columns for them. Rows may be added and removed at any time.
CREATE TABLE frogs (
    id         text PRIMARY KEY CHECK (id ~ '^[a-z0-9]{1,32}$'),
    position   integer NOT NULL UNIQUE,   -- display order: the spinner, the library, ties in the top ten
    created_at timestamptz NOT NULL DEFAULT now()
);
