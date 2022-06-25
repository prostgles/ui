
DROP TABLE IF EXISTS airports CASCADE;

CREATE TABLE IF NOT EXISTS airports (
    id      SERIAL PRIMARY KEY,
    last_updated BIGINT
);


DROP TABLE IF EXISTS planes CASCADE;

CREATE TABLE IF NOT EXISTS planes (
    id      SERIAL PRIMARY KEY,
    model            TEXT,
    manufacturer     TEXT,
    last_updated BIGINT
);