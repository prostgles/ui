"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableConfig = void 0;
const DUMP_OPTIONS_SCHEMA = {
    jsonbSchema: {
        oneOf: [{
                command: { enum: ["pg_dumpall"] },
                clean: { type: "boolean" },
                dataOnly: { type: "boolean", optional: true },
                globalsOnly: { type: "boolean", optional: true },
                rolesOnly: { type: "boolean", optional: true },
                schemaOnly: { type: "boolean", optional: true },
                ifExists: { type: "boolean", optional: true },
                encoding: { type: "string", optional: true },
                keepLogs: { type: "boolean", optional: true },
            }, {
                command: { enum: ["pg_dump"] },
                format: { enum: ["p", "t", "c"] },
                dataOnly: { type: "boolean", optional: true },
                clean: { type: "boolean", optional: true },
                create: { type: "boolean", optional: true },
                encoding: { type: "string", optional: true },
                numberOfJobs: { type: "integer", optional: true },
                noOwner: { type: "boolean", optional: true },
                compressionLevel: { type: "integer", optional: true },
                ifExists: { type: "boolean", optional: true },
                keepLogs: { type: "boolean", optional: true },
            }]
    },
    // defaultValue: "{}"
};
exports.tableConfig = {
    user_groups: {
        columns: {
            id: { sqlDefinition: `TEXT PRIMARY KEY` },
            filter: { sqlDefinition: `JSONB   DEFAULT '{}'::jsonb` },
        }
    },
    user_types: {
        isLookupTable: {
            values: { admin: {}, default: {} }
        }
    },
    user_statuses: {
        isLookupTable: {
            values: { active: {}, disabled: {} }
        }
    },
    users: {
        columns: {
            id: { sqlDefinition: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` },
            username: { sqlDefinition: `TEXT NOT NULL UNIQUE` },
            password: {
                sqlDefinition: `TEXT NOT NULL DEFAULT gen_random_uuid()`,
                info: { hint: "On update will be hashed with the user id" }
            },
            type: { sqlDefinition: `TEXT NOT NULL DEFAULT 'default' REFERENCES user_types (id)` },
            no_password: {
                sqlDefinition: `BOOLEAN CHECK( COALESCE(no_password, false) = FALSE OR type = 'admin' )`,
                info: { hint: "If checked then everyone has passwordless admin access, provided their IP is whitelisted. Only applies to admin accounts" }
            },
            created: { sqlDefinition: `TIMESTAMP DEFAULT NOW()` },
            last_updated: { sqlDefinition: `BIGINT` },
            options: { nullable: true, jsonbSchema: {
                    showStateDB: { type: "boolean", optional: true }
                }
            },
            "2fa": { nullable: true, jsonbSchema: {
                    secret: { type: "string" },
                    recoveryCode: { type: "string" },
                    enabled: { type: "boolean" }
                }
            },
            status: { sqlDefinition: `TEXT NOT NULL DEFAULT 'active' REFERENCES user_statuses (id)` },
        },
        triggers: {
            atLeastOneActiveAdmin: {
                actions: ["delete", "update"],
                type: "after",
                forEach: "statement",
                query: `
          BEGIN
            IF NOT EXISTS(SELECT * FROM users WHERE type = 'admin' AND status = 'active') THEN
              RAISE EXCEPTION 'Must have at least one active admin user';
            END IF;

            RETURN NULL;
          END;
        `
            }
        }
    },
    sessions: {
        columns: {
            id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
            user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
            name: `TEXT`,
            user_type: `TEXT NOT NULL`,
            is_mobile: `BOOLEAN DEFAULT FALSE`,
            active: `BOOLEAN DEFAULT TRUE`,
            project_id: `TEXT`,
            type: { enum: ["web", "api_token"], defaultValue: "web" },
            created: `TIMESTAMP DEFAULT NOW()`,
            expires: `BIGINT NOT NULL`,
        }
    },
    connections: {
        columns: {
            id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
            user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
            name: `TEXT`,
            db_name: `TEXT DEFAULT ''`,
            db_host: `TEXT DEFAULT 'localhost'`,
            db_port: `INTEGER DEFAULT 5432`,
            db_user: `TEXT DEFAULT ''`,
            db_pass: `TEXT DEFAULT ''`,
            db_ssl: { enum: ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'], nullable: false, defaultValue: "disable" },
            ssl_certificate: { sqlDefinition: `TEXT` },
            ssl_client_certificate: { sqlDefinition: `TEXT` },
            ssl_client_certificate_key: { sqlDefinition: `TEXT` },
            ssl_reject_unauthorized: { sqlDefinition: `BOOLEAN`, info: { hint: `If true, the server certificate is verified against the list of supplied CAs. \nAn error event is emitted if verification fails` } },
            db_conn: { sqlDefinition: `TEXT DEFAULT ''` },
            db_watch_shema: { sqlDefinition: `BOOLEAN DEFAULT TRUE` },
            prgl_url: { sqlDefinition: `TEXT` },
            prgl_params: { sqlDefinition: `JSONB` },
            type: { sqlDefinition: `TEXT NOT NULL DEFAULT 'Standard' CHECK (
              type IN ('Standard', 'Connection URI', 'Prostgles') 
              AND (type <> 'Connection URI' OR length(db_conn) > 1) 
              AND (type <> 'Standard' OR length(db_host) > 1) 
              AND (type <> 'Prostgles' OR length(prgl_url) > 0)
          )` },
            is_state_db: { sqlDefinition: `BOOLEAN`, info: { hint: `If true then this DB is used to run the dashboard` } },
            table_config: { info: { hint: `File and User configurations` },
                nullable: true,
                jsonbSchema: {
                    fileTable: { type: "string", optional: true },
                    storageType: { oneOf: [
                            { type: { enum: ["local"] } },
                            {
                                type: { enum: ["S3"] },
                                credential_id: { type: "number" }
                            }
                        ] },
                    referencedTables: { type: {}, optional: true },
                    delayedDelete: { optional: true, type: {
                            /**
                             * Minimum amount of time measured in days for which the files will not be deleted after requesting delete
                             */
                            deleteAfterNDays: { type: "number" },
                            /**
                             * How freuquently the files will be checked for deletion delay
                             */
                            checkIntervalHours: { type: "number", optional: true },
                        } },
                }
            },
            backups_config: { nullable: true, info: { hint: `Automatic backups configurations` }, jsonbSchema: {
                    enabled: { type: "boolean", optional: true },
                    cloudConfig: { nullable: true, type: {
                            /**
                             * If not provided then save to current server
                             */
                            credential_id: { type: "number", nullable: true, optional: true }
                        } },
                    frequency: { enum: ["daily", "monthly", "weekly", "hourly"] },
                    /**
                     * If provided then will do the backup during that hour (24 hour format). Unless the backup frequency is less than a day
                     */
                    hour: { type: "integer", optional: true },
                    /**
                     * If provided then will do the backup during that hour (1-7: Mon to Sun). Unless the backup frequency is less than a day
                     */
                    dayOfWeek: { type: "integer", optional: true },
                    /**
                     * If provided then will do the backup during that day (1-31) or earlier if the month is shorter. Unless the backup frequency is not monthly
                     */
                    dayOfMonth: { type: "integer", optional: true },
                    /**
                     * If provided then will keep the latest N backups and delete the older ones
                     */
                    keepLast: { type: "integer", optional: true },
                    /**
                     * If not enough space will show this error
                     */
                    err: { type: "string", optional: true, nullable: true },
                    dump_options: DUMP_OPTIONS_SCHEMA.jsonbSchema
                } },
            created: { sqlDefinition: `TIMESTAMP DEFAULT NOW()` },
            last_updated: { sqlDefinition: `BIGINT NOT NULL DEFAULT 0` },
        },
        constraints: {
            uniqueConName: `UNIQUE(name, user_id)`,
            // uniqueConURI: `UNIQUE(db_conn, user_id)`
        }
    },
    access_control: {
        // dropIfExistsCascade: true,
        columns: {
            id: `SERIAL PRIMARY KEY`,
            name: "TEXT",
            connection_id: `UUID NOT NULL REFERENCES connections(id)  ON DELETE CASCADE`,
            rule: { nullable: false, jsonbSchema: {
                    userGroupNames: { type: "string[]" },
                    dbsPermissions: { optional: true, type: {
                            createWorkspaces: { type: "boolean", optional: true },
                            viewPublishedWorkspaces: { type: {
                                    workspaceIds: { type: "string[]" }
                                }, optional: true },
                        } },
                    dbPermissions: { oneOf: [
                            {
                                type: { enum: ["Run SQL"] },
                                allowSQL: { type: "boolean", optional: true },
                            },
                            {
                                type: { enum: ["All views/tables"] },
                                allowAllTables: { type: "string[]" },
                            },
                            {
                                type: { enum: ["Custom"] },
                                customTables: { type: "any[]" },
                            }
                        ] }
                    //   CustomTableRules
                } },
            created: { sqlDefinition: `TIMESTAMP DEFAULT NOW()` },
        }
    },
    access_control_user_types: {
        // dropIfExists: true,
        columns: {
            access_control_id: `INTEGER NOT NULL REFERENCES access_control(id)  ON DELETE CASCADE`,
            user_type: `TEXT NOT NULL REFERENCES user_types(id)  ON DELETE CASCADE`
        },
        constraints: {
            NoDupes: "UNIQUE(access_control_id, user_type)"
        },
    },
    magic_links: {
        // dropIfExistsCascade: true,
        columns: {
            id: `TEXT PRIMARY KEY DEFAULT gen_random_uuid()`,
            user_id: `UUID NOT NULL REFERENCES users(id)`,
            magic_link: `TEXT`,
            magic_link_used: `TIMESTAMP`,
            expires: `BIGINT NOT NULL`,
        }
    },
    credential_types: {
        // dropIfExists: true,
        isLookupTable: {
            values: { s3: {} }
        }
    },
    credentials: {
        // dropIfExists: true,
        columns: {
            id: `SERIAL PRIMARY KEY`,
            name: `TEXT NOT NULL DEFAULT ''`,
            user_id: `UUID REFERENCES users(id) ON DELETE SET NULL`,
            type: `TEXT NOT NULL REFERENCES credential_types(id)`,
            key_id: `TEXT NOT NULL`,
            key_secret: `TEXT NOT NULL`,
            bucket: `TEXT`,
            region: `TEXT`,
        },
        constraints: {
            "Bucket or Region missing": "CHECK(type <> 's3' OR (bucket IS NOT NULL AND region IS NOT NULL))"
        }
    },
    backups: {
        // dropIfExists: true,
        columns: {
            id: { sqlDefinition: `TEXT PRIMARY KEY DEFAULT gen_random_uuid()`, info: { hint: "Format: dbname_datetime_uuid" } },
            connection_id: { sqlDefinition: `UUID REFERENCES connections(id) ON DELETE SET NULL`, info: { hint: "If null then connection was deleted" } },
            connection_details: { sqlDefinition: `TEXT NOT NULL DEFAULT 'unknown connection' ` },
            credential_id: { sqlDefinition: `INTEGER REFERENCES credentials(id) `, info: { hint: "If null then upload locally" } },
            destination: { sqlDefinition: `TEXT NOT NULL` },
            dump_command: { sqlDefinition: `TEXT NOT NULL` },
            restore_command: { sqlDefinition: `TEXT` },
            content_type: { sqlDefinition: `TEXT NOT NULL DEFAULT 'application/gzip'` },
            initiator: { sqlDefinition: `TEXT` },
            details: { sqlDefinition: `JSONB` },
            status: {
                jsonbSchema: {
                    oneOf: [
                        { ok: { type: "string" } },
                        { err: { type: "string" } },
                        {
                            loading: { optional: true, type: {
                                    loaded: { type: "number" },
                                    total: { type: "number" }
                                } }
                        },
                    ]
                }
            },
            uploaded: { sqlDefinition: `TIMESTAMP` },
            restore_status: { nullable: true,
                jsonbSchema: {
                    oneOf: [
                        { ok: { type: "string" } },
                        { err: { type: "string" } },
                        {
                            loading: { type: {
                                    loaded: { type: "number" },
                                    total: { type: "number" }
                                } }
                        }
                    ]
                }
            },
            restore_start: { sqlDefinition: `TIMESTAMP` },
            restore_end: { sqlDefinition: `TIMESTAMP` },
            restore_logs: { sqlDefinition: `TEXT` },
            dump_logs: { sqlDefinition: `TEXT` },
            dbSizeInBytes: { sqlDefinition: `BIGINT NOT NULL`, label: "Database size on disk" },
            sizeInBytes: { sqlDefinition: `BIGINT`, label: "Backup file size" },
            created: { sqlDefinition: `TIMESTAMP NOT NULL DEFAULT NOW()` },
            last_updated: { sqlDefinition: `TIMESTAMP NOT NULL DEFAULT NOW()` },
            options: DUMP_OPTIONS_SCHEMA,
            restore_options: {
                jsonbSchema: {
                    command: { enum: ["pg_restore", "psql"] },
                    format: { enum: ["p", "t", "c"] },
                    clean: { type: "boolean" },
                    newDbName: { type: "string", optional: true },
                    create: { type: "boolean", optional: true },
                    dataOnly: { type: "boolean", optional: true },
                    noOwner: { type: "boolean", optional: true },
                    numberOfJobs: { type: "integer", optional: true },
                    ifExists: { type: "boolean", optional: true },
                    keepLogs: { type: "boolean", optional: true },
                },
                defaultValue: `{ "clean": true, "format": "c", "command": "pg_restore" }`
            }
        }
    },
    workspaces: {
        columns: {
            id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
            user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
            connection_id: `UUID NOT NULL REFERENCES connections(id)  ON DELETE CASCADE`,
            name: `TEXT NOT NULL DEFAULT 'default'`,
            created: `TIMESTAMP DEFAULT NOW()`,
            active_row: `JSONB DEFAULT '{}'::jsonb`,
            layout: `JSONB`,
            options: `JSONB DEFAULT '{}'::jsonb`,
            last_updated: `BIGINT NOT NULL`,
            deleted: `BOOLEAN NOT NULL DEFAULT FALSE`,
            url_path: `TEXT`,
            published: `BOOLEAN NOT NULL DEFAULT FALSE`
        },
        constraints: {
            unique_url_path: `UNIQUE(url_path)`,
            unique_name_per_user_perCon: `UNIQUE(connection_id, user_id, name)`
        }
    },
    windows: {
        columns: {
            id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
            user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
            workspace_id: `UUID NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE`,
            type: `TEXT CHECK(type IN ('map', 'sql', 'table', 'timechart', 'card'))`,
            table_name: `TEXT`,
            table_oid: `INTEGER`,
            sql: `TEXT NOT NULL DEFAULT ''`,
            selected_sql: `TEXT NOT NULL DEFAULT ''`,
            name: `TEXT`,
            limit: `INTEGER`,
            closed: `BOOLEAN DEFAULT FALSE`,
            deleted: `BOOLEAN DEFAULT FALSE`,
            show_menu: `BOOLEAN DEFAULT FALSE`,
            layout: `JSONB`,
            fullscreen: `BOOLEAN DEFAULT TRUE`,
            sort: `JSONB`,
            filter: `JSONB NOT NULL DEFAULT '[]'::jsonb`,
            options: `JSONB NOT NULL DEFAULT '{}'::jsonb`,
            sql_options: { defaultValue: { executeOptions: "block", errorMessageDisplay: "both" }, jsonbSchema: {
                    "executeOptions": {
                        description: "Behaviour of execute (CTR+E). Defaults to 'block' \nfull = run entire sql   \nblock = run code block where the cursor is",
                        enum: ["full", "block"]
                    },
                    "errorMessageDisplay": {
                        description: "Error display locations. Defaults to 'both' \ntooltip = show within tooltip only   \nbottom = show in bottom control bar only   \nboth = show in both locations",
                        enum: ["tooltip", "bottom", "both"]
                    },
                } },
            columns: `JSONB NOT NULL DEFAULT '[]'::jsonb`,
            nested_tables: `JSONB`,
            created: `TIMESTAMP DEFAULT NOW()`,
            last_updated: `BIGINT NOT NULL`,
        }
    },
    global_settings: {
        dropIfExistsCascade: true,
        columns: {
            id: "INTEGER GENERATED ALWAYS AS IDENTITY",
            allowed_origin: {
                sqlDefinition: "TEXT",
                label: "Allow-Origin",
                info: { hint: "Specifies which domains can access the this app in a cross-origin manner. \nSets the Access-Control-Allow-Origin header. \nUse '*' or specific URL to allow API access" }
            },
            allowed_ips: {
                sqlDefinition: `cidr[] NOT NULL DEFAULT '{}'`,
                label: "Allowed IPs",
                info: { hint: "List of allowed IP addresses in ipv4 or ipv6 format" }
            },
            allowed_ips_enabled: {
                sqlDefinition: `BOOLEAN NOT NULL DEFAULT FALSE CHECK(allowed_ips_enabled = FALSE OR array_length(allowed_ips, 1) > 0)`,
                info: { hint: "If enabled then only allowed IPs can connect" }
            },
            trust_proxy: {
                sqlDefinition: `boolean NOT NULL DEFAULT FALSE`,
                info: { hint: "If true then will use the IP from 'X-Forwarded-For' header" }
            },
            updated_by: {
                enum: ["user", "app"],
                defaultValue: "app"
            },
        }
    },
    links: {
        columns: {
            id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
            user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
            w1_id: `UUID NOT NULL REFERENCES windows(id)  ON DELETE CASCADE`,
            w2_id: `UUID NOT NULL REFERENCES windows(id)  ON DELETE CASCADE`,
            workspace_id: `UUID NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE`,
            options: `JSONB NOT NULL DEFAULT '{}'::jsonb`,
            closed: `BOOLEAN DEFAULT FALSE`,
            deleted: `BOOLEAN DEFAULT FALSE`,
            created: `TIMESTAMP DEFAULT NOW()`,
            last_updated: `BIGINT NOT NULL`,
        }
    }
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