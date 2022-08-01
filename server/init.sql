CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

/* Global preferences and options */
-- CREATE TABLE IF NOT EXISTS globals (
--    onerow_id bool PRIMARY KEY DEFAULT TRUE
--  , user_groups JSONB
--  , CONSTRAINT onerow_uni CHECK (onerow_id) --Allow only one row in this table
-- );

/* AUTH */
    -- DROP TABLE IF EXISTS user_groups CASCADE;
    -- CREATE TABLE IF NOT EXISTS user_groups (
    --     id              TEXT PRIMARY KEY,
    --     filter  JSONB   DEFAULT '{}'::jsonb
    -- );

    -- --DROP TABLE IF EXISTS user_types CASCADE;
    -- CREATE TABLE IF NOT EXISTS user_types (
    --     id              TEXT PRIMARY KEY
    -- );
    -- INSERT INTO user_types (id) VALUES ('admin'), ('default') ON CONFLICT DO NOTHING;

    -- --DROP TABLE IF EXISTS user_statuses CASCADE;
    -- CREATE TABLE IF NOT EXISTS user_statuses (
    --     id              TEXT PRIMARY KEY
    -- );
    -- INSERT INTO user_statuses (id) VALUES ('active'), ('disabled') ON CONFLICT DO NOTHING;

    -- --DROP TABLE IF EXISTS users CASCADE;
    -- CREATE TABLE IF NOT EXISTS users (
    --     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     username        TEXT NOT NULL,
    --     password        TEXT NOT NULL DEFAULT gen_random_uuid(),
    --     type            TEXT NOT NULL DEFAULT 'default' REFERENCES user_types (id),
    --     created         TIMESTAMP DEFAULT NOW(),
    --     last_updated    BIGINT,
    --     status          TEXT NOT NULL DEFAULT 'active' REFERENCES user_statuses (id),
    --     UNIQUE(username)
    -- );
    
    -- DROP TABLE IF EXISTS sessions CASCADE;
    -- CREATE TABLE IF NOT EXISTS sessions (
    --     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     user_id     UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    --     user_type   TEXT NOT NULL,
    --     is_mobile   BOOLEAN DEFAULT FALSE,
    --     active      BOOLEAN DEFAULT TRUE,
    --     project_id  TEXT,
    --     type        TEXT,
    --     created     TIMESTAMP DEFAULT NOW(),
    --     expires     BIGINT NOT NULL
    -- );
/* EOF AUTH */
 

/* DASHBOARD */

    --DROP TABLE IF EXISTS connections CASCADE; 
    -- CREATE TABLE IF NOT EXISTS connections (
    --     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     user_id     UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE, -- dependency

    --     name        TEXT,

    --     db_name     TEXT DEFAULT '',
    --     db_host     TEXT DEFAULT 'localhost',
    --     db_port     INTEGER DEFAULT 5432,
    --     db_user     TEXT DEFAULT '',
    --     db_pass     TEXT DEFAULT '',
    --     db_ssl      TEXT NOT NULL DEFAULT 'disable' CHECK (db_ssl IN ('disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full')),
    --     ssl_certificate TEXT,
    --     ssl_client_certificate TEXT,

    --     db_conn         TEXT DEFAULT '',
    --     db_watch_shema  BOOLEAN DEFAULT TRUE,
        
    --     prgl_url            TEXT,
    --     prgl_params         JSON,

    --     type     TEXT NOT NULL DEFAULT 'Standard' CHECK (
    --             type IN ('Standard', 'Connection URI', 'Prostgles') 
    --             AND (type <> 'Connection URI' OR length(db_conn) > 1) 
    --             AND (type <> 'Standard' OR length(db_host) > 1) 
    --             AND (type <> 'Prostgles' OR length(prgl_url) > 0)
    --         ),

    --     /* If true then this DB is used to run the dashboard */
    --     is_state_db         BOOLEAN,

    --     /* File and User configurations */
    --     table_config        JSONB,

    --     /* Automatic backups configurations */
    --     backups_config        JSONB,

    --     created             TIMESTAMP DEFAULT NOW(),

    --     last_updated        BIGINT NOT NULL DEFAULT 0,
    --     UNIQUE(name, user_id),
    --     UNIQUE(db_conn, user_id)
    -- );

    -- CREATE TABLE IF NOT EXISTS access_control (
    --     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     connection_id   UUID NOT NULL REFERENCES connections(id)  ON DELETE CASCADE, -- dependency
    --     user_groups     TEXT[],
    --     rule            JSONB,
    --     created         TIMESTAMP DEFAULT NOW()
    -- );

    -- -- DROP TABLE IF EXISTS workspaces CASCADE; 
    -- CREATE TABLE IF NOT EXISTS workspaces (
    --     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     user_id         UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE, -- dependency
    --     connection_id   UUID NOT NULL REFERENCES connections(id)  ON DELETE CASCADE, -- dependency
    --     name            TEXT NOT NULL DEFAULT 'default',
    --     created         TIMESTAMP DEFAULT NOW(),
    --     active_row      JSON DEFAULT '{}'::json,
    --     layout          JSON,
    --     options         JSON DEFAULT '{}'::json,
    --     last_updated    BIGINT NOT NULL,
    --     deleted         BOOLEAN NOT NULL DEFAULT FALSE,
    --     url_path        TEXT,
    --     UNIQUE(url_path),
    --     UNIQUE(connection_id, user_id, name)
    -- );

    -- -- DROP TABLE IF EXISTS windows CASCADE; 
    -- CREATE TABLE IF NOT EXISTS windows (
    --     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     user_id         UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE, -- dependency
    --     workspace_id    UUID NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE, -- dependency
    --     type            TEXT CHECK(type IN ('map', 'sql', 'table', 'timechart', 'card')),
    --     table_name      TEXT ,
    --     table_oid       INTEGER,
    --     sql             TEXT NOT NULL DEFAULT '',
    --     selected_sql    TEXT NOT NULL DEFAULT '',
    --     name            TEXT,
    --     "limit"           INTEGER,
    --     closed          BOOLEAN DEFAULT FALSE,
    --     deleted         BOOLEAN DEFAULT FALSE,
    --     show_menu       BOOLEAN DEFAULT FALSE,
    --     layout          JSON,
    --     fullscreen      BOOLEAN DEFAULT TRUE,
    --     sort            JSON,
    --     filter          JSON,
    --     options         JSON DEFAULT '{}'::json,
    --     columns         JSON,
    --     nested_tables   JSON,
    --     created         TIMESTAMP DEFAULT NOW(),
    --     last_updated    BIGINT NOT NULL
    -- );

    -- -- DROP TABLE IF EXISTS links CASCADE; 
    -- CREATE TABLE IF NOT EXISTS links (
    --     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     user_id         UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE, -- dependency
    --     w1_id           UUID NOT NULL REFERENCES windows(id)  ON DELETE CASCADE, -- dependency
    --     w2_id           UUID NOT NULL REFERENCES windows(id)  ON DELETE CASCADE, -- dependency
    --     workspace_id    UUID NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE, -- dependency
    --     options         JSON NOT NULL DEFAULT '{}'::json,
    --     closed          BOOLEAN DEFAULT FALSE,
    --     deleted         BOOLEAN DEFAULT FALSE,
    --     created         TIMESTAMP DEFAULT NOW(),
    --     last_updated    BIGINT NOT NULL
    -- );
/* EOF DASHBOARD */


