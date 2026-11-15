import { expect, test } from "../utils/fixtures";
import { monacoType, openTable } from "../utils/utils";
import { createActionColumn } from "../../../server/dist/server/src/schemaConfig";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import ts from "../../../server/node_modules/typescript";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";

test("CLI workflows persist before execution, isolate runs and save validated TypeScript source", async ({
  page,
}) => {
  test.setTimeout(360_000);
  let requestCount = 0;
  const provider = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: `goal-${++requestCount}`,
                  type: "function",
                  function: {
                    name: "agent_goal_reached",
                    arguments: '{"done":true}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    );
  });
  await new Promise<void>((resolve) =>
    provider.listen(0, "127.0.0.1", resolve),
  );
  const address = provider.address();
  if (!address || typeof address === "string")
    throw new Error("Missing provider port");
  const config = {
    id: "configured-workflows-test",
    llmCredential: {
      provider_id: {
        id: "Prostgles",
        api_url: `http://127.0.0.1:${address.port}/completions`,
      },
      api_key: "unused-test-key",
    },
    workflows: {
      updateNotice: { source: "src/workflows/updateNotice/src/index.ts" },
    },
    tableConfig: {
      notices: {
        columns: {
          id: "integer PRIMARY KEY",
          /* Sorts before the primary key used by workflow invocations. */
          external_id: "text UNIQUE NOT NULL",
          title: "text NOT NULL",
          action: createActionColumn("runWorkflow", { text: "Update notice" }),
        },
      },
    },
  };
  const configPath = createConfigTestProject(
    config,
    test.info().outputPath("config"),
  );
  const sourcePath = join(configPath, config.workflows.updateNotice.source);
  mkdirSync(join(configPath, "src/workflows/updateNotice/src"), {
    recursive: true,
  });
  writeFileSync(sourcePath, workflowSource);
  const runtimePath = resolve(__dirname, "../../../server/dist/server/src");
  appendFileSync(
    join(configPath, "index.js"),
    `
    module.exports.functions = {
      admin: { userFilter: { type: "admin" }, functions: {
        refreshWorkflowTypes: { run: async () => {
          const { statePrgl } = require(${JSON.stringify(join(runtimePath, "init/startProstgles"))});
          const { writeWorkflowTypes } = require(${JSON.stringify(join(runtimePath, "McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/getConfiguredWorkflow"))});
          const connection = await statePrgl.db.connections.findOne({ name: ${JSON.stringify(config.id)} });
          await writeWorkflowTypes(statePrgl.db, connection.id, module.exports.workflows, ${JSON.stringify(configPath)});
          const { getAgenticWorkflowToolSchema } = require(${JSON.stringify(join(runtimePath, "McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/schemas/getAgenticToolSchemas"))});
          return getAgenticWorkflowToolSchema({ dbs: statePrgl.db, availableMCPTools: [] });
        } },
        runWorkflow: {
          input: {
            id: { type: "ValueLookup", table: "notices", column: "id" },
            title: "string", delay: "number",
          },
          run: (input, { context }) => context.startAgenticWorkflow("updateNotice", input, { autoApproveAllTools: true }),
        },
      } },
    };
  `,
  );
  let deployment: Awaited<ReturnType<typeof createTestDeployment>> | undefined;
  try {
    deployment = await createTestDeployment({
      configPath,
      configId: config.id,
      /* Startup builds and validates the configured workflow in Docker. */
      startupTimeoutMs: 180_000,
      users: [
        { key: "admin", type: "admin" },
        { key: "otherAdmin", type: "admin" },
        { key: "viewer", type: "default" },
      ],
      logPath: test.info().outputPath("deployment.log"),
      seed: async ({ projectDatabase, stateDatabase }) => {
        const configuredWorkflows = await stateDatabase.query(
          "SELECT source_key, definition, saved FROM agentic_workflows",
        );
        expect(configuredWorkflows.rows).toEqual([
          {
            source_key: "updateNotice",
            definition: workflowSource,
            saved: true,
          },
        ]);
        expect(
          (await stateDatabase.query("SELECT id FROM agentic_workflow_runs"))
            .rowCount,
        ).toBe(0);
        await projectDatabase.query(
          "INSERT INTO notices (id, external_id, title) VALUES (1, 'notice-1', 'original'), (2, 'notice-2', 'original')",
        );
        requestCount = 0;
      },
    });
    const project = await deployment.connectProjectAs("admin");
    const { db, methods } = await deployment.connectStateAs("admin");
    const configuredWorkflows = await db.agentic_workflows!.find({
      source_key: "updateNotice",
    });
    expect(configuredWorkflows).toHaveLength(1);
    const [workflow] = configuredWorkflows;
    expect(workflow).toMatchObject({
      tool_use_id: null,
      definition: workflowSource,
    });
    const otherUser = await deployment.connectStateAs("otherAdmin");
    expect(
      await otherUser.db.agentic_workflows!.find({ id: workflow!.id }),
    ).toHaveLength(1);
    const sharedWorkflowTypes = await otherUser.methods!
      .getAgenticWorkflowTypes!({
      connectionId: workflow!.connection_id!,
      workflowId: workflow!.id,
    });
    expect(sharedWorkflowTypes.sourceDefinition).toBe(workflowSource);
    const viewer = await deployment.connectStateAs("viewer");
    expect(
      await viewer.db.agentic_workflows!.find({ source_key: "updateNotice" }),
    ).toEqual([]);
    const privateWorkflow = await db.agentic_workflows!.insert(
      {
        user_id: workflow!.user_id,
        connection_id: workflow!.connection_id,
        name: "Private workflow",
        definition: workflowSource,
        definition_data: workflow!.definition_data,
      },
      { returning: { id: 1 } },
    );
    expect(
      await otherUser.db.agentic_workflows!.find({ id: privateWorkflow.id }),
    ).toEqual([]);
    await expect(
      otherUser.methods!.startAgenticWorkflow!({
        workflowId: privateWorkflow.id,
        userInputValue: { id: 2, title: "private", delay: 0 },
        executionMode: "series",
        autoApproveAllTools: true,
      }),
    ).rejects.toBeTruthy();
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await expect(
      page
        .getByTestId("SavedAgenticWorkflowsAndContainers")
        .getByText("Update notice", { exact: true }),
    ).toBeVisible();
    /* Workflow prompts must expose the public SDK without runtime-relative imports. */
    const workflowToolSchema = (await project.methods!
      .refreshWorkflowTypes!()) as {
      description: string;
    };
    expect(workflowToolSchema.description).toContain(
      'imports defineAgenticWorkflow from "#prostgles/workflow"',
    );
    expect(workflowToolSchema.description).toContain(
      "export declare const defineAgenticWorkflow: DefineAgenticWorkflow",
    );
    expect(workflowToolSchema.description).not.toContain(
      "./defineAgenticWorkflowHandlers",
    );
    expect(workflowToolSchema.description).not.toContain(
      "END_OF_SCHEMA_PLACEHOLDER",
    );
    expect(existsSync(join(configPath, "generated/workflows.d.ts"))).toBe(true);
    expect(existsSync(join(sourcePath, "../defineAgenticWorkflow.d.ts"))).toBe(
      false,
    );
    const workflowCopyPath = join(configPath, "src/workflows/copy.workflow.ts");
    writeFileSync(workflowCopyPath, workflowSource);
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram([sourcePath, workflowCopyPath], {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.Node16,
        moduleResolution: ts.ModuleResolutionKind.Node16,
        paths: {
          "#prostgles/workflow": [join(configPath, "generated/workflows.d.ts")],
        },
      }),
    );
    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ),
    ).toEqual([]);
    /* Monaco uses Node10 resolution and receives the SDK as an ambient module. */
    const editorDeclarationsPath = join(configPath, "editor-workflows.d.ts");
    writeFileSync(
      editorDeclarationsPath,
      sharedWorkflowTypes.files["workflows.d.ts"],
    );
    const editorDiagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram([sourcePath, editorDeclarationsPath], {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Node10,
      }),
    );
    expect(
      editorDiagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ),
    ).toEqual([]);
    const runWorkflow = (id: number, title: string, delay = 0) =>
      project.methods!.runWorkflow!({ id, title, delay }) as Promise<{
        runId: number;
      }>;
    const [first, second] = await Promise.all([
      runWorkflow(1, "first"),
      methods!.startAgenticWorkflow!({
        workflowId: workflow!.id,
        userInputValue: { id: 2, title: "second", delay: 0 },
        executionMode: "series",
        autoApproveAllTools: true,
      }),
    ]);
    expect(first.runId).not.toBe(second.runId);
    expect(
      await project.db.notices!.find!(
        {},
        { select: { id: 1, title: 1 }, orderBy: { id: 1 } },
      ),
    ).toEqual([
      { id: 1, title: "first" },
      { id: 2, title: "second" },
    ]);
    expect(requestCount).toBe(2);
    expect(
      await db.agentic_workflows!.count({ source_key: "updateNotice" }),
    ).toBe(1);
    for (const [run, id] of [
      [first, 1],
      [second, 2],
    ] as const) {
      const storedRun = await db.agentic_workflow_runs!.findOne({
        id: run.runId,
      });
      expect(storedRun).toMatchObject({
        workflow_id: workflow!.id,
        definition: workflowSource,
        state: { status: "completed" },
        related_records:
          run === first ? [{ tableName: "notices", row: { id } }] : null,
        invocation_id: run === first ? expect.any(String) : null,
      });
      expect(storedRun).not.toHaveProperty("chat_id");
      expect(storedRun).not.toHaveProperty("message_id");
      const chats = await db.llm_chats!.find({
        parent_agentic_workflow_run_id: run.runId,
      });
      expect(chats).toHaveLength(2);
      expect(chats.map((chat) => chat.agent_info?.type).sort()).toEqual([
        "agent",
        "orchestrator",
      ]);
      expect(chats.every((chat) => chat.parent_chat_id === null)).toBe(true);
    }
    expect(
      await otherUser.db.agentic_workflow_runs!.find({ id: first.runId }),
    ).toEqual([]);
    await expect(
      otherUser.methods!.stopAgenticWorkflow!({ runId: first.runId }),
    ).rejects.toBeTruthy();
    await expect(
      otherUser.methods!.saveWorkflowSource!({
        workflowId: workflow!.id,
        definition: "invalid",
        expectedDefinition: workflowSource,
      }),
    ).rejects.toBeTruthy();

    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await openTable(page, "notices", true);
    const firstRow = page
      .locator('[data-table-name="notices"]')
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "first" });
    await firstRow
      .getByRole("button", { name: "Action details", exact: true })
      .click();
    const relatedWorkflows = page.getByRole("region", {
      name: "Related workflows",
      exact: true,
    });
    await expect(relatedWorkflows.getByRole("button")).toHaveCount(1);
    await expect(
      relatedWorkflows.getByText(`Run ${first.runId} · completed ·`, {
        exact: false,
      }),
    ).toBeVisible();
    const relatedRunButton = relatedWorkflows.getByRole("button", {
      name: "updateNotice · completed",
      exact: true,
    });
    await expect(relatedRunButton).toHaveAttribute("data-color", "green");
    await relatedRunButton.click();
    const workflowView = page.getByTestId("AgenticWorkflow");
    await workflowView
      .getByRole("button", { name: "Activity", exact: true })
      .click();
    await expect(
      workflowView.getByText("reviewer", { exact: true }),
    ).toHaveCount(1);
    await expect(
      workflowView.getByTestId("AgenticWorkflow.start"),
    ).toHaveAttribute("aria-disabled", "true");
    await page.getByTestId("Popup.close").last().click();
    await page.getByTestId("Popup.close").last().click();

    const pending = runWorkflow(1, "cancelled", 30_000).then(
      () => "unexpected success",
      () => "cancelled",
    );
    await expect
      .poll(
        async () =>
          (
            await db.agentic_workflow_runs!.findOne({
              state: { status: "running" },
            })
          )?.id,
        { timeout: 30_000 },
      )
      .toBeTruthy();
    const active = await db.agentic_workflow_runs!.findOne({
      state: { status: "running" },
    });
    await methods!.stopAgenticWorkflow!({ runId: active!.id });
    expect(await pending).toBe("cancelled");
    expect(
      (await db.agentic_workflow_runs!.findOne({ id: active!.id }))!.state
        .status,
    ).toBe("stopped");
    expect((await project.db.notices!.findOne!({ id: 1 }))!.title).toBe(
      "first",
    );

    /* Stopping a run abandoned by a server restart persists its final state. */
    const abandonedRun = await db.agentic_workflow_runs!.insert(
      {
        workflow_id: workflow!.id,
        user_id: active!.user_id,
        user_input_value: {},
        state: {
          status: "running",
          progressPercent: 43,
          message: "Waiting for text",
        },
        log: [],
      },
      { returning: { id: 1 } },
    );
    await expect(
      otherUser.methods!.stopAgenticWorkflow!({ runId: abandonedRun.id }),
    ).rejects.toBeTruthy();
    await methods!.stopAgenticWorkflow!({ runId: abandonedRun.id });
    const stoppedRun = await db.agentic_workflow_runs!.findOne({
      id: abandonedRun.id,
    });
    expect(stoppedRun!.state.status).toBe("stopped");
    expect(stoppedRun!.finished).toBeTruthy();
    await methods!.stopAgenticWorkflow!({ runId: abandonedRun.id });
    expect(
      await db.agentic_workflow_runs!.findOne({ id: abandonedRun.id }),
    ).toEqual(stoppedRun);
    await methods!.stopAgenticWorkflow!({ runId: first.runId });
    expect(
      (await db.agentic_workflow_runs!.findOne({ id: first.runId }))!.state
        .status,
    ).toBe("completed");

    const save = (definition: string, expectedDefinition = workflowSource) =>
      methods!.saveWorkflowSource!({
        workflowId: workflow!.id,
        definition,
        expectedDefinition,
      });
    const edited = workflowSource.replace(
      'name: "Update notice"',
      'name: "Edited notice"',
    );
    await page
      .getByTestId("SavedAgenticWorkflowsAndContainers")
      .getByText("Update notice", { exact: true })
      .click();
    await page
      .getByTestId("AgenticWorkflow")
      .getByRole("button", { name: "Definition", exact: true })
      .click();
    await monacoType(page, '[data-command="AgenticWorkflow"]', edited, {
      keyPressDelay: 0,
    });
    await page
      .getByRole("button", { name: "Save (Ctrl + S)", exact: true })
      .click();
    await expect
      .poll(() => readFileSync(sourcePath, "utf8"), { timeout: 60_000 })
      .toBe(edited);
    await page.getByTestId("Popup.close").last().click();
    expect(
      (await db.agentic_workflows!.findOne({ id: workflow!.id }))!.definition,
    ).toBe(edited);
    expect(
      (await db.agentic_workflows!.findOne({ id: workflow!.id }))!.user_id,
    ).toBe(workflow!.user_id);
    expect(
      (await db.agentic_workflow_runs!.findOne({ id: first.runId }))!
        .definition,
    ).toBe(workflowSource);
    await expect(
      save(edited),
      "Reject a stale source revision",
    ).rejects.toBeTruthy();
    const invalid = edited.replace(
      "tableHandlers.notices.update",
      "tableHandlers.missing_table.update",
    );
    await expect(
      save(invalid, edited),
      "Reject an unknown database table",
    ).rejects.toBeTruthy();
    expect(readFileSync(sourcePath, "utf8")).toBe(edited);
    expect(
      (await db.agentic_workflows!.findOne({ id: workflow!.id }))!.definition,
    ).toBe(edited);

    const invalidTools = edited.replace(
      'name: "Edited notice",',
      'name: "Edited notice", orchestrationTools: { missing_server: { missing_tool: 1 } },',
    );
    await expect(
      save(invalidTools, edited),
      "Reject unknown MCP tools",
    ).rejects.toBeTruthy();
    expect(readFileSync(sourcePath, "utf8")).toBe(edited);

    /* The editor can reload disk edits, including definitions that still need fixing. */
    writeFileSync(sourcePath, invalid);
    const types = await methods!.getAgenticWorkflowTypes!({
      connectionId: workflow!.connection_id!,
      workflowId: workflow!.id,
    });
    expect(types.sourceDefinition).toBe(invalid);

    /* Direct disk edits are loaded by the next CLI invocation. */
    writeFileSync(sourcePath, workflowSource);
    await runWorkflow(1, "from disk");
    expect(
      (await db.agentic_workflows!.findOne({ id: workflow!.id }))!.name,
    ).toBe("Update notice");
    expect((await project.db.notices!.findOne!({ id: 1 }))!.title).toBe(
      "from disk",
    );

    /* Preserve the workflow error in the calling function's failure. */
    writeFileSync(
      sourcePath,
      workflowSource.replace(
        'await setProgress(10, "Started");',
        'if (userInputValues.title === "failed") throw new Error("Notice extraction failed: source page is unavailable");',
      ),
    );
    await expect(runWorkflow(1, "failed")).rejects.toMatchObject({
      message: expect.stringContaining(
        "Notice extraction failed: source page is unavailable",
      ),
    });
  } finally {
    await deployment?.dispose();
    await new Promise<void>((resolve, reject) =>
      provider.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("CLI workflows upload large buffers without expanding JSON byte arrays", async () => {
  const configPath = createConfigTestProject(
    {
      id: "workflow-file-uploads-test",
      databaseConfig: {
        file_table_config: {
          fileTable: "files",
          storageType: { type: "local" },
          extractText: false,
        },
      },
      workflows: { uploadFiles: { source: "uploadFiles.ts" } },
    },
    test.info().outputPath("uploads-config"),
  );
  writeFileSync(
    join(configPath, "uploadFiles.ts"),
    `import { defineAgenticWorkflow } from "#prostgles/workflow";
void defineAgenticWorkflow({
  name: "Upload files",
  containerConfiguration: { timeout: 60_000 },
  databaseAccessDefinitions: {
    mode: "custom",
    tablePermissions: { files: { select: true, insert: true, update: true } },
  },
}, async ({ tableHandlers }) => {
  await tableHandlers.files.insert(
    { original_name: "large.txt", data: Buffer.alloc(40 * 1024 * 1024, "x") },
    { returning: { id: 1 } },
  );
  const [, replacementFile] = await tableHandlers.files.insertMany([
    { original_name: "batch.txt", data: Buffer.from("batch upload") },
    { original_name: "replace.txt", data: Buffer.from("original") },
  ], { returning: { id: 1 } });
  if (!replacementFile) throw new Error("Batch file was not created");
  await tableHandlers.files.update(
    { id: replacementFile.id },
    { original_name: "replace.txt", data: Buffer.from("replacement") },
  );
});`,
  );
  const deployment = await createTestDeployment({
    configPath,
    configId: "workflow-file-uploads-test",
    startupTimeoutMs: 180_000,
    logPath: test.info().outputPath("uploads-deployment.log"),
  });
  try {
    const state = await deployment.connectStateAs("admin");
    const workflow = await state.db.agentic_workflows!.findOne({
      source_key: "uploadFiles",
    });
    expect(workflow).toBeTruthy();
    const { runId } = await state.methods!.startAgenticWorkflow!({
      workflowId: workflow!.id,
      userInputValue: {},
      executionMode: "series",
      autoApproveAllTools: true,
    });
    const run = await state.db.agentic_workflow_runs!.findOne({ id: runId });
    expect(run?.state, run?.log.map(({ text }) => text).join("\n")).toEqual({
      status: "completed",
    });
    const project = await deployment.connectProjectAs("admin");
    const files = await project.db.files!.find!(
      {},
      { select: { original_name: 1, content_length: 1, etag: 1 } },
    );
    expect(files).toHaveLength(3);
    for (const [original_name, data] of [
      ["large.txt", Buffer.alloc(40 * 1024 * 1024, "x")],
      ["batch.txt", Buffer.from("batch upload")],
      ["replace.txt", Buffer.from("replacement")],
    ] as const) {
      expect(
        files.find((file) => file.original_name === original_name),
      ).toEqual({
        original_name,
        content_length: data.length.toString(),
        etag: createHash("md5").update(data).digest("hex"),
      });
    }
  } finally {
    await deployment.dispose();
  }
});

const workflowSource = `import { defineAgenticWorkflow } from "#prostgles/workflow";
void defineAgenticWorkflow({
  name: "Update notice",
  containerConfiguration: { timeout: 60_000 },
  databaseAccessDefinitions: { mode: "custom", tablePermissions: { notices: { select: true, update: true } } },
  agentDefinitions: { reviewer: { prompt: "Confirm the task is done", outputSchema: { done: { type: "boolean" } } } },
  userInput: {
    id: { type: "custom", dataType: "number", title: "Notice ID" },
    title: { type: "custom", dataType: "string", title: "Title" },
    delay: { type: "custom", dataType: "number", title: "Delay" },
  },
}, async ({ tableHandlers, agentHandlers, userInputValues, setProgress }) => {
  await setProgress(10, "Started");
  await new Promise((resolve) => setTimeout(resolve, userInputValues.delay));
  await agentHandlers.reviewer("Confirm");
  /* findOne returns a selected row, respects ordering/offset and returns undefined for no match. */
  const notice = await tableHandlers.notices.findOne({ id: userInputValues.id }, { select: { id: 1 } });
  if (notice?.id !== userInputValues.id || Object.keys(notice).length !== 1) {
    throw new Error("findOne did not return the selected notice");
  }
  const secondNotice = await tableHandlers.notices.findOne(undefined, { select: { id: 1 }, orderBy: { id: 1 }, offset: 1 });
  if (secondNotice?.id !== 2) throw new Error("findOne did not respect ordering and offset");
  const missingNotice = await tableHandlers.notices.findOne({ id: -1 });
  if (missingNotice !== undefined) throw new Error("findOne must return undefined for no match");
  await tableHandlers.notices.update({ id: userInputValues.id }, { title: userInputValues.title });
  await setProgress(100, "Saved");
});
`;
