"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableConfig = void 0;
exports.tableConfig = {
    user_groups: {
        columns: {
            id: { sqlDefinition: `TEXT PRIMARY KEY` },
            filter: { sqlDefinition: `JSONB   DEFAULT '{}'::jsonb` },
        }
    },
    user_types: {
        columns: {
            id: { sqlDefinition: `TEXT PRIMARY KEY`, label: "Type" }
        }
    },
    user_statuses: {
        columns: {
            id: { sqlDefinition: `TEXT PRIMARY KEY` }
        }
    },
    users: {
        columns: {
            id: { sqlDefinition: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` },
            username: { sqlDefinition: `TEXT NOT NULL UNIQUE` },
            password: { sqlDefinition: `TEXT NOT NULL DEFAULT gen_random_uuid()`, info: { hint: "On update will be hashed with the user id" } },
            type: { sqlDefinition: `TEXT NOT NULL DEFAULT 'default' REFERENCES user_types (id)` },
            created: { sqlDefinition: `TIMESTAMP DEFAULT NOW()` },
            last_updated: { sqlDefinition: `BIGINT` },
            status: { sqlDefinition: `TEXT NOT NULL DEFAULT 'active' REFERENCES user_statuses (id)` },
        }
    },
    access_control: {
        dropIfExistsCascade: true,
        columns: {
            id: { sqlDefinition: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` },
            connection_id: { sqlDefinition: `UUID NOT NULL REFERENCES connections(id)` },
            // user_groups:     { sqlDefinition: `TEXT[]` },
            rule: { sqlDefinition: `JSONB` },
            created: { sqlDefinition: `TIMESTAMP DEFAULT NOW()` },
        }
    },
    access_control_user_types: {
        dropIfExists: true,
        columns: {
            access_control_id: { sqlDefinition: `UUID NOT NULL REFERENCES access_control(id)` },
            user_type: { sqlDefinition: `TEXT NOT NULL REFERENCES user_types(id)` }
        },
        constraints: {
            NoDupes: "UNIQUE(access_control_id, user_type)"
        },
    },
    magic_links: {
        // dropIfExistsCascade: true,
        columns: {
            id: { sqlDefinition: `TEXT PRIMARY KEY DEFAULT gen_random_uuid()` },
            user_id: { sqlDefinition: `UUID REFERENCES users(id)` },
            magic_link: { sqlDefinition: `TEXT` },
            magic_link_used: { sqlDefinition: `TIMESTAMP` },
            expires: { sqlDefinition: `BIGINT NOT NULL` },
        }
    },
    /*
    
    
      --DROP TABLE IF EXISTS user_statuses CASCADE;
      CREATE TABLE IF NOT EXISTS user_statuses (
          id              TEXT PRIMARY KEY
      );
      INSERT INTO user_statuses (id) VALUES ('active'), ('disabled') ON CONFLICT DO NOTHING;
    
      --DROP TABLE IF EXISTS users CASCADE;
      CREATE TABLE IF NOT EXISTS users (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username        TEXT NOT NULL,
          password        TEXT NOT NULL DEFAULT gen_random_uuid(),
          type            TEXT NOT NULL DEFAULT 'default' REFERENCES user_types (id),
          created         TIMESTAMP DEFAULT NOW(),
          last_updated    BIGINT,
          status          TEXT NOT NULL DEFAULT 'active' REFERENCES user_statuses (id),
          UNIQUE(username)
      );
      */
};
//# sourceMappingURL=tableConfig.js.map