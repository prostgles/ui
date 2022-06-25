

-- DROP TABLE IF EXISTS drawings CASCADE;
-- CREATE TABLE IF NOT EXISTS drawings (
--     id      bigint primary key generated always as identity,
--     pixel_id     bigint
-- );

-- DROP TABLE IF EXISTS pixels CASCADE;
-- CREATE TABLE IF NOT EXISTS pixels (
--     id          bigint primary key generated always as identity,
--     color_id    bigint,
--     rgb         TEXT,
--     xy          TEXT,
--     last_updated BIGINT,
--     drawn       BOOLEAN,
--     blb         BYTEA
-- );


-- DROP TABLE IF EXISTS colors CASCADE;
-- CREATE TABLE IF NOT EXISTS colors (
--     id      bigint primary key generated always as identity,
--     rgb     TEXT
-- );

DROP TABLE IF EXISTS lines CASCADE;
CREATE TABLE IF NOT EXISTS lines (
    id          SERIAL,
    color       TEXT,
    "Synced"    BIGINT
);

DROP TABLE IF EXISTS "Points" CASCADE;
CREATE TABLE IF NOT EXISTS "Points" (
    id          NUMERIC,
    color       TEXT,
    x           NUMERIC,
    y           NUMERIC,
    line_id     TEXT,
    "Synced"    BIGINT
);


-- DROP TABLE IF EXISTS users CASCADE;
-- CREATE TABLE IF NOT EXISTS users (
--     id      bigint primary key generated always as identity,
--     username TEXT
-- );  

-- DROP TABLE IF EXISTS posts CASCADE;
-- CREATE TABLE IF NOT EXISTS posts (
--     id          bigint primary key generated always as identity,
--     user_id     bigint,
--     title   TEXT
-- );


-- DROP TABLE IF EXISTS comments CASCADE;
-- CREATE TABLE IF NOT EXISTS comments (
--     id      bigint primary key generated always as identity,
--     post_id bigint,
--     user_id bigint,
--     content     TEXT
-- );

-- CREATE OR REPLACE VIEW v_c AS
-- SELECT users.id, comments.content
-- FROM users LEFT JOIN comments ON users.id = comments.user_id;