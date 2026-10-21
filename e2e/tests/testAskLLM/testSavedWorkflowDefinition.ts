import { getMCPFullToolName } from "common/mcpUtils";
import type { editor } from "../../../client/src/dashboard/W_SQL/monacoEditorTypes";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { expect, test } from "../utils/fixtures";
import {
  getMonacoEditorBySelector,
  getMonacoValue,
  monacoType,
  type PageWIds,
} from "../utils/utils";

export const testSavedWorkflowDefinition = async (page: PageWIds) => {
  const configId = "workflow-definition-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({
      id: configId,
      tableConfig: {
        workflow_items: {
          columns: {
            group_id: "integer NOT NULL",
            id: "integer NOT NULL",
            label: "text",
          },
          constraints: { workflow_items_pkey: "PRIMARY KEY (group_id, id)" },
        },
        workflow_items_without_key: { columns: { label: "text" } },
        workflow_items_single_key: {
          columns: { id: "integer PRIMARY KEY" },
        },
        workflow_items_unique_keys: {
          columns: {
            missing_key: "text",
            group_id: "integer",
            id: "integer",
            label: "text",
          },
          constraints: {
            a_missing_key: "UNIQUE (missing_key)",
            b_available_key: "UNIQUE (group_id, id)",
            c_label_key: "UNIQUE (label)",
          },
        },
      },
    }),
    logPath: test.info().outputPath("workflow-definition-server.log"),
    seed: async ({ stateDatabase, projectDatabase }) => {
      await stateDatabase.query(`
        INSERT INTO llm_credentials (provider_id, user_id, api_key)
        SELECT 'OpenRouter', id, 'workflow-editing-test' FROM users WHERE username = 'admin';
      `);
      await projectDatabase.query(`
        INSERT INTO workflow_items VALUES
          (0, 0, 'inserted row'), (1, 0, 'same id'), (0, 1, 'same group');
        INSERT INTO workflow_items_without_key VALUES ('first row'), ('second row');
        INSERT INTO workflow_items_single_key VALUES (0), (1), (2);
        INSERT INTO workflow_items_unique_keys (group_id, id, label)
          SELECT group_id, id, label FROM workflow_items;
      `);
    },
  });
  try {
    const { db, methods, sql } = await deployment.connectStateAs("admin");
    const user = (await db.users!.findOne({ username: "admin" }))!;
    const connection = (await db.connections!.findOne({ name: configId }))!;
    const model = (await db.llm_models!.findOne({
      provider_id: "OpenRouter",
    }))!;
    const chat = await db.llm_chats!.insert(
      { user_id: user.id, connection_id: connection.id, model: model.id },
      { returning: "*" },
    );
    const toolUseId = "editable-workflow";
    const toolName = getMCPFullToolName(
      "prostgles-ui",
      "create_agentic_workflow",
    );
    const definitionData = {
      containerConfiguration: { timeout: 60_000 },
      databaseAccessDefinitions: { mode: "execute_readonly_sql" as const },
    };
    const originalDefinition = `import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
export default defineAgenticWorkflow(
  { name: "Editable workflow", ...${JSON.stringify(definitionData)} },
  async ({ tableHandlers }) => { await tableHandlers.workflow_items.find(); console.log("original"); },
);`;
    const args = {
      workflow_function_definition: originalDefinition,
      workflow_function_definition_summary: "Workflow editing regression",
    };
    const message = await db.llm_messages!.insert(
      {
        chat_id: chat.id,
        message: [
          { type: "tool_use", id: toolUseId, name: toolName, input: args },
        ],
        total_tokens: 0,
      },
      { returning: "*" },
    );
    const workflow = await db.agentic_workflows!.insert(
      {
        chat_id: chat.id,
        connection_id: connection.id,
        user_id: user.id,
        message_id: message.id,
        tool_use_id: toolUseId,
        name: "Editable workflow",
        saved: true,
        definition: originalDefinition,
        definition_summary: args.workflow_function_definition_summary,
        definition_data: definitionData,
      },
      { returning: "*" },
    );
    await db.llm_messages!.insert({
      chat_id: chat.id,
      message: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          tool_name: toolName,
          content: JSON.stringify({ isValid: true, workflowId: workflow.id }),
        },
      ],
      total_tokens: 0,
    });
    await db.mcp_servers!.update({ name: "prostgles-ui" }, { enabled: true });
    const tool = (await db.mcp_server_tools!.findOne({
      server_name: "prostgles-ui",
      name: "create_agentic_workflow",
    }))!;
    await db.llm_chats_allowed_mcp_tools!.insert({
      chat_id: chat.id,
      server_name: "prostgles-ui",
      tool_id: tool.id,
    });
    await methods!.startConnection!({ connectionId: connection.id });
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);

    const openDefinition = async () => {
      await page
        .getByTestId("SavedAgenticWorkflowsAndContainers")
        .getByText(workflow.name, { exact: true })
        .click();
      await page
        .getByTestId("AgenticWorkflow")
        .getByRole("button", { name: "Definition", exact: true })
        .click();
    };
    await openDefinition();
    const editorSelector = '[data-command="AgenticWorkflow"]';
    const getSuggestions = async (afterText: string) => {
      const monacoEditor = await getMonacoEditorBySelector(page, editorSelector);
      await monacoEditor.evaluate(async (node, afterText) => {
        const { editorRef } = node.parentElement as HTMLElement & {
          editorRef: editor.IStandaloneCodeEditor;
        };
        const model = editorRef.getModel()!;
        const offset = model.getValue().indexOf(afterText) + afterText.length;
        editorRef.focus();
        editorRef.setPosition(model.getPositionAt(offset));
        await editorRef.getAction("editor.action.triggerSuggest")!.run();
      }, afterText);
      return page.locator(".suggest-widget.visible .label-name").allTextContents();
    };
    await expect
      .poll(() => getSuggestions("tableHandlers."))
      .toContain("workflow_items");
    expect(await getSuggestions("tableHandlers.")).not.toContain(
      "workflow_items_created_later",
    );
    await page.keyboard.press("Escape");

    const schemaDraft = originalDefinition.replace(
      "workflow_items.find()",
      'workflow_items_created_later.find({ created_label: "" })',
    );
    await monacoType(page, editorSelector, schemaDraft, { keyPressDelay: 0 });
    const projectClient = await deployment.connectProjectAs("admin");
    expect(
      (await projectClient.db.workflow_items!.getInfo!()).uniqueColumnGroups,
    ).toContainEqual(expect.arrayContaining(["group_id", "id"]));
    await projectClient.sql!(
      "CREATE TABLE workflow_items_created_later (created_label text NOT NULL)",
    );
    await expect
      .poll(async () => {
        const { files } = await methods!.getAgenticWorkflowTypes!({
          connectionId: connection.id,
          workflowId: workflow.id,
        });
        return files["defineAgenticWorkflow.ts"];
      })
      .toContain("workflow_items_created_later");
    await expect
      .poll(() => getSuggestions("tableHandlers."), { timeout: 30_000 })
      .toContain("workflow_items_created_later");
    await page.keyboard.press("Escape");
    await expect.poll(() => getSuggestions("find({ ")).toContain("created_label");
    await page.keyboard.press("Escape");
    expect(await getMonacoValue(page, editorSelector)).toBe(schemaDraft);

    const savedDefinition = originalDefinition.replace(
      '"original"',
      '"saved edit"',
    );
    await monacoType(page, editorSelector, savedDefinition, {
      keyPressDelay: 0,
    });
    const saveButton = page.getByRole("button", {
      name: "Save (Ctrl + S)",
      exact: true,
    });
    await saveButton.click();
    await expect
      .poll(
        async () =>
          (await db.agentic_workflows!.findOne({ id: workflow.id }))
            ?.definition,
        { timeout: 120_000 },
      )
      .toBe(savedDefinition);
    await expect(saveButton).not.toBeVisible();
    await page.reload();
    await openDefinition();
    expect(await getMonacoValue(page, editorSelector)).toBe(savedDefinition);

    // Valid TypeScript with an invalid user input table must leave the saved version intact.
    const invalidDefinition = savedDefinition.replace(
      'name: "Editable workflow",',
      'name: "Editable workflow", userInput: { missing: { type: "table-column", title: "Missing", tableName: "missing_workflow_table" } },',
    );
    await monacoType(page, editorSelector, invalidDefinition, {
      keyPressDelay: 0,
    });
    await saveButton.click();
    await expect(
      page.getByTestId("AgenticWorkflow").getByTestId("ErrorComponent"),
    ).toContainText("missing_workflow_table", { timeout: 120_000 });
    expect(await getMonacoValue(page, editorSelector)).toBe(invalidDefinition);
    expect(
      (await db.agentic_workflows!.findOne({ id: workflow.id }))!.definition,
    ).toBe(savedDefinition);

    const correctedDefinition = savedDefinition.replace(
      '"saved edit"',
      '"corrected edit"',
    );
    await monacoType(page, editorSelector, correctedDefinition, {
      keyPressDelay: 0,
    });
    await saveButton.click();
    await expect
      .poll(
        async () =>
          (await db.agentic_workflows!.findOne({ id: workflow.id }))
            ?.definition,
        { timeout: 120_000 },
      )
      .toBe(correctedDefinition);
    expect(await db.agentic_workflows!.count({ chat_id: chat.id })).toBe(1);
    await page.reload();
    await openDefinition();
    expect(await getMonacoValue(page, editorSelector)).toBe(
      correctedDefinition,
    );

    const orchestratorChat = await db.llm_chats!.insert(
      {
        user_id: user.id,
        connection_id: connection.id,
        model: model.id,
        parent_chat_id: chat.id,
        parent_chat_message_id: message.id,
        agent_info: { type: "orchestrator" },
      },
      { returning: "*" },
    );
    const activityId = await sql!(
      `INSERT INTO mcp_server_tool_calls
         (chat_id, user_id, mcp_server_name, mcp_tool_name, mcp_full_tool_name, input, output, finished_at)
       VALUES ($1, $2, 'db', 'insert', $3, $4, $5, NOW()) RETURNING id`,
      [
        orchestratorChat.id,
        user.id,
        getMCPFullToolName("db", "insert"),
        JSON.stringify({
          tableName: "workflow_items",
          data: { group_id: 9, id: 9 },
        }),
        JSON.stringify({ structuredContent: { group_id: 0, id: 0 } }),
      ],
      { returnType: "value" },
    );
    const updateActivity = async (
      input: Record<string, unknown>,
      output: Record<string, unknown>,
      toolName = "insert",
    ) => {
      await sql!(
        "UPDATE mcp_server_tool_calls SET input = $1, output = $2, mcp_tool_name = $3, mcp_full_tool_name = $4 WHERE id = $5",
        [
          JSON.stringify(input),
          JSON.stringify(output),
          toolName,
          getMCPFullToolName("db", toolName),
          activityId,
        ],
      );
    };
    const openActivityTable = async (
      tableName: string,
      expectedCount: string,
    ) => {
      await page.reload();
      await openDefinition();
      await page
        .getByTestId("AgenticWorkflow")
        .getByRole("button", { name: "Activity", exact: true })
        .click();
      await page.getByTestId("AgenticWorkflowActivity.openTable").click();
      const tablePopup = page.getByRole("dialog").last();
      await expect(tablePopup.getByRole("heading")).toHaveText(
        `${tableName} (${expectedCount})`,
      );
      return tablePopup;
    };
    const filteredTable = await openActivityTable("workflow_items", "1/3");
    await expect(filteredTable).toContainText("inserted row");
    await expect(filteredTable).not.toContainText("same id");
    await expect(filteredTable).not.toContainText("same group");
    await expect(filteredTable.getByTestId("FilterWrapper")).toHaveCount(2);
    await filteredTable
      .getByTestId("FilterWrapper.deleteFilter")
      .first()
      .click();
    await expect(filteredTable.getByRole("heading")).toHaveText(
      "workflow_items (2/3)",
    );
    await filteredTable.getByTestId("FilterWrapper.deleteFilter").click();
    await expect(filteredTable.getByRole("heading")).toHaveText(
      "workflow_items (3)",
    );
    await filteredTable.getByTestId("Popup.close").click();

    // Explicit input keys also work when the insert did not request returning.
    await updateActivity(
      { tableName: "workflow_items", data: { group_id: 0, id: 0 } },
      { content: [] },
    );
    const inputFilteredTable = await openActivityTable("workflow_items", "1/3");
    await inputFilteredTable.getByTestId("Popup.close").click();

    // An incomplete composite key must not produce a partial filter.
    await updateActivity(
      { tableName: "workflow_items", data: {} },
      { structuredContent: { id: 0 } },
    );
    const unfilteredTable = await openActivityTable("workflow_items", "3");
    await unfilteredTable.getByTestId("Popup.close").click();

    await updateActivity(
      {
        tableName: "workflow_items_without_key",
        data: { label: "first row" },
      },
      { structuredContent: { label: "first row" } },
    );
    const tableWithoutKey = await openActivityTable(
      "workflow_items_without_key",
      "2",
    );
    await expect(tableWithoutKey).toContainText("first row");
    await expect(tableWithoutKey).toContainText("second row");
    await tableWithoutKey.getByTestId("Popup.close").click();

    for (const output of [
      { content: [] },
      { structuredContent: { group_id: 0, id: 0 } },
      { structuredContent: [{ group_id: 0, id: 0 }] },
    ]) {
      await updateActivity(
        {
          tableName: "workflow_items",
          filter: { group_id: { $eq: 0 }, "id.$eq": 0 },
          data: { label: "inserted row" },
        },
        output,
        "update",
      );
      const updatedTable = await openActivityTable("workflow_items", "1/3");
      await expect(updatedTable).toContainText("inserted row");
      await updatedTable.getByTestId("Popup.close").click();
    }

    // Updated primary keys and returned keys take precedence over the old filter.
    for (const output of [
      { content: [] },
      { structuredContent: [{ group_id: 0, id: 0 }] },
    ]) {
      await updateActivity(
        {
          tableName: "workflow_items",
          filter: { group_id: 9, id: 9 },
          data: { group_id: 0, id: 0 },
        },
        output,
        "update",
      );
      const updatedKeyTable = await openActivityTable("workflow_items", "1/3");
      await updatedKeyTable.getByTestId("Popup.close").click();
    }

    for (const toolName of ["update", "find", "count", "delete"]) {
      await updateActivity(
        {
          tableName: "workflow_items_without_key",
          filter: { $and: [{ label: { $ilike: "first%" } }] },
          ...(toolName === "update" ? { data: {} } : {}),
        },
        { content: [] },
        toolName,
      );
      const inputFilterTable = await openActivityTable(
        "workflow_items_without_key",
        "1/2",
      );
      await expect(inputFilterTable).toContainText("first row");
      await expect(inputFilterTable).not.toContainText("second row");
      await inputFilterTable.getByTestId("Popup.close").click();
    }

    for (const toolName of ["insertMany", "update", "find", "delete"]) {
      await updateActivity(
        {
          tableName: "workflow_items_single_key",
          filter: {},
          data: toolName === "insertMany" ? [{ id: 0 }, { id: 1 }] : {},
        },
        { structuredContent: [{ id: 0 }, { id: 1 }] },
        toolName,
      );
      const multipleRowsTable = await openActivityTable(
        "workflow_items_single_key",
        "2/3",
      );
      await multipleRowsTable.getByTestId("Popup.close").click();
    }

    await updateActivity(
      { tableName: "workflow_items_single_key", data: [{ id: 0 }, { id: 1 }] },
      { content: [] },
      "insertMany",
    );
    const insertedRowsTable = await openActivityTable(
      "workflow_items_single_key",
      "2/3",
    );
    await insertedRowsTable.getByTestId("Popup.close").click();

    // The first complete unique group wins, including on tables without a primary key.
    for (const data of [
      { group_id: 0, id: 0, label: "same id" },
      { label: "inserted row" },
      { missing_key: null, label: "inserted row" },
    ]) {
      await updateActivity(
        { tableName: "workflow_items_unique_keys", data },
        { content: [] },
      );
      const uniqueKeyTable = await openActivityTable(
        "workflow_items_unique_keys",
        "1/3",
      );
      await expect(uniqueKeyTable).toContainText("inserted row");
      await uniqueKeyTable.getByTestId("Popup.close").click();
    }

    await updateActivity(
      { tableName: "workflow_items", filter: {} },
      { structuredContent: [] },
      "find",
    );
    const emptyResultTable = await openActivityTable("workflow_items", "0/3");
    await emptyResultTable.getByTestId("Popup.close").click();

    // Changed filter fields and unsupported conditions must not leave a misleading filter.
    for (const filter of [
      { label: "old label" },
      { $or: [{ label: "first row" }, { label: "second row" }] },
    ]) {
      await updateActivity(
        {
          tableName: "workflow_items_without_key",
          filter,
          data: { label: "first row" },
        },
        { content: [] },
        "update",
      );
      const unfilteredUpdateTable = await openActivityTable(
        "workflow_items_without_key",
        "2",
      );
      await unfilteredUpdateTable.getByTestId("Popup.close").click();
    }
  } finally {
    await deployment.dispose();
  }
};
