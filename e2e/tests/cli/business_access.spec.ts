import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import type { SchemaConfig } from "../../../server/dist/server/src/schemaConfig";
import type { DBSSchema } from "../../../common/publishUtils";
import { test, expect } from "../utils/fixtures";
import { createConfigTestProject } from "../utils/createConfigTestProject";

type UserType = DBSSchema["user_types"]["id"];
const readerType = "app_reader" as UserType;
const editorType = "app_editor" as UserType;
const customType = "support" as UserType;

test("business admins manage global users, types and rules without state administration", async ({
  browser,
}) => {
  const config = {
    id: "business-access",
    userTypes: {
      app_reader: { description: "Read records" },
      app_editor: { description: "Edit records" },
    },
    tableConfig: {
      records: { columns: { id: "serial PRIMARY KEY", value: "text" } },
    },
    accessControl: [
      {
        userTypes: [readerType],
        dbPermissions: {
          type: "Custom",
          customTables: [{ tableName: "records", select: { fields: "*" } }],
        },
        dbsPermissions: { createWorkspaces: true },
      },
      {
        userTypes: [editorType, "connection_admin"],
        dbPermissions: {
          type: "All views/tables",
          allowAllTables: ["select", "insert", "update", "delete"],
        },
        dbsPermissions: { createWorkspaces: true },
      },
    ],
  } satisfies SchemaConfig;
  const configPath = createConfigTestProject(config);
  appendFileSync(
    join(configPath, "index.js"),
    `
    module.exports.functions = {
      editors: {
        userFilter: { type: "app_editor" },
        functions: { addRecord: {
          input: { value: "string" },
          run: async ({ value }, { dbo, user }) => {
            await dbo.records.insert({ value });
            return user.type;
          }
        } }
      }
    };
  `,
  );
  const deployment = await createTestDeployment({
    configPath,
    configId: config.id,
    users: [
      { key: "admin", type: "admin" },
      { key: "owner", type: "connection_admin" },
      { key: "reader", type: readerType },
      { key: "editor", type: editorType },
      { key: "outsider" },
    ],
    logPath: test.info().outputPath("business-access.log"),
  });
  try {
    const admin = await deployment.connectStateAs("admin");
    const owner = await deployment.connectStateAs("owner");
    const outsider = await deployment.connectStateAs("outsider");
    const readerState = await deployment.connectStateAs("reader");
    const connection = (await owner.db.connections!.find())[0]!;
    const stateConnection = (await admin.db.connections!.findOne({
      is_state_db: true,
    }))!;
    const readerId = (await owner.db.users!.findOne({ username: "reader" }))!
      .id;
    const ownerId = (await owner.db.users!.findOne({ username: "owner" }))!.id;
    const readerRule = (await owner.db.access_control!.findOne({
      $existsJoined: { access_control_user_types: { user_type: readerType } },
    }))!;
    const stateConfig = (await admin.db.database_configs!.findOne({
      $existsJoined: { connections: { id: stateConnection.id } },
    }))!;
    const ownerRule = (await admin.db.access_control!.findOne({
      $existsJoined: {
        access_control_user_types: { user_type: "connection_admin" },
      },
    }))!;
    const [allowedCredential, restrictedCredential] = await admin.sql!(
      `INSERT INTO llm_credentials (provider_id, name, api_key, user_id)
       VALUES ('OpenAI', 'Delegable key', 'test-secret', $1),
              ('OpenAI', 'Restricted key', 'test-secret', $1) RETURNING id`,
      [admin.auth.user!.id],
      { returnType: "rows" },
    );
    const [allowedPrompt, restrictedPrompt] = await admin.sql!(
      `INSERT INTO llm_prompts (name) VALUES ('Delegable prompt'), ('Restricted prompt') RETURNING id`,
      {},
      { returnType: "rows" },
    );
    if (
      !allowedCredential ||
      !restrictedCredential ||
      !allowedPrompt ||
      !restrictedPrompt
    )
      throw new Error("AI delegation fixtures missing");
    const allowedLLM = {
      llm_credential_id: allowedCredential.id as number,
      llm_prompt_id: allowedPrompt.id as number,
    };
    await admin.db.access_control_allowed_llm!.insert({
      access_control_id: ownerRule.id,
      ...allowedLLM,
    });

    await test.step("only authorized business connections are available", async () => {
      expect(await owner.db.connections!.count()).toBe(1);
      expect(await readerState.db.connections!.count()).toBe(1);
      expect(await outsider.db.connections!.count()).toBe(0);
      await expect(
        outsider.methods!.startConnection!({ connectionId: connection.id }),
      ).rejects.toBeTruthy();
      await expect(
        owner.methods!.startConnection!({ connectionId: stateConnection.id }),
      ).rejects.toBeTruthy();
      expect(owner.sql).toBeUndefined();
      expect(owner.methods!.runSql).toBeUndefined();
      expect(owner.methods!.createConnection).toBeUndefined();
      expect(owner.db.database_configs).not.toHaveProperty("update");
      expect(owner.db.connections).not.toHaveProperty("update");
      expect(owner.db).not.toHaveProperty("connection_members");
      expect(await owner.db.users!.find({ type: "admin" })).toEqual([]);
      expect(outsider.db.users).not.toHaveProperty("insert");
      expect(outsider.db.user_types).not.toHaveProperty("insert");
      expect(outsider.db.access_control ?? {}).not.toHaveProperty("insert");
    });

    await test.step("custom types are global and managed types remain immutable", async () => {
      await owner.db.user_types!.insert({
        id: customType,
        description: "Support staff",
      });
      await owner.db.user_types!.update(
        { id: customType },
        { description: "Support team" },
      );
      expect(
        (await admin.db.user_types!.findOne({ id: customType }))!.description,
      ).toBe("Support team");
      for (const managedType of [
        "admin",
        "public",
        "default",
        "connection_admin",
      ] as const) {
        await expect(
          owner.db.user_types!.insert({ id: managedType }),
        ).rejects.toBeTruthy();

        const originalType = await admin.db.user_types!.findOne({
          id: managedType,
        });
        await owner.db
          .user_types!.insert(
            { id: managedType, description: "Overwritten" },
            { onConflict: { action: "DoUpdate", conflictColumns: ["id"] } },
          )
          .catch(() => undefined);
        expect(await admin.db.user_types!.findOne({ id: managedType })).toEqual(
          originalType,
        );
        expect(
          await owner.db.user_types!.update(
            { id: managedType },
            { description: "Changed" },
            { returning: "*" },
          ),
        ).toEqual([]);
        expect(
          await owner.db.user_types!.delete(
            { id: managedType },
            { returning: "*" },
          ),
        ).toEqual([]);
        expect(await admin.db.user_types!.count({ id: managedType })).toBe(1);
      }
      await expect(
        owner.db.user_types!.update({ id: customType }, { id: "admin" }),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.user_types!.delete({ id: readerType }),
      ).rejects.toBeTruthy();
    });

    await test.step("business users can be created and delegated without becoming instance admins", async () => {
      const created = await owner.db.users!.insert(
        {
          username: "created",
          password: "a-valid-password",
          type: customType,
        },
        { returning: "*" },
      );
      expect(created).toMatchObject({ type: customType, status: "active" });
      expect(created).not.toHaveProperty("password");
      const [stored] = await admin.sql!(
        "SELECT password FROM users WHERE id = $1",
        [created.id],
        { returnType: "rows" },
      );
      if (!stored) throw new Error("Created user not found");
      expect(stored.password).not.toBe("a-valid-password");
      await expect(
        owner.db.user_types!.delete({ id: customType }),
      ).rejects.toBeTruthy();
      for (const type of ["admin", "public"] as const) {
        await expect(
          owner.db.users!.insert({
            username: `forged-${type}`,
            password: "a-valid-password",
            type,
          }),
        ).rejects.toBeTruthy();
        await expect(
          owner.db.users!.update({ id: created.id }, { type }),
        ).rejects.toBeTruthy();
      }
      await expect(
        owner.db.users!.update({ id: created.id }, { password: "forged" }),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.users!.insert({
          username: "forged",
          password: "a-valid-password",
          passwordless_admin: true,
        }),
      ).rejects.toBeTruthy();
      expect(
        await owner.db.users!.update(
          { type: "admin" },
          { type: "default" },
          { returning: "*" },
        ),
      ).toEqual([]);
      expect(
        await owner.db.users!.delete({ type: "admin" }, { returning: "*" }),
      ).toEqual([]);
      const originalAdmin = await admin.db.users!.findOne({
        id: admin.auth.user!.id,
      });
      await owner.db
        .users!.insert(
          {
            username: "admin",
            password: "a-valid-password",
            type: "connection_admin",
          },
          { onConflict: { action: "DoUpdate", conflictColumns: ["username"] } },
        )
        .catch(() => undefined);
      expect(
        await admin.db.users!.findOne({ id: admin.auth.user!.id }),
      ).toEqual(originalAdmin);
      await owner.db.users!.update(
        { id: created.id },
        { type: "connection_admin" },
      );
      expect((await admin.db.users!.findOne({ id: created.id }))!.type).toBe(
        "connection_admin",
      );
      await owner.db.users!.update({ id: created.id }, { type: customType });
      await owner.db.users!.delete({ id: created.id });
      await owner.db.user_types!.delete({ id: customType });
    });

    await test.step("rule creation is scoped and connection links cannot be changed directly", async () => {
      const readonlyAccessRule = {
        database_id: readerRule.database_id,
        name: "Support access",
        dbPermissions: {
          type: "All views/tables",
          allowAllTables: ["select"],
        },
      } satisfies Pick<
        DBSSchema["access_control"],
        "database_id" | "name" | "dbPermissions"
      >;
      const connectionLink = { connection_id: connection.id };
      const rule = await owner.db.access_control!.insert(
        { ...readonlyAccessRule, access_control_connections: [connectionLink] },
        { returning: "*" },
      );
      await owner.db.user_types!.insert({ id: customType });
      await owner.db.access_control_user_types!.insert({
        access_control_id: rule.id,
        user_type: customType,
      });
      await expect(
        owner.db.user_types!.delete({ id: customType }),
      ).rejects.toBeTruthy();
      await owner.db.access_control!.update(
        { id: rule.id },
        { name: "Renamed" },
      );
      expect(
        (await admin.db.access_control!.findOne({ id: rule.id }))!.name,
      ).toBe("Renamed");
      await expect(
        owner.db.access_control!.insert(readonlyAccessRule),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.access_control!.insert({
          ...readonlyAccessRule,
          access_control_connections: [],
        }),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.access_control!.insert({
          ...readonlyAccessRule,
          access_control_connections: [connectionLink, connectionLink],
        }),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.access_control_connections!.insert({
          connection_id: stateConnection.id,
          access_control_id: rule.id,
        }),
      ).rejects.toBeTruthy();
      expect(owner.db.access_control_connections).not.toHaveProperty("update");
      expect(owner.db.access_control_connections).not.toHaveProperty("delete");
      await expect(
        owner.db.access_control!.update(
          { id: rule.id },
          { database_id: stateConfig.id },
        ),
      ).rejects.toBeTruthy();
      const rulesBeforeRejectedInserts = await admin.db.access_control!.count();
      const linksBeforeRejectedInserts =
        await admin.db.access_control_connections!.count();
      for (const [database_id, connection_id] of [
        [stateConfig.id, stateConnection.id],
        [stateConfig.id, connection.id],
        [readerRule.database_id, stateConnection.id],
      ] as const) {
        await expect(
          owner.db.access_control!.insert({
            ...readonlyAccessRule,
            database_id,
            access_control_connections: [{ connection_id }],
          }),
        ).rejects.toBeTruthy();
      }
      expect(await admin.db.access_control!.count()).toBe(
        rulesBeforeRejectedInserts,
      );
      expect(await admin.db.access_control_connections!.count()).toBe(
        linksBeforeRejectedInserts,
      );
      await owner.db.access_control!.delete({ id: rule.id });
      await owner.db.user_types!.delete({ id: customType });
    });

    await test.step("business admins delegate only granted AI resources", async () => {
      expect(await owner.db.llm_credentials!.find()).toEqual([
        {
          id: allowedLLM.llm_credential_id,
          name: "Delegable key",
          provider_id: "OpenAI",
        },
      ]);
      expect(await owner.db.llm_prompts!.find()).toEqual([
        { id: allowedLLM.llm_prompt_id, name: "Delegable prompt" },
      ]);
      for (const table of [owner.db.llm_credentials, owner.db.llm_prompts]) {
        for (const method of ["insert", "update", "delete"]) {
          expect(table).not.toHaveProperty(method);
        }
      }
      expect(owner.db.llm_providers).toBeUndefined();
      expect(outsider.db.access_control_allowed_llm).toBeUndefined();
      for (const access_control_id of [readerRule.id, ownerRule.id]) {
        for (const restrictedResource of [
          { llm_credential_id: restrictedCredential.id as number },
          { llm_prompt_id: restrictedPrompt.id as number },
        ]) {
          await expect(
            owner.db.access_control_allowed_llm!.insert({
              access_control_id,
              ...allowedLLM,
              ...restrictedResource,
            }),
          ).rejects.toBeTruthy();
        }
      }
      const readerGrant = { access_control_id: readerRule.id, ...allowedLLM };
      await owner.db.access_control_allowed_llm!.insert(readerGrant);
      expect(await readerState.db.llm_credentials!.count()).toBe(1);
      await owner.db.access_control_allowed_llm!.delete(readerGrant);
      expect(await readerState.db.llm_credentials!.count()).toBe(0);

      const ownerGrant = { access_control_id: ownerRule.id, ...allowedLLM };
      await admin.db.access_control_allowed_llm!.delete(ownerGrant);
      await expect(
        owner.db.access_control_allowed_llm!.insert(ownerGrant),
      ).rejects.toBeTruthy();
      await admin.db.access_control_allowed_llm!.insert(ownerGrant);
    });

    await test.step("only instance admins can grant SQL through rules or user types", async () => {
      const sqlType = "sql_operator" as UserType;
      await admin.db.user_types!.insert({ id: sqlType });
      const sqlRule = await admin.db.access_control!.insert(
        {
          database_id: readerRule.database_id,
          access_control_connections: [{ connection_id: connection.id }],
          dbPermissions: { type: "Run SQL", allowSQL: true },
        },
        { returning: "*" },
      );
      await admin.db.access_control_user_types!.insert({
        access_control_id: sqlRule.id,
        user_type: sqlType,
      });
      const sqlUser = await admin.db.users!.insert(
        {
          username: "sql-operator",
          password: "a-valid-password",
          type: sqlType,
          status: "disabled",
        },
        { returning: "*" },
      );
      await expect(
        owner.db.access_control!.insert({
          database_id: readerRule.database_id,
          access_control_connections: [{ connection_id: connection.id }],
          dbPermissions: { type: "Run SQL", allowSQL: true },
        }),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.access_control!.update(
          { id: readerRule.id },
          { dbPermissions: { type: "Run SQL", allowSQL: true } },
        ),
      ).rejects.toBeTruthy();
      expect(
        (await admin.db.access_control!.findOne({ id: readerRule.id }))!
          .dbPermissions,
      ).toEqual(readerRule.dbPermissions);
      expect(
        await owner.db.access_control!.update(
          { id: sqlRule.id },
          { name: "Changed" },
          { returning: "*" },
        ),
      ).toEqual([]);
      await expect(
        owner.db.access_control_user_types!.insert({
          access_control_id: sqlRule.id,
          user_type: "default",
        }),
      ).rejects.toBeTruthy();
      expect(
        await owner.db.access_control_user_types!.delete(
          { access_control_id: sqlRule.id },
          { returning: "*" },
        ),
      ).toEqual([]);
      expect(
        await owner.db.access_control!.delete(
          { id: sqlRule.id },
          { returning: "*" },
        ),
      ).toEqual([]);
      expect(await owner.db.user_types!.find({ id: sqlType })).toEqual([]);
      await expect(
        owner.db.users!.insert({
          username: "forged-sql",
          password: "a-valid-password",
          type: sqlType,
        }),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.users!.update({ id: readerId }, { type: sqlType }),
      ).rejects.toBeTruthy();
      expect(
        await owner.db.users!.update(
          { id: sqlUser.id },
          { status: "active" },
          { returning: "*" },
        ),
      ).toEqual([]);
      const originalSqlUser = await admin.db.users!.findOne({
        id: sqlUser.id,
      });
      await owner.db
        .users!.insert(
          {
            username: "sql-operator",
            password: "forged-password",
            type: "connection_admin",
          },
          { onConflict: { action: "DoUpdate", conflictColumns: ["username"] } },
        )
        .catch(() => undefined);
      expect(await admin.db.users!.findOne({ id: sqlUser.id })).toEqual(
        originalSqlUser,
      );
      await admin.db.users!.delete({ id: sqlUser.id });
      await admin.db.access_control!.delete({ id: sqlRule.id });
      await admin.db.user_types!.delete({ id: sqlType });
    });

    await test.step("state aliases and rules shared with state cannot be managed", async () => {
      const [alias] = await admin.sql!(
        `
        INSERT INTO connections (name, type, db_name, db_host, db_port, db_user, db_pass, db_conn)
        SELECT 'State alias', type, db_name, db_host, db_port, db_user, db_pass, db_conn FROM connections WHERE id = $1
        RETURNING id
      `,
        [stateConnection.id],
        { returnType: "rows" },
      );
      if (!alias) throw new Error("State alias not created");
      expect(await owner.db.connections!.find({ id: alias.id })).toEqual([]);
      await expect(
        owner.methods!.startConnection!({ connectionId: alias.id }),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.access_control!.insert({
          database_id: stateConfig.id,
          access_control_connections: [{ connection_id: alias.id }],
          dbPermissions: {
            type: "All views/tables",
            allowAllTables: ["select"],
          },
        }),
      ).rejects.toBeTruthy();
      await admin.db.access_control_connections!.insert({
        connection_id: alias.id,
        access_control_id: readerRule.id,
      });
      const stateSharedGrant = {
        access_control_id: readerRule.id,
        ...allowedLLM,
      };
      await expect(
        owner.db.access_control_allowed_llm!.insert(stateSharedGrant),
      ).rejects.toBeTruthy();
      await admin.db.access_control_allowed_llm!.insert(stateSharedGrant);
      expect(
        await owner.db.access_control_allowed_llm!.delete(stateSharedGrant, {
          returning: "*",
        }),
      ).toEqual([]);
      expect(
        await admin.db.access_control_allowed_llm!.count(stateSharedGrant),
      ).toBe(1);
      await admin.db.access_control_allowed_llm!.delete(stateSharedGrant);
      expect(
        await owner.db.access_control!.find({ id: readerRule.id }),
      ).toEqual([]);
      expect(
        await owner.db.access_control!.update(
          { id: readerRule.id },
          { name: "Changed" },
          { returning: "*" },
        ),
      ).toEqual([]);
      expect(
        await owner.db.access_control!.delete(
          { id: readerRule.id },
          { returning: "*" },
        ),
      ).toEqual([]);
      expect(
        await owner.db.access_control_user_types!.delete(
          { access_control_id: readerRule.id },
          { returning: "*" },
        ),
      ).toEqual([]);
      await expect(
        owner.db.access_control_user_types!.insert({
          access_control_id: readerRule.id,
          user_type: "default",
        }),
      ).rejects.toBeTruthy();
      await admin.db.access_control_connections!.delete({
        connection_id: alias.id,
      });
      await admin.sql!("DELETE FROM connections WHERE id = $1", [alias.id]);
    });

    await test.step("workspace grants cannot reference the state database", async () => {
      const workspace = await admin.db.workspaces!.insert(
        {
          name: "State dashboard",
          connection_id: stateConnection.id,
          user_id: admin.auth.user!.id,
          published: true,
        },
        { returning: "*" },
      );
      const ruleCount = await admin.db.access_control!.count();
      const linkCount = await admin.db.access_control_connections!.count();
      await expect(
        owner.db.access_control!.update(
          { id: readerRule.id },
          {
            dbsPermissions: {
              viewPublishedWorkspaces: { workspaceIds: [workspace.id] },
            },
          },
        ),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.access_control!.insert({
          database_id: readerRule.database_id,
          access_control_connections: [{ connection_id: connection.id }],
          dbPermissions: {
            type: "All views/tables",
            allowAllTables: ["select"],
          },
          dbsPermissions: {
            viewPublishedWorkspaces: { workspaceIds: [workspace.id] },
          },
        }),
      ).rejects.toBeTruthy();
      expect(await admin.db.access_control!.count()).toBe(ruleCount);
      expect(await admin.db.access_control_connections!.count()).toBe(
        linkCount,
      );
      const businessWorkspace = await owner.db.workspaces!.insert(
        {
          connection_id: connection.id,
          name: "Business dashboard",
          user_id: ownerId,
          published: true,
        },
        { returning: "*" },
      );
      const workspaceRule = await owner.db.access_control!.insert(
        {
          database_id: readerRule.database_id,
          access_control_connections: [{ connection_id: connection.id }],
          dbPermissions: {
            type: "All views/tables",
            allowAllTables: ["select"],
          },
          dbsPermissions: {
            viewPublishedWorkspaces: { workspaceIds: [businessWorkspace.id] },
          },
        },
        { returning: "*" },
      );
      expect(workspaceRule.dbsPermissions).toEqual({
        viewPublishedWorkspaces: { workspaceIds: [businessWorkspace.id] },
      });
      await owner.db.access_control!.delete({ id: workspaceRule.id });
      const businessWindow = await owner.db.windows!.insert(
        {
          workspace_id: businessWorkspace.id,
          user_id: ownerId,
          type: "table",
          table_name: "records",
        },
        { returning: "*" },
      );
      expect(
        await owner.db.windows!.update(
          { id: businessWindow.id },
          { name: "Updated business table" },
          { returning: "*" },
        ),
      ).toHaveLength(1);
      await expect(
        owner.db.workspaces!.insert({
          connection_id: stateConnection.id,
          name: "Forged state dashboard",
          user_id: ownerId,
        }),
      ).rejects.toBeTruthy();
      await expect(
        owner.db.workspaces!.update(
          { id: businessWorkspace.id },
          { connection_id: stateConnection.id },
        ),
      ).rejects.toBeTruthy();
      await owner.db
        .windows!.update(
          { id: businessWindow.id },
          { workspace_id: workspace.id },
        )
        .catch(() => undefined);
      expect(
        await admin.sql!(
          "SELECT workspace_id FROM windows WHERE id = $1",
          [businessWindow.id],
          { returnType: "value" },
        ),
      ).toBe(businessWorkspace.id);
      await owner.db.windows!.delete({ id: businessWindow.id });
      await owner.db.workspaces!.delete({ id: businessWorkspace.id });
      await admin.db.workspaces!.delete({ id: workspace.id });
    });

    await test.step("signup cannot assign managed administrative identities", async () => {
      for (const type of ["admin", "public", "connection_admin"] as const) {
        await expect(
          admin.db.database_configs!.update(
            { id: stateConfig.id },
            { auth_created_user_type: type },
          ),
        ).rejects.toBeTruthy();
      }
    });

    await test.step("one connection opens directly and business admins can edit users and rules", async () => {
      const context = await browser.newContext({
        storageState: deployment.storageStateAs("owner"),
      });
      const page = await context.newPage();
      await page.goto(`${deployment.endpoint}/connections`);
      await expect(page).toHaveURL(new RegExp(`/connections/${connection.id}`));
      await page.goto(
        `${deployment.endpoint}/connection-config/${connection.id}?section=access_control`,
      );
      await page.getByTestId("config.ac").click();
      await expect(page.getByTestId("config.ac.create")).toBeVisible();
      await owner.db.user_types!.insert({ id: customType });
      await page.getByTestId("config.ac.create").click();
      await page.getByTestId("config.ac.edit.user").click();
      await page
        .getByRole("option")
        .getByText(customType, { exact: true })
        .click();
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await page
        .getByTestId("config.ac.edit.type")
        .getByRole("button", { name: "All views/tables", exact: true })
        .click();
      await page.getByTestId("selectRule").click();
      await page.getByTestId("config.ac.save").click();
      await expect(page.getByTestId("config.ac.edit.user")).toBeHidden();
      const createdRule = await owner.db.access_control!.findOne({
        $existsJoined: { access_control_user_types: { user_type: customType } },
      });
      expect(createdRule?.dbPermissions).toEqual({
        type: "All views/tables",
        allowAllTables: ["select"],
      });
      await owner.db.access_control!.delete({ id: createdRule!.id });
      await owner.db.user_types!.delete({ id: customType });
      await page
        .locator(".ExistingAccessRules_Item")
        .filter({ hasText: "app_reader" })
        .click();
      await expect(page.getByTestId("config.ac.edit.user")).toBeVisible();
      await expect(
        page.getByTestId("config.ac.edit.type").getByText("Run SQL"),
      ).toHaveCount(0);
      await page.getByTestId("AskLLMAccessControl").click();
      await page.getByTestId("AskLLMAccessControl.AllowAll").click();
      await page
        .getByTestId("AskLLMAccessControl.llm_daily_limit")
        .locator("input")
        .fill("3");
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await page.getByTestId("config.ac.save").click();
      await expect
        .poll(() =>
          admin.db.access_control_allowed_llm!.count({
            access_control_id: readerRule.id,
            ...allowedLLM,
          }),
        )
        .toBe(1);
      await expect(page.getByTestId("config.ac.edit.user")).toBeHidden();
      await page
        .locator(".ExistingAccessRules_Item")
        .filter({ hasText: "app_reader" })
        .click();
      await page.getByTestId("AskLLMAccessControl").click();
      await page.getByRole("button", { name: "Disable", exact: true }).click();
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await page.getByTestId("config.ac.save").click();
      await expect
        .poll(() =>
          admin.db.access_control_allowed_llm!.count({
            access_control_id: readerRule.id,
          }),
        )
        .toBe(0);
      await expect(page.getByTestId("config.ac.edit.user")).toBeHidden();
      await page
        .locator(".ExistingAccessRules_Item")
        .filter({ hasText: "app_editor" })
        .click();
      await page.getByTestId("AskLLMAccessControl").click();
      await page
        .getByTestId("AskLLMAccessControl.llm_daily_limit")
        .locator("input")
        .fill("4");
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await page.getByTestId("config.ac.save").click();
      await expect
        .poll(
          async () =>
            (await admin.db.access_control!.findOne({ id: ownerRule.id }))!
              .llm_daily_limit,
        )
        .toBe(4);
      expect(
        await admin.db.access_control_allowed_llm!.count({
          access_control_id: ownerRule.id,
          ...allowedLLM,
        }),
      ).toBe(1);
      await page.goto(`${deployment.endpoint}/users`);
      await expect(
        page.getByText("owner", { exact: true }).first(),
      ).toBeVisible();
      await context.close();

      const readerContext = await browser.newContext({
        storageState: deployment.storageStateAs("reader"),
      });
      const readerPage = await readerContext.newPage();
      await readerPage.goto(`${deployment.endpoint}/connections`);
      await expect(readerPage).toHaveURL(
        new RegExp(`/connections/${connection.id}`),
      );
      await readerContext.close();
    });

    await test.step("business admins can manage a second connection and choose between connections", async () => {
      const [secondConnection] = await admin.sql!(
        `INSERT INTO connections (name, type, db_name, db_host, db_port, db_user, db_pass, db_conn)
         SELECT 'Second business connection', type, db_name, db_host, db_port, db_user, db_pass, db_conn
         FROM connections WHERE id = $1 RETURNING id`,
        [connection.id],
        { returnType: "rows" },
      );
      if (!secondConnection) throw new Error("Business connection not created");
      expect(await owner.db.connections!.count()).toBe(2);
      const secondRule = await owner.db.access_control!.insert(
        {
          database_id: readerRule.database_id,
          access_control_connections: [{ connection_id: secondConnection.id }],
          dbPermissions: {
            type: "All views/tables",
            allowAllTables: ["select"],
          },
        },
        { returning: "*" },
      );
      await expect(
        owner.db.access_control_connections!.insert({
          connection_id: connection.id,
          access_control_id: secondRule.id,
        }),
      ).rejects.toBeTruthy();
      const context = await browser.newContext({
        storageState: deployment.storageStateAs("owner"),
      });
      const page = await context.newPage();
      await page.goto(`${deployment.endpoint}/connections`);
      await expect(page.getByTestId("Connections")).toBeVisible();
      await expect(page).toHaveURL(`${deployment.endpoint}/connections`);
      await context.close();
      await owner.db.access_control!.delete({ id: secondRule.id });
      await admin.sql!("DELETE FROM connections WHERE id = $1", [
        secondConnection.id,
      ]);
    });

    await test.step("removing a type's rule revokes its live connections", async () => {
      const reader = await deployment.connectProjectAs("reader");
      const state = await deployment.connectStateAs("reader");
      const removedGrants = await owner.db.access_control_user_types!.delete(
        { access_control_id: readerRule.id, user_type: readerType },
        { returning: "*" },
      );
      expect(removedGrants).toHaveLength(1);
      await expect
        .poll(
          () =>
            reader.db.records?.count?.().then(
              () => true,
              () => false,
            ) ?? false,
        )
        .toBe(false);
      await expect
        .poll(() => state.db.connections!.count().catch(() => 0))
        .toBe(0);
      const revoked = await deployment.connectStateAs("reader");
      expect(await revoked.db.connections!.count()).toBe(0);
      await expect(
        revoked.methods!.startConnection!({ connectionId: connection.id }),
      ).rejects.toBeTruthy();
      await owner.db.access_control_user_types!.insert({
        access_control_id: readerRule.id,
        user_type: readerType,
      });
    });

    await test.step("type changes revoke cached access and preserve function filter semantics", async () => {
      const reader = await deployment.connectProjectAs("reader");
      expect(reader.auth.user!.type).toBe(readerType);
      expect(reader.methods?.addRecord).toBeUndefined();
      await owner.db.users!.update({ id: readerId }, { type: editorType });
      await expect
        .poll(
          () =>
            reader.db.records?.count?.().then(
              () => true,
              () => false,
            ) ?? false,
        )
        .toBe(false);
      const editor = await deployment.connectProjectAs("reader");
      expect(editor.auth.user!.type).toBe(editorType);
      expect(
        await editor.methods!.addRecord!({ value: "Written by editor" }),
      ).toBe(editorType);
      const updatedState = await deployment.connectStateAs("reader");
      expect(updatedState.auth.user!.type).toBe(editorType);
      await owner.db.users!.update({ id: readerId }, { type: "default" });
      await expect
        .poll(
          () =>
            editor.db.records?.count?.().then(
              () => true,
              () => false,
            ) ?? false,
        )
        .toBe(false);
      const revoked = await deployment.connectStateAs("reader");
      expect(await revoked.db.connections!.count()).toBe(0);
      await expect(
        revoked.methods!.startConnection!({ connectionId: connection.id }),
      ).rejects.toBeTruthy();
    });

    await test.step("delegated authority is revoked when an admin becomes an ordinary user", async () => {
      await owner.db
        .users!.update({ id: ownerId }, { type: "default" })
        .catch(() => undefined);
      await expect
        .poll(
          async () => (await admin.db.users!.findOne({ id: ownerId }))!.type,
        )
        .toBe("default");
      await expect
        .poll(() => owner.db.user_types!.count().catch(() => 0))
        .toBeLessThanOrEqual(1);
      const demoted = await deployment.connectStateAs("owner");
      expect(demoted.db.user_types).not.toHaveProperty("insert");
      expect(demoted.db.users).not.toHaveProperty("insert");
      expect(demoted.db.access_control ?? {}).not.toHaveProperty("insert");
    });
  } finally {
    await deployment.dispose();
  }
});
