export const programList = [
    /** Used for dump/restore */
    "psql",
    "pg_dump",
    "pg_restore",
    /** Used for docker-mcp */
    "docker",
];
export const DEFAULT_ELECTRON_CONNECTION = {
    type: "Standard",
    db_host: "localhost",
    db_port: 5432,
    db_user: "prostgles_desktop",
    db_name: "prostgles_desktop_db",
};
