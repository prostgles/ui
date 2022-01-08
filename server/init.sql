CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

/* AUTH */
    --DROP TABLE IF EXISTS users CASCADE;
    CREATE TABLE IF NOT EXISTS users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username        TEXT NOT NULL,
        password        TEXT NOT NULL DEFAULT gen_random_uuid(),
        type            TEXT NOT NULL DEFAULT 'z',
        created         TIMESTAMP DEFAULT NOW(),
        last_updated    BIGINT,
        status          TEXT DEFAULT NULL,
        UNIQUE(username)
    );
    -- DROP TABLE IF EXISTS sessions CASCADE;
    CREATE TABLE IF NOT EXISTS sessions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID REFERENCES users(id),
        user_type   TEXT NOT NULL,
        is_mobile   BOOLEAN DEFAULT FALSE,
        active      BOOLEAN DEFAULT TRUE,
        project_id  TEXT,
        type        TEXT,
        created     TIMESTAMP DEFAULT NOW(),
        expires     BIGINT NOT NULL
    );
/* EOF AUTH */
 

/* DASHBOARD */
    -- DROP TABLE IF EXISTS workspaces CASCADE; 
    CREATE TABLE IF NOT EXISTS workspaces (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id), -- dependency
        name            TEXT,
        created         TIMESTAMP DEFAULT NOW(),
        active_row      JSON DEFAULT '{}'::json,
        layout          JSON,
        options         JSON DEFAULT '{}'::json,
        last_updated    BIGINT NOT NULL,
        UNIQUE(user_id, name)
    );

    -- DROP TABLE IF EXISTS windows CASCADE; 
    CREATE TABLE IF NOT EXISTS windows (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id), -- dependency
        workspace_id    UUID NOT NULL REFERENCES workspaces(id), -- dependency
        type            TEXT CHECK(type IN ('map', 'sql', 'table', 'timechart', 'card')),
        table_name      TEXT,
        table_oid       INTEGER,
        sql             TEXT NOT NULL DEFAULT '',
        selected_sql    TEXT NOT NULL DEFAULT '',
        name            TEXT,
        "limit"           INTEGER,
        closed          BOOLEAN DEFAULT FALSE,
        deleted         BOOLEAN DEFAULT FALSE,
        show_menu       BOOLEAN DEFAULT FALSE,
        layout          JSON,
        fullscreen      BOOLEAN DEFAULT TRUE,
        sort            JSON,
        filter          JSON,
        options         JSON DEFAULT '{}'::json,
        columns         JSON,
        nested_tables   JSON,
        created         TIMESTAMP DEFAULT NOW(),
        last_updated    BIGINT NOT NULL
    );

    -- DROP TABLE IF EXISTS links CASCADE; 
    CREATE TABLE IF NOT EXISTS links (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id), -- dependency
        w1_id           UUID NOT NULL REFERENCES windows(id), -- dependency
        w2_id           UUID NOT NULL REFERENCES windows(id), -- dependency
        workspace_id    UUID NOT NULL REFERENCES workspaces(id), -- dependency
        options         JSON NOT NULL DEFAULT '{}'::json,
        closed          BOOLEAN DEFAULT FALSE,
        deleted         BOOLEAN DEFAULT FALSE,
        created         TIMESTAMP DEFAULT NOW(),
        last_updated    BIGINT NOT NULL
    );
/* EOF DASHBOARD */


--DROP TABLE IF EXISTS connections CASCADE; 
CREATE TABLE IF NOT EXISTS connections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id), -- dependency

    name        TEXT,

    db_name     TEXT DEFAULT 'postgres',
    db_host     TEXT DEFAULT 'localhost',
    db_port     INTEGER DEFAULT 5432,
    db_user     TEXT DEFAULT '',
    db_pass     TEXT DEFAULT '',
    db_ssl      TEXT NOT NULL DEFAULT 'disable' CHECK (db_ssl IN ('disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full')),

    db_conn         TEXT DEFAULT '',
    db_watch_shema  BOOLEAN DEFAULT TRUE,
    
    prgl_url            TEXT,
    prgl_params         JSON,

    type     TEXT NOT NULL DEFAULT 'Standard' CHECK (type IN ('Standard', 'Connection URI', 'Prostgles')),

    created             TIMESTAMP DEFAULT NOW(),

    last_updated        BIGINT NOT NULL DEFAULT 0,
    UNIQUE(name, user_id)
);
