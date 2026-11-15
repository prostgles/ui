import { getMCPFullToolName } from "common/mcpUtils";
import { omitKeys } from "prostgles-types";
import type { editor } from "../../../client/src/dashboard/W_SQL/monacoEditorTypes";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { DEFAULT_AGENT_MODEL } from "../../../server/dist/server/src/serverFunctions/askLLM/refreshModels";
import { expect, test } from "./fixtures";
import {
  getMonacoEditorBySelector,
  getMonacoValue,
  monacoType,
} from "../utils/utils";

test("Saved workflow definition edits persist and report validation errors", async ({
  page,
}) => {
  const configId = "workflow-definition-e2e";
  const selectedPageText = `Second page\n${"Long page text. ".repeat(100)}`;
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({
      id: configId,
      connection: {
        table_options: {
          workflow_items: {
            label: "Workflow records",
            icon: "ClipboardListOutline",
            sort: [{ key: "id", asc: false }],
            card: {
              headerColumn: "label",
              summaryFields: ["group_id"],
              layoutSections: [{ items: ["id", "pages"] }],
            },
            columns: {
              group_id: { label: "Group" },
            },
          },
          workflow_items_without_key: { label: "workflow_items_without_key" },
          workflow_items_single_key: { label: "workflow_items_single_key" },
          workflow_items_unique_keys: { label: "workflow_items_unique_keys" },
        },
      },
      tableConfig: {
        workflow_items: {
          columns: {
            group_id: "integer NOT NULL",
            id: "integer NOT NULL",
            label: "text",
            pages: "text[]",
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
        INSERT INTO workflow_items (group_id, id, label) VALUES
          (0, 0, 'inserted row'), (1, 0, 'same id'), (0, 1, 'same group');
        INSERT INTO workflow_items_without_key VALUES ('first row'), ('second row');
        INSERT INTO workflow_items_single_key VALUES (0), (1), (2);
        INSERT INTO workflow_items_unique_keys (group_id, id, label)
          SELECT group_id, id, label FROM workflow_items;
      `);
      await projectDatabase.query(
        "UPDATE workflow_items SET pages = $1 WHERE group_id = 0 AND id = 0",
        [["First page", selectedPageText]],
      );
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
    const missingModelMessage = `Default Model ${DEFAULT_AGENT_MODEL} not found or has no credentials`;
    const definitionData = {
      containerConfiguration: { timeout: 60_000 },
      databaseAccessDefinitions: { mode: "execute_readonly_sql" as const },
    };
    const originalDefinition = `import { defineAgenticWorkflow } from "#prostgles/workflow";
void defineAgenticWorkflow(
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
        connection_id: connection.id,
        user_id: user.id,
        tool_use_id: toolUseId,
        name: "Editable workflow",
        saved: true,
        definition: originalDefinition,
        definition_summary: args.workflow_function_definition_summary,
        definition_data: definitionData,
      },
      { returning: "*" },
    );
    expect(workflow).not.toHaveProperty("chat_id");
    expect(workflow).not.toHaveProperty("message_id");
    const recordWorkflowCreation = (chatId: number, workflowId: number) =>
      sql!(
        `INSERT INTO mcp_server_tool_calls
        (chat_id, user_id, mcp_full_tool_name, input, output, finished_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          chatId,
          user.id,
          toolName,
          JSON.stringify(args),
          JSON.stringify({ structuredContent: { isValid: true, workflowId } }),
        ],
      );
    await recordWorkflowCreation(chat.id, workflow.id);
    await db.llm_messages!.insert({
      chat_id: chat.id,
      message: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          tool_name: toolName,
          content: JSON.stringify({
            isValid: false,
            error: { message: missingModelMessage },
            logs: "",
          }),
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
    /* Workflow validation shows the missing-model error in the chat. */
    const errorPage = await page.context().newPage();
    await errorPage.goto(deployment.dashboardUrl);
    await errorPage.getByTestId("AskLLM").click();
    await expect(
      errorPage.getByTestId("AgenticWorkflow.validationErrorLogs"),
    ).toHaveText(missingModelMessage);
    await errorPage.close();
    /* Identical names and tool-use IDs in another chat must not affect the lookup. */
    const unrelatedWorkflow = await db.agentic_workflows!.insert(
      { ...omitKeys(workflow, ["id", "source_key"]), saved: false },
      { returning: "*" },
    );
    const unrelatedChat = await db.llm_chats!.insert(
      { user_id: user.id, connection_id: connection.id, model: model.id },
      { returning: "*" },
    );
    await db.llm_messages!.insert({
      ...omitKeys(message, ["id"]),
      chat_id: unrelatedChat.id,
    });
    await recordWorkflowCreation(unrelatedChat.id, unrelatedWorkflow.id);
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
    /* The saved workflow finds its chat through the successful creation call. */
    await page.getByRole("button", { name: "Show chat", exact: true }).click();
    await expect(
      page.getByTestId("AgenticWorkflow.validationErrorLogs"),
    ).toHaveText(missingModelMessage);
    await page.getByTestId("AskLLM.popup").getByTestId("Popup.close").click();
    await openDefinition();
    const editorSelector = '[data-command="AgenticWorkflow"]';
    const getSuggestions = async (afterText: string) => {
      const monacoEditor = await getMonacoEditorBySelector(
        page,
        editorSelector,
      );
      await monacoEditor.evaluate(async (node, afterText) => {
        const { editorRef } = node.parentElement as HTMLElement & {
          editorRef: editor.IStandaloneCodeEditor;
        };
        const model = editorRef.getModel()!;
        const offset = model.getValue().indexOf(afterText) + afterText.length;
        editorRef.focus();
        editorRef.setPosition(model.getPositionAt(offset));
        editorRef.trigger("test", "hideSuggestWidget", undefined);
        await editorRef.getAction("editor.action.triggerSuggest")!.run();
      }, afterText);
      const suggestions = page.locator(".suggest-widget.visible .label-name");
      await expect(suggestions.first()).toBeVisible();
      return suggestions.allTextContents();
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
    /* Refresh suggestions that were opened before the schema changed. */
    await getSuggestions("tableHandlers.");
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
    await expect
      .poll(() => getSuggestions("find({ "))
      .toContain("created_label");
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
    expect(await db.agentic_workflows!.count({ id: workflow.id })).toBe(1);
    await page.reload();
    await openDefinition();
    expect(await getMonacoValue(page, editorSelector)).toBe(
      correctedDefinition,
    );

    /* Activity is associated with its run without an originating chat or message. */
    const workflowRun = await db.agentic_workflow_runs!.insert(
      {
        workflow_id: workflow.id,
        user_id: user.id,
        user_input_value: {},
        state: { status: "completed" },
        log: [],
      },
      { returning: "*" },
    );

    /* Live logs preserve the definition draft and scroll position across tab switches. */
    const workflowView = page.getByTestId("AgenticWorkflow");
    const runningDraft = `${correctedDefinition}\n${"/* Unsaved draft line */\n".repeat(60)}`;
    await monacoType(page, editorSelector, runningDraft, { keyPressDelay: 0 });
    const definitionEditor = await (
      await getMonacoEditorBySelector(page, editorSelector)
    ).evaluateHandle(
      (node) =>
        (
          node.parentElement as HTMLElement & {
            editorRef: editor.IStandaloneCodeEditor;
          }
        ).editorRef,
    );
    await definitionEditor.evaluate((editor) => editor.setScrollTop(200));
    await db.agentic_workflow_runs!.update(
      { id: workflowRun.id },
      {
        state: { status: "running", message: "Scroll regression progress" },
        log: [{ type: "stdout", text: "First workflow log\n" }],
      },
    );
    await expect(page.getByTestId("AgenticWorkflowActions")).toContainText(
      "Scroll regression progress",
    );
    await expect(workflowView.locator(".monaco-editor")).toHaveCount(1);
    await workflowView
      .getByRole("button", { name: "Logs", exact: true })
      .click();
    await expect
      .poll(() => getMonacoValue(page, editorSelector))
      .toBe("First workflow log\n");
    await db.agentic_workflow_runs!.update(
      { id: workflowRun.id },
      { log: [{ type: "stdout", text: "Latest workflow log\n" }] },
    );
    await expect
      .poll(() => getMonacoValue(page, editorSelector))
      .toBe("Latest workflow log\n");
    await workflowView
      .getByRole("button", { name: "Definition", exact: true })
      .click();
    await expect(workflowView.locator(".monaco-editor")).toHaveCount(1);
    expect(
      await definitionEditor.evaluate((editor) => ({
        value: editor.getValue(),
        scrollTop: editor.getScrollTop(),
      })),
    ).toEqual({ value: runningDraft, scrollTop: 200 });
    await definitionEditor.dispose();
    await db.agentic_workflow_runs!.update(
      { id: workflowRun.id },
      { state: { status: "completed" } },
    );

    const orchestratorChat = await db.llm_chats!.insert(
      {
        user_id: user.id,
        connection_id: connection.id,
        model: model.id,
        parent_agentic_workflow_run_id: workflowRun.id,
        agent_info: { type: "orchestrator" },
      },
      { returning: "*" },
    );
    const activityOutputMarker = "large-workflow-tool-output";
    const activityInputMarker = "large-workflow-tool-input";
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
          data: {
            group_id: 9,
            id: 9,
            payload: activityInputMarker.repeat(4096),
          },
        }),
        JSON.stringify({
          structuredContent: {
            group_id: 0,
            id: 0,
            payload: activityOutputMarker.repeat(4096),
          },
          content: [{ type: "text", text: activityOutputMarker.repeat(4096) }],
        }),
      ],
      { returnType: "value" },
    );
    let receivedLargeToolOutput = false;
    let receivedLargeToolInput = false;
    page.on("websocket", (socket) => {
      socket.on("framereceived", ({ payload }) => {
        if (payload.toString().includes(activityOutputMarker)) {
          receivedLargeToolOutput = true;
        }
        if (payload.toString().includes(activityInputMarker)) {
          receivedLargeToolInput = true;
        }
      });
    });
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
    const openActivityToolCall = async (
      tableName: string,
      expectedCount: number | undefined,
    ) => {
      receivedLargeToolOutput = false;
      receivedLargeToolInput = false;
      await page.reload();
      await openDefinition();
      await page
        .getByTestId("AgenticWorkflow")
        .getByRole("button", { name: "Activity", exact: true })
        .click();
      /* The timeline must not download full tool outputs before opening a call. */
      await expect(
        page.getByTestId("AgenticWorkflow.openToolCall"),
      ).toBeVisible();
      expect(receivedLargeToolOutput).toBe(false);
      expect(receivedLargeToolInput).toBe(false);
      await page.getByTestId("AgenticWorkflow.openToolCall").click();
      const tablePopup = page.getByTestId("ToolCall");
      const cardList = tablePopup.locator(".DatabaseToolCall");
      const tableLabel =
        connection.table_options?.[tableName]?.label ?? tableName;
      if (expectedCount !== undefined) {
        await expect(cardList.getByRole("heading")).toHaveText(
          `${tableLabel} (${expectedCount})`,
        );
        await expect(cardList.locator(".SmartCard")).toHaveCount(expectedCount);
      }
      await expect(cardList.getByPlaceholder("Search ...")).toHaveCount(0);
      await expect(cardList.locator("#orderbycomp")).toHaveCount(0);
      return tablePopup;
    };
    /* Activity results retain table labels and icons, showing only returned fields. */
    const filteredTable = await openActivityToolCall("workflow_items", 1);
    expect(receivedLargeToolOutput).toBe(true);
    expect(receivedLargeToolInput).toBe(true);
    const configuredTableIconPath = await page
      .locator('[data-label="Workflow records"] svg path')
      .getAttribute("d");
    expect(configuredTableIconPath).toBeTruthy();
    for (const icon of [
      page
        .getByTestId("AgenticWorkflow.openToolCall")
        .locator("svg path")
        .first(),
      filteredTable.getByRole("banner").locator("svg path").first(),
      filteredTable.locator(".DatabaseToolCall svg path").first(),
      workflowView
        .getByRole("button", {
          name: "db insert workflow_items (1)",
          exact: true,
        })
        .locator("svg path"),
    ]) {
      await expect(icon).toHaveAttribute("d", configuredTableIconPath!);
    }
    await expect(filteredTable).not.toContainText("inserted row");
    await expect(filteredTable).toContainText(activityOutputMarker);
    await expect(filteredTable).not.toContainText("same id");
    await expect(filteredTable).not.toContainText("same group");
    const recordFields = filteredTable.locator(".SmartCard .SmartCardCol");
    await expect(recordFields).toHaveCount(3);
    await expect(recordFields.filter({ hasText: "Group" })).toHaveCount(1);
    /* Tool calls toggle between record cards and their raw input/output. */
    await filteredTable
      .getByRole("button", { name: "JSON input/output" })
      .click();
    await expect(filteredTable.locator(".DatabaseToolCall")).not.toBeVisible();
    await expect(filteredTable).toContainText("Input:");
    await expect(filteredTable).toContainText("Output:");
    expect(receivedLargeToolOutput).toBe(true);
    expect(receivedLargeToolInput).toBe(true);
    /* JSON panels use the available space and still collapse when minimized. */
    const originalViewport = page.viewportSize();
    await page.setViewportSize({ width: 1280, height: 1200 });
    const jsonPanels = filteredTable.getByTestId("MarkdownMonacoCode");
    await expect(jsonPanels).toHaveCount(2);
    for (const panel of await jsonPanels.all()) {
      await expect
        .poll(() => panel.evaluate((element) => element.clientHeight))
        .toBeGreaterThanOrEqual(400);
    }
    await jsonPanels
      .first()
      .getByTestId("FullscreenWrapper.toggleMinimize")
      .click();
    await expect
      .poll(() =>
        jsonPanels.first().evaluate((element) => element.clientHeight),
      )
      .toBeLessThan(100);
    await jsonPanels
      .first()
      .getByTestId("FullscreenWrapper.toggleMinimize")
      .click();
    if (originalViewport) await page.setViewportSize(originalViewport);
    await filteredTable.getByRole("button", { name: "Tool UI" }).click();
    await expect(filteredTable.locator(".DatabaseToolCall")).toBeVisible();
    await expect(filteredTable.getByTestId("FilterWrapper")).toHaveCount(0);
    await expect(
      filteredTable.getByTitle("Click to expand/collapse"),
    ).toHaveCount(0);
    await expect(
      filteredTable.getByTestId("SmartCard.viewEditRow"),
    ).toHaveCount(0);
    await filteredTable.getByTestId("Popup.close").click();

    await test.step("Activity chips count full labels and combine with search", async () => {
      const activityRows = workflowView.getByTestId(
        "AgenticWorkflow.openToolCall",
      );
      const activitySearch = workflowView.getByTestId("SearchList.Input");
      const insertChip = workflowView.getByRole("button", {
        name: /^db insert workflow_items \(/,
      });
      await expect(insertChip).toHaveAttribute("aria-pressed", "false");
      await insertChip.click();
      await expect(insertChip).toHaveAttribute("aria-pressed", "true");

      /* Counts and matching calls update while a chip is selected. */
      await sql!(
        `INSERT INTO mcp_server_tool_calls
           (chat_id, user_id, mcp_server_name, mcp_tool_name, mcp_full_tool_name, input, output, finished_at)
         SELECT chat_id, user_id, mcp_server_name, mcp_tool_name, mcp_full_tool_name,
           jsonb_build_object('tableName', table_name), '{}', NOW()
         FROM mcp_server_tool_calls, unnest($2::text[]) AS table_name
         WHERE id = $1`,
        [activityId, ["workflow_items", "workflow_items_single_key"]],
      );
      await expect(insertChip).toHaveText("db insert workflow_items (2)");
      await expect(activityRows).toHaveCount(2);
      const otherTableChip = workflowView.getByRole("button", {
        name: "db insert workflow_items_single_key (1)",
        exact: true,
      });
      await expect(otherTableChip).toHaveAttribute("aria-pressed", "false");

      await activitySearch.fill("single_key");
      await expect(activityRows).toHaveCount(0);
      await expect(insertChip).toHaveText("db insert workflow_items (2)");
      await otherTableChip.click();
      await expect(otherTableChip).toHaveAttribute("aria-pressed", "true");
      await expect(activityRows).toHaveCount(1);
      await expect(activityRows).toContainText(
        "db insert workflow_items_single_key",
      );
      await activitySearch.fill("");
      await expect(activityRows).toHaveCount(3);
      await insertChip.click();
      await expect(activityRows).toHaveCount(1);
      await otherTableChip.click();
      await expect(otherTableChip).toHaveAttribute("aria-pressed", "false");
      await expect(activityRows).toHaveCount(3);

      await sql!(
        "DELETE FROM mcp_server_tool_calls WHERE chat_id = $1 AND id <> $2",
        [orchestratorChat.id, activityId],
      );
      await expect(insertChip).toHaveText("db insert workflow_items (1)");
      await expect(otherTableChip).toHaveCount(0);
      await expect(activityRows).toHaveCount(1);
    });

    /* Selected and computed fields appear without adding table summary fields. */
    await updateActivity(
      {
        tableName: "workflow_items",
        filter: { group_id: 0, id: 0 },
        select: {
          group_id: 1,
          id: 1,
          text: { $array_element: ["pages", 2] },
        },
      },
      { structuredContent: [{ group_id: 0, id: 0, text: selectedPageText }] },
      "find",
    );
    const selectedFieldsTable = await openActivityToolCall("workflow_items", 1);
    await expect(selectedFieldsTable).not.toContainText("inserted row");
    await expect(selectedFieldsTable).not.toContainText("First page");
    await expect(selectedFieldsTable.locator(".SmartCardCol")).toHaveCount(3);
    const selectedTextField = selectedFieldsTable
      .locator(".SmartCardCol")
      .filter({ hasText: "Second page" });
    await expect(selectedTextField).toContainText(selectedPageText);
    await expect(selectedTextField).toHaveCSS("white-space", "pre-wrap");
    await expect(selectedTextField).toHaveCSS("max-height", "none");
    expect(await selectedTextField.evaluate((field) => field.style.width)).toBe(
      "100%",
    );
    await selectedFieldsTable.getByTestId("Popup.close").click();

    await test.step("Database details preserve returned fields, filters and row order", async () => {
      const resultScenarios = [
        {
          tableName: "workflow_items",
          toolName: "find",
          input: {
            filter: { $or: [{ group_id: 0 }, { id: 0 }] },
            select: ["label"],
            orderBy: { label: -1 },
            offset: 1,
            limit: 1,
          },
          rows: [{ label: "label at query time" }],
        },
        {
          tableName: "workflow_items",
          toolName: "find",
          input: { select: { pages: 0 }, filter: { group_id: 0 } },
          rows: [{ group_id: 0, id: 0, label: "original label" }],
        },
        {
          tableName: "workflow_items",
          toolName: "find",
          input: { select: { total: { $countAll: [] } }, filter: {} },
          rows: [{ total: 3 }],
        },
        {
          tableName: "workflow_items",
          toolName: "find",
          input: { select: { related: { $leftJoin: "workflow_items" } } },
          rows: [
            {
              related: [{ label: "nested result" }],
              empty: null,
              enabled: false,
            },
          ],
        },
        {
          tableName: "workflow_items_without_key",
          toolName: "find",
          input: { filter: { label: "first row" } },
          rows: [{ label: "first row" }],
        },
        {
          tableName: "workflow_items",
          toolName: "update",
          input: { filter: { id: 9 }, data: { id: 0 }, returning: ["id"] },
          rows: [{ id: 0 }],
        },
        {
          tableName: "workflow_items",
          toolName: "delete",
          input: { filter: { id: 9 }, returning: "*" },
          rows: [{ id: 9, label: "deleted row" }],
        },
        {
          tableName: "workflow_items_single_key",
          toolName: "find",
          input: { filter: {}, orderBy: { id: -1 }, limit: 2 },
          rows: [{ id: 2 }, { id: 1 }],
        },
        {
          tableName: "workflow_items_single_key",
          toolName: "insertMany",
          input: { data: [{ id: 9 }, { id: 8 }], returning: "*" },
          rows: [{ id: 9 }, { id: 8 }],
        },
        {
          tableName: "unavailable_table",
          toolName: "find",
          input: { filter: {} },
          rows: [{ label: "historical result" }],
        },
        {
          tableName: "workflow_items",
          toolName: "find",
          input: { filter: {} },
          rows: [],
        },
      ];
      for (const { tableName, toolName, input, rows } of resultScenarios) {
        await updateActivity(
          { tableName, ...input },
          { structuredContent: rows },
          toolName,
        );
        const resultPopup = await openActivityToolCall(tableName, rows.length);
        for (const [index, row] of rows.entries()) {
          const fields = resultPopup
            .locator(".SmartCard")
            .nth(index)
            .locator(".SmartCardCol");
          await expect(fields).toHaveCount(Object.keys(row).length);
          for (const [name, value] of Object.entries(row)) {
            const label =
              connection.table_options?.[tableName]?.columns?.[name]?.label ??
              name;
            await expect(
              fields.filter({
                has: page.getByText(new RegExp(`^${label}$`, "i")),
              }),
            ).toContainText(
              typeof value === "string" ? value : (
                JSON.stringify(value, null, 2)
              ),
            );
          }
        }
        if (!rows.length) await expect(resultPopup).toContainText("No records");
        await resultPopup.getByTestId("Popup.close").click();
      }
    });

    await test.step("Large JSON results use a bounded viewer without truncating values", async () => {
      const largeJson = Array.from({ length: 5000 }, (_, index) => index);
      for (const { output, expectedCount } of [
        { output: largeJson, expectedCount: undefined },
        { output: [{ details: largeJson }], expectedCount: 1 },
      ]) {
        await updateActivity(
          { tableName: "workflow_items", filter: {} },
          { structuredContent: output },
          "find",
        );
        const resultPopup = await openActivityToolCall(
          "workflow_items",
          expectedCount,
        );
        const jsonViewer = resultPopup.getByTestId("MarkdownMonacoCode");
        await expect(jsonViewer).toBeVisible();
        await expect(jsonViewer).toHaveCSS("height", "300px");
        const resultSelector = '[data-command="ToolCall"]';
        expect(await getMonacoValue(page, resultSelector)).toBe(
          JSON.stringify(largeJson, null, 2),
        );
        const jsonEditor = await getMonacoEditorBySelector(
          page,
          resultSelector,
        );
        expect(await jsonEditor.locator(".view-line").count()).toBeLessThan(
          100,
        );
        await resultPopup.getByTestId("Popup.close").click();
      }
    });

    /* Chat results support both JSON strings and text blocks, including single rows. */
    for (const content of [
      JSON.stringify({ group_id: 0, id: 0 }),
      [{ type: "text", text: JSON.stringify([{ group_id: 0, id: 0 }]) }],
    ]) {
      await updateActivity(
        { tableName: "workflow_items", data: { group_id: 9, id: 9 } },
        { content },
      );
      const textResultTable = await openActivityToolCall("workflow_items", 1);
      await expect(textResultTable.locator(".SmartCardCol")).toHaveCount(2);
      await expect(textResultTable).not.toContainText("inserted row");
      await textResultTable.getByTestId("Popup.close").click();
    }

    /* Scalar and absent outputs must never fetch records using the input. */
    for (const { toolName, output, expectedText } of [
      {
        toolName: "count",
        output: { structuredContent: 0 },
        expectedText: "0",
      },
      {
        toolName: "count",
        output: { content: [{ type: "text", text: "2" }] },
        expectedText: "2",
      },
      {
        toolName: "update",
        output: { structuredContent: null },
        expectedText: "null",
      },
      {
        toolName: "delete",
        output: { content: [{ type: "text", text: "Deleted" }] },
        expectedText: "Deleted",
      },
      ...["insert", "insertMany", "update", "delete"].map((toolName) => ({
        toolName,
        output: { content: [] },
        expectedText: "No result returned",
      })),
    ]) {
      await updateActivity(
        {
          tableName: "workflow_items",
          filter: {},
          data: { group_id: 0, id: 0 },
        },
        output,
        toolName,
      );
      const resultPopup = await openActivityToolCall(
        "workflow_items",
        undefined,
      );
      await expect(
        resultPopup.getByText(expectedText, { exact: true }),
      ).toBeVisible();
      await expect(resultPopup.locator(".SmartCard")).toHaveCount(0);
      await resultPopup.getByTestId("Popup.close").click();
    }

    /* Database calls retain text errors alongside structured errors. */
    const toolErrorMessage = "Database tool error";
    await updateActivity(
      { tableName: "workflow_items", data: {} },
      {
        isError: true,
        structuredContent: { message: toolErrorMessage },
        content: [{ type: "text", text: toolErrorMessage }],
      },
    );
    await page.getByTestId("AgenticWorkflow.openToolCall").click();
    const failedToolCall = page.getByTestId("ToolCall");
    await expect(failedToolCall).toContainText(toolErrorMessage);
    await failedToolCall.getByTestId("Popup.close").click();

    /* Missing tool icons and tool names fall back to the MCP server icon. */
    await db.mcp_servers!.update(
      { name: "db" },
      { icon_path: "ClipboardListOutline" },
    );
    await updateActivity({}, { content: [] });
    for (const toolIcon of [null, ""]) {
      await sql!(
        "UPDATE mcp_server_tools SET icon = $1 WHERE server_name = 'db' AND name = 'insert'",
        [toolIcon],
      );
      await page.reload();
      await openDefinition();
      await page
        .getByTestId("AgenticWorkflow")
        .getByRole("button", { name: "Activity", exact: true })
        .click();
      await expect(
        page
          .getByTestId("AgenticWorkflow.openToolCall")
          .locator("svg path")
          .first(),
      ).toHaveAttribute("d", configuredTableIconPath!);
    }
    await sql!(
      "UPDATE mcp_server_tool_calls SET mcp_tool_name = NULL WHERE id = $1",
      [activityId],
    );
    await expect(
      page.getByTestId("AgenticWorkflow.openToolCall"),
    ).toContainText("db null");
    await expect(
      page
        .getByTestId("AgenticWorkflow.openToolCall")
        .locator("svg path")
        .first(),
    ).toHaveAttribute("d", configuredTableIconPath!);
    /* Editing running workflow inputs preserves other values and explicit clears. */
    await db.agentic_workflows!.update(
      { id: workflow.id },
      {
        definition_data: {
          ...definitionData,
          userInput: {
            source: { title: "Source", type: "custom", dataType: "string" },
            destination: {
              title: "Destination",
              type: "custom",
              dataType: "string",
              defaultValue: "Default destination",
            },
            table: { title: "Table", type: "table-name", optional: true },
            file: {
              title: "File",
              type: "file-path",
              accessMode: "read",
              optional: true,
            },
            filter: {
              title: "Filter",
              type: "table-filter",
              tableName: "workflow_items",
              optional: true,
            },
            columnValue: {
              title: "Column value",
              type: "table-column-value",
              tableName: "workflow_items",
              columnName: "label",
              optional: true,
            },
          },
        },
      },
    );
    const runInputValues = {
      source: "Run source",
      destination: "Run destination",
    };
    await db.agentic_workflow_runs!.update(
      { id: workflowRun.id },
      {
        user_input_value: runInputValues,
        state: { status: "running" },
      },
    );
    await page.reload();
    await openDefinition();
    await page
      .getByTestId("AgenticWorkflow")
      .getByRole("button", { name: "Details", exact: true })
      .click();
    const workflowInputs = page.getByTestId("UserInput");
    const sourceInput = workflowInputs.getByRole("textbox", {
      name: "Source",
      exact: true,
    });
    const destinationInput = workflowInputs.getByRole("textbox", {
      name: "Destination",
      exact: true,
    });
    /* Single-line workflow fields match the 32px buttons' height and text. */
    await expect(sourceInput.locator("..")).toHaveCSS("height", "32px");
    await expect(destinationInput.locator("..")).toHaveCSS("height", "32px");
    await expect(sourceInput).toHaveCSS("font-size", "14px");
    /* All workflow input renderers use the same compact label size and weight. */
    for (const labelText of [
      "Source",
      "Table (optional)",
      "File (optional) (Read-Only)",
      "Filter (optional)",
      "Column value (optional)",
    ]) {
      const inputLabel = workflowInputs.getByText(labelText, { exact: true });
      await expect(inputLabel).toHaveCSS("font-size", "14px");
      await expect(inputLabel).toHaveCSS("font-weight", "400");
    }
    await expect(sourceInput).toHaveValue(runInputValues.source);
    await expect(destinationInput).toHaveValue(runInputValues.destination);
    await destinationInput.fill("Edited destination");
    await expect(sourceInput).toHaveValue(runInputValues.source);
    await sourceInput.fill("");
    await expect(destinationInput).toHaveValue("Edited destination");
    await destinationInput.fill("Next destination");
    await expect(sourceInput).toHaveValue("");
    await db.agentic_workflow_runs!.update(
      { id: workflowRun.id },
      { state: { status: "running", message: "Input regression progress" } },
    );
    await expect(page.getByTestId("AgenticWorkflowActions")).toContainText(
      "Input regression progress",
    );
    await expect(sourceInput).toHaveValue("");
    await expect(destinationInput).toHaveValue("Next destination");
    expect(
      (await db.agentic_workflow_runs!.findOne({ id: workflowRun.id }))
        ?.user_input_value,
    ).toEqual(runInputValues);

    /* Starting from the saved workflow creates a separate run. */
    await db.agentic_workflow_runs!.update(
      { id: workflowRun.id },
      { state: { status: "completed" }, finished: new Date().toISOString() },
    );
    await sourceInput.fill("Run source");
    await page.getByTestId("AgenticWorkflow.start").click();
    await expect
      .poll(
        async () => {
          const latestRun = await db.agentic_workflow_runs!.findOne(
            { workflow_id: workflow.id },
            { orderBy: { id: -1 } },
          );
          return latestRun?.id === workflowRun.id ? undefined : latestRun;
        },
        { timeout: 120_000 },
      )
      .toMatchObject({
        state: { status: "completed" },
      });

    /* Deleting the original chat leaves the saved workflow usable. */
    await db.llm_chats!.delete({ id: chat.id });
    await page.reload();
    await openDefinition();
    await expect(
      page.getByRole("button", { name: "Show chat", exact: true }),
    ).not.toBeVisible();
    expect(await getMonacoValue(page, editorSelector)).toBe(
      correctedDefinition,
    );
    await page.getByTestId("AgenticWorkflow.start").click();
    await expect
      .poll(() => db.agentic_workflow_runs!.count({ workflow_id: workflow.id }))
      .toBe(3);
    await expect
      .poll(
        () =>
          db.agentic_workflow_runs!.findOne(
            { workflow_id: workflow.id },
            { orderBy: { id: -1 } },
          ),
        { timeout: 120_000 },
      )
      .toMatchObject({
        state: { status: "completed" },
      });
  } finally {
    await deployment.dispose();
  }
});

test("Workflow tool approvals work without an originating message while chat is open", async ({
  page,
}) => {
  const configId = "workflow-approvals-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({
      id: configId,
      tableConfig: {
        workflow_approval_items: { columns: { label: "text" } },
      },
    }),
    logPath: test.info().outputPath("workflow-approvals-server.log"),
    seed: async ({ stateDatabase }) => {
      await stateDatabase.query(`
        INSERT INTO llm_credentials (provider_id, user_id, api_key)
        SELECT 'OpenRouter', id, 'workflow-approval-test' FROM users WHERE username = 'admin';
      `);
    },
  });
  try {
    const { db, methods, sql } = await deployment.connectStateAs("admin");
    const user = await db.users!.findOne({ username: "admin" });
    const connection = await db.connections!.findOne({ name: configId });
    const model = await db.llm_models!.findOne({ provider_id: "OpenRouter" });
    if (!user || !connection || !model) throw new Error("Missing test setup");
    const chat = await db.llm_chats!.insert(
      { user_id: user.id, connection_id: connection.id, model: model.id },
      { returning: "*" },
    );
    const definitionData = {
      containerConfiguration: { timeout: 120_000 },
      databaseAccessDefinitions: {
        mode: "custom" as const,
        tablePermissions: {
          workflow_approval_items: { insert: true as const },
        },
      },
    };
    const definition = `import { defineAgenticWorkflow } from "#prostgles/workflow";
void defineAgenticWorkflow(
  { name: "Workflow approvals", ...${JSON.stringify(definitionData)} },
  async ({ tableHandlers }) => {
    await tableHandlers.workflow_approval_items.insert({ label: "approved" });
  },
);`;
    const toolUseId = "workflow-approvals";
    const toolName = getMCPFullToolName(
      "prostgles-ui",
      "create_agentic_workflow",
    );
    const workflow = await db.agentic_workflows!.insert(
      {
        connection_id: connection.id,
        user_id: user.id,
        tool_use_id: toolUseId,
        name: "Workflow approvals",
        saved: true,
        definition,
        definition_summary: "Workflow approval regression",
        definition_data: definitionData,
      },
      { returning: "*" },
    );
    const message = await db.llm_messages!.insert(
      {
        chat_id: chat.id,
        message: [
          {
            type: "tool_use",
            id: toolUseId,
            name: toolName,
            input: {
              workflow_function_definition: definition,
              workflow_function_definition_summary: workflow.definition_summary,
            },
          },
        ],
        total_tokens: 0,
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
    await methods!.startConnection!({ connectionId: connection.id });
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await page.getByTestId("AskLLM").click();
    await expect(page.getByTestId("AgenticWorkflow")).toBeVisible();

    for (const { response, messageId } of [
      { response: "approve", messageId: undefined },
      { response: "deny", messageId: undefined },
      { response: "approve", messageId: message.id },
    ] as const) {
      /* Chat attribution is preserved when present; standalone runs need none. */
      const runPromise = methods!.startAgenticWorkflow!({
        workflowId: workflow.id,
        userInputValue: {},
        executionMode: "series",
        autoApproveAllTools: false,
        ...(messageId && { chatId: chat.id, messageId }),
      });
      void runPromise.catch(() => {});
      await expect(page.getByTestId("AgenticWorkflow.reviewTool")).toBeVisible({
        timeout: 120_000,
      });
      const approval = await db.mcp_tool_approval_requests!.findOne({
        response: null,
        server_name: "db",
        tool_name: "insert",
      });
      expect(approval?.source).toEqual({
        type: "proxy",
        parentToolUseMessageId: messageId ?? null,
      });
      expect(approval?.message_id).toBeNull();
      const approvalDialog = page
        .getByRole("dialog")
        .filter({ has: page.getByTestId("AskLLMToolApprover.AllowOnce") });
      if (await approvalDialog.isVisible()) {
        await approvalDialog.getByTestId("Popup.close").click();
      }
      await page.getByTestId("AgenticWorkflow.reviewTool").click();
      await page
        .getByTestId(
          response === "approve" ?
            "AskLLMToolApprover.AllowOnce"
          : "AskLLMToolApprover.Deny",
        )
        .click();
      const result = await runPromise;
      expect(result.state).toBe(response === "approve" ? "finished" : "error");
      expect(
        await db.llm_messages!.count({
          $existsJoined: {
            llm_chats: { parent_agentic_workflow_run_id: result.runId },
          },
        }),
      ).toBe(0);
      const [toolCallCount] = await sql!(
        `SELECT count(*)::int AS count FROM mcp_server_tool_calls
         WHERE chat_id = $1 AND mcp_server_name = 'db' AND mcp_tool_name = 'insert'`,
        [approval?.chat_id],
        { returnType: "rows" },
      );
      expect(toolCallCount).toEqual({ count: response === "approve" ? 1 : 0 });
      await expect(page.getByTestId("AgenticWorkflow.reviewTool")).toHaveCount(
        0,
      );
    }
    const project = await deployment.connectProjectAs("admin");
    expect(
      await project.sql!(
        "SELECT count(*)::int AS count FROM workflow_approval_items",
        [],
        { returnType: "rows" },
      ),
    ).toEqual([{ count: 2 }]);
  } finally {
    await deployment.dispose();
  }
});
