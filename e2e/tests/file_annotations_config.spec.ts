import * as assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../server/dist/server/src/cli/testing";
import { expect, test } from "./fixtures";
import { createConfigTestProject } from "./utils/createConfigTestProject";

test("CLI annotations support PDF uploads without document extraction", async () => {
  const configPath = createConfigTestProject({
    id: "annotations-config-e2e",
    databaseConfig: {
      file_table_config: {
        fileTable: "files",
        storageType: { type: "local" },
        annotationsTable: "file_annotations",
        extractText: false,
      },
    },
    joins: [{
      tables: ["conditions", "members"],
      on: [{ id: "condition_id" }],
      type: "one-many",
    }],
    audit: { tableName: "audit_log", tables: { conditions: 1 } },
    tableConfig: {
      members: { columns: { id: "serial PRIMARY KEY", condition_id: "integer NOT NULL" } },
      conditions: {
        columns: {
          id: "serial PRIMARY KEY",
          source_annotation_id: "integer REFERENCES file_annotations(id)",
        },
      },
    },
  });
  // Fixture database URLs must override an app's local environment file.
  writeFileSync(
    join(configPath, ".env"),
    "PROSTGLES_DATABASE_URL=postgres://invalid:invalid@127.0.0.1:1/app\n" +
      "PROSTGLES_STATE_DATABASE_URL=postgres://invalid:invalid@127.0.0.1:1/state\n",
  );
  let deployment: TestDeployment | undefined;
  try {
    deployment = await createTestDeployment({
      configPath,
      configId: "annotations-config-e2e",
      logPath: test.info().outputPath("annotations-server.log"),
    });
    const { db: dbo, tableSchema } = await deployment.connectProjectAs("admin");
    expect(
      tableSchema?.find((table) => table.name === "file_annotations"),
    ).toHaveProperty("managedTableType", "file-annotations");
    const file = await dbo.files!.insert!(
      {
        data: readFileSync(join(__dirname, "testAskLLM/sample.pdf")),
        original_name: "source.pdf",
      },
      { returning: "*" },
    );
    // Previously annotations invoked the documents service despite extractText: false.
    assert.equal(file.extraction_status, null);
    assert.equal(file.docling_metadata, null);
    const annotation = await dbo.file_annotations!.insert!(
      { file_id: file.id, text: "Source excerpt", page: 1, rectangles: [] },
      { returning: "*" },
    );
    const condition = await dbo.conditions!.insert!(
      { source_annotation_id: annotation.id },
      { returning: "*" },
    );
    await dbo.members!.insert!({ condition_id: condition.id });
    const membership = await dbo.conditions!.find!({
      $existsJoined: {
        path: [{ table: "members", on: [{ id: "condition_id" }] }],
        filter: { condition_id: condition.id },
      },
    });
    expect(membership).toHaveLength(1);
    // The custom membership join must preserve conditions -> file_annotations inference.
    const linked = await dbo.conditions!.findOne!(
      { id: condition.id },
      { select: { file_annotations: "*" } },
    );
    expect(linked).toHaveProperty("file_annotations.0.text", "Source excerpt");
    const audit = await dbo.audit_log!.find!();
    assert.equal(audit.length, 1);
  } finally {
    await deployment?.dispose();
    rmSync(configPath, { recursive: true, force: true });
  }
});

test("CLI text extraction can be enabled without an annotations table", async () => {
  const configId = "extraction-config-e2e";
  const configPath = createConfigTestProject({
    id: configId,
    databaseConfig: {
      file_table_config: {
        fileTable: "files",
        storageType: { type: "local" },
        extractText: true,
      },
    },
  });
  let deployment: TestDeployment | undefined;
  try {
    deployment = await createTestDeployment({ configPath, configId });
    const { db, tableSchema } = await deployment.connectProjectAs("admin");
    const columns = tableSchema?.find(
      (table) => table.name === "files",
    )?.columns;
    for (const name of [
      "text_content",
      "docling_metadata",
      "extraction_status",
    ]) {
      assert.ok(columns?.some((column) => column.name === name));
    }
    // A non-document upload must not invoke the document conversion service.
    const file = await db.files!.insert!(
      { data: Buffer.from("hello"), original_name: "source.txt" },
      { returning: "*" },
    );
    assert.equal(file.extraction_status, null);
  } finally {
    await deployment?.dispose();
    rmSync(configPath, { recursive: true, force: true });
  }
});
