-- Add Albanian name column for localised trail display.
-- name_sq mirrors the OSM name:sq tag (or a curated override).
-- NULL means fall back to the English `name` column in the app.
alter table trails add column if not exists name_sq text;
