-- Candidate only: register with the CORE migration manifest before execution.
CREATE TABLE radar.category_groups (
 id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{0,63}$'),
 label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 100),
 icon text NOT NULL DEFAULT 'layers' CHECK (icon ~ '^[a-z][a-z0-9-]{0,63}$'),
 sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 10000),
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE radar.category_catalog (
 id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{0,63}$'),
 group_id text NOT NULL REFERENCES radar.category_groups(id) ON DELETE RESTRICT,
 label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 100),
 sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 10000),
 active boolean NOT NULL DEFAULT true,
 capacity_unit text NOT NULL CHECK (capacity_unit IN ('tables','rooms','places','units'))
);
-- Existing establishment category strings are deliberately unchanged.
