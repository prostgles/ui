import { writeFileSync } from "node:fs";
import { join } from "node:path";
import pgPromise from "../../../server/node_modules/pg-promise";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import type { SchemaConfig } from "../../../server/dist/server/src/schemaConfig";
import { getUserSyncColumnDefinitions } from "../../../common/userSync";
import { test, expect } from "../utils/fixtures";
import { createConfigTestProject } from "../utils/createConfigTestProject";

test("CLI user sync reconciles profiles and access without copying credentials", async () => {
  const pgp = pgPromise();
  let projectDatabase!: ReturnType<typeof pgp>;
  let stateDatabase!: ReturnType<typeof pgp>;
  const config = {
    id: "user-sync-e2e",
    databaseConfig: { sync_users: true },
    tableConfig: {
      users: {
        columns: {
          id: "uuid PRIMARY KEY",
          username: "text UNIQUE",
          name: "text",
          last_updated: "bigint NOT NULL",
          type: "text",
          status: "text NOT NULL",
          password: "text",
          options: "jsonb",
          "2fa": "jsonb",
          registration: "jsonb",
          auth_provider_profile: "jsonb",
        },
      },
      records: {
        columns: {
          id: "serial PRIMARY KEY",
          user_id: "uuid REFERENCES users(id)",
        },
      },
    },
    accessControl: [
      {
        userTypes: ["default"],
        dbPermissions: {
          type: "Custom",
          customTables: [{ tableName: "users", select: { fields: "*" } }],
        },
      },
    ],
  } satisfies SchemaConfig;
  const configPath = createConfigTestProject(config);
  const deployment = await createTestDeployment({
    configPath,
    configId: config.id,
    logPath: test.info().outputPath("user-sync-server.log"),
    users: [
      { key: "admin", type: "admin" },
      { key: "member" },
      { key: "removed", type: "default" },
      { key: "later", type: "default" },
      { key: "outsider", type: "public" },
    ],
    seed: async ({ projectDatabase: project, stateDatabase: state }) => {
      await test.step("seed can reference synced users immediately", async () => {
        const { rows: users } = await state.query<{ id: string }>(
          "SELECT id FROM users WHERE username IN ('admin', 'member')",
        );
        expect(users).toHaveLength(2);
        await project.query(
          "INSERT INTO records (user_id) SELECT unnest($1::uuid[])",
          [users.map(({ id }) => id)],
        );
        await project.query("DELETE FROM records");
      });
      const getConfig = ({
        host,
        port,
        user,
        password,
        database,
      }: typeof project) => ({ host, port, user, password, database });
      await state.query("INSERT INTO user_types (id) VALUES ('later_access')");
      await state.query(
        "UPDATE users SET type = 'later_access' WHERE username = 'later'",
      );
      projectDatabase = pgp(getConfig(project));
      stateDatabase = pgp(getConfig(state));
      await state.query(
        `UPDATE users SET "2fa" = $1, registration = $2,
         auth_provider_profile = '{"token":"private"}' WHERE username = 'removed'`,
        [
          {
            secret: "private-totp-secret",
            recoveryCode: "private-hash",
            enabled: true,
          },
          {
            type: "magic-link",
            code_hash: "private-code-hash",
            confirmed_on: null,
            expires: new Date(Date.now() + 300_000).toISOString(),
            date: new Date().toISOString(),
          },
        ],
      );
    },
  });
  const findProjectUser = (username: string) =>
    projectDatabase.oneOrNone("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
  try {
    const admin = await deployment.connectStateAs("admin");
    await test.step("seeded users can sign in with their user type as password", async () => {
      for (const [username, password] of [
        ["admin", "admin"],
        ["member", "default"],
      ]) {
        const response = await fetch(`${deployment.endpoint}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          redirect: "manual",
        });
        expect(response.status).toBe(302);
        expect(response.headers.get("set-cookie")).toContain("sid_token=");
        const sessionCount = await stateDatabase.one<{ count: number }>(
          `SELECT count(*)::int AS count FROM sessions
           WHERE user_id = (SELECT id FROM users WHERE username = $1)`,
          [username],
        );
        expect(sessionCount.count).toBe(2);
      }
    });
    const connection = await stateDatabase.one(
      "SELECT id FROM connections WHERE name = $1",
      [config.id],
    );
    const reloadConfig = async (syncUsers: boolean) => {
      writeFileSync(
        join(configPath, "index.js"),
        `module.exports = ${JSON.stringify({
          ...config,
          databaseConfig: { sync_users: syncUsers },
        })};`,
      );
      await deployment.syncSchema();
    };

    await test.step("CLI true enables sync and excludes authentication secrets", async () => {
      expect(
        (
          await stateDatabase.one(
            "SELECT sync_users FROM database_configs WHERE db_name = $1",
            [deployment.projectDatabaseName],
          )
        ).sync_users,
      ).toBe(false);
      await expect
        .poll(() => findProjectUser("removed"))
        .toMatchObject({
          status: "active",
          password: null,
          "2fa": null,
          registration: null,
          auth_provider_profile: null,
        });
      const member = await deployment.connectProjectAs("member");
      expect(member.methods?.inviteUser).toBeUndefined();
      const projectAdmin = await deployment.connectProjectAs("admin");
      expect(projectAdmin.methodSchema?.inviteUser).toMatchObject({
        function_options: { showInTableHeader: ["users"] },
      });
      projectAdmin.disconnect();
      const syncedUsers = member.tableSchema?.find(
        (table) => table.name === "users",
      );
      expect(syncedUsers).toMatchObject({
        label: "Users",
        icon: "Account",
        card: {
          headerColumn: "username",
          subHeaderColumns: ["name", "status"],
          summaryFields: ["email", "type", "created", "registration"],
          layoutSections: [{ items: ["id", "has_2fa_enabled"] }],
        },
        referenceDisplay: {
          columns: [{ name: "username", format: { type: "Avatar" } }],
        },
        columnConfigs: {
          type: { label: "Role" },
          last_updated: { show: false },
          options: { show: false },
        },
      });
      expect(syncedUsers?.columnConfigs).not.toHaveProperty("last_logged_in");
      expect(
        await member.db.users!.findOne!({ username: "removed" }),
      ).toMatchObject({
        password: null,
        "2fa": null,
        registration: null,
        auth_provider_profile: null,
      });
      member.disconnect();
    });

    await test.step("the UI-generated table accepts synced users without a password", async () => {
      const definitions = getUserSyncColumnDefinitions(
        await admin.db.users!.getColumns(),
      );
      await projectDatabase.none(
        `CREATE TABLE ui_generated_users (${definitions.join(", ")})`,
      );
      await projectDatabase.none(
        `INSERT INTO ui_generated_users (id, username, status, last_updated)
         SELECT id, username, status, last_updated FROM users`,
      );
      expect(
        await projectDatabase.one(
          "SELECT count(*)::int AS count FROM information_schema.columns WHERE table_name = 'ui_generated_users' AND column_name IN ('password', '2fa', 'registration', 'auth_provider_profile')",
        ),
      ).toEqual({ count: 0 });
    });

    await test.step("profile edits advance last_updated and clear previously copied secrets", async () => {
      const before = await stateDatabase.one(
        "SELECT * FROM users WHERE username = 'member'",
      );
      await projectDatabase.none(
        `UPDATE users SET "2fa" = '{"secret":"old"}', registration = '{"otp_code":"old"}'
         WHERE username = 'member'`,
      );
      await admin.db.users!.update(
        { id: before.id },
        { options: { theme: "dark" } },
      );
      await expect
        .poll(() => findProjectUser("member"))
        .toMatchObject({
          options: { theme: "dark" },
          "2fa": null,
          registration: null,
        });
      expect(
        BigInt((await findProjectUser("member")).last_updated),
      ).toBeGreaterThan(BigInt(before.last_updated));
    });

    await test.step("deleted users are disabled while foreign-key references survive", async () => {
      await projectDatabase.none(
        "INSERT INTO records (user_id) SELECT id FROM users WHERE username = 'removed'",
      );
      await admin.db.users!.delete({ username: "removed" });
      await expect
        .poll(() => findProjectUser("removed"))
        .toMatchObject({ status: "disabled" });
      expect(
        await projectDatabase.one("SELECT count(*)::int AS count FROM records"),
      ).toEqual({ count: 1 });
    });

    await test.step("equal timestamps spanning batches do not drop users or later updates", async () => {
      await stateDatabase.none(
        `INSERT INTO users (username, password, type, last_updated)
         SELECT 'bulk-' || user_number, 'test-password', 'default', $1
         FROM generate_series(1, 1001) AS user_number`,
        [Date.now() + 60_000],
      );
      await expect
        .poll(() =>
          projectDatabase.one(
            "SELECT count(*)::int AS count FROM users WHERE username LIKE 'bulk-%'",
          ),
        )
        .toEqual({ count: 1001 });
      await stateDatabase.none(
        "UPDATE users SET name = 'Updated outside the old cursor' WHERE username = 'member'",
      );
      await expect
        .poll(() => findProjectUser("member"))
        .toMatchObject({ name: "Updated outside the old cursor" });
    });

    await test.step("access through another connection backfills older users and revocation disables them", async () => {
      const sibling = await stateDatabase.one<{ id: string }>(
        `INSERT INTO connections (name, type, db_name, db_host, db_port, db_user, db_pass, db_conn)
         SELECT 'Other sync connection', type, db_name, db_host, db_port, db_user, db_pass, db_conn
         FROM connections WHERE id = $1 RETURNING id`,
        [connection.id],
      );
      const rule = await stateDatabase.one<{ id: number }>(
        `INSERT INTO access_control (database_id, "dbPermissions")
         SELECT database_id, "dbPermissions" FROM access_control
         WHERE id IN (SELECT access_control_id FROM access_control_connections WHERE connection_id = $1)
         LIMIT 1 RETURNING id`,
        [connection.id],
      );
      await stateDatabase.none(
        "INSERT INTO access_control_user_types VALUES ($1, 'later_access')",
        [rule.id],
      );
      await stateDatabase.none(
        "INSERT INTO access_control_connections (connection_id, access_control_id) VALUES ($1, $2)",
        [sibling.id, rule.id],
      );
      await expect
        .poll(() => findProjectUser("later"))
        .toMatchObject({ status: "active" });
      await stateDatabase.none(
        "DELETE FROM access_control_connections WHERE access_control_id = $1",
        [rule.id],
      );
      await expect
        .poll(() => findProjectUser("later"))
        .toMatchObject({ status: "disabled" });
      await stateDatabase.none(
        "INSERT INTO access_control_connections (connection_id, access_control_id) VALUES ($1, $2)",
        [sibling.id, rule.id],
      );
      await expect
        .poll(() => findProjectUser("later"))
        .toMatchObject({ status: "active" });
    });

    await test.step("CLI false overrides persisted true, and re-enabling catches up", async () => {
      await stateDatabase.none(
        "UPDATE database_configs SET sync_users = true WHERE db_name = $1",
        [deployment.projectDatabaseName],
      );
      await reloadConfig(false);
      const unsyncedAdmin = await deployment.connectProjectAs("admin");
      expect(unsyncedAdmin.methods?.inviteUser).toBeUndefined();
      unsyncedAdmin.disconnect();
      await stateDatabase.none(
        "UPDATE users SET name = 'While disabled' WHERE username = 'member'",
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      expect((await findProjectUser("member")).name).toBe(
        "Updated outside the old cursor",
      );
      await reloadConfig(true);
      const syncedAdmin = await deployment.connectProjectAs("admin");
      expect(syncedAdmin.methods?.inviteUser).toBeDefined();
      syncedAdmin.disconnect();
      await expect
        .poll(() => findProjectUser("member"))
        .toMatchObject({ name: "While disabled" });
    });
  } finally {
    pgp.end();
    await deployment.dispose();
  }
});
