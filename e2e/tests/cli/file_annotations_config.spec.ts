import * as assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../../server/dist/server/src/cli/testing";
import { documentsService } from "../../../server/dist/server/src/ServiceManager/services/documents/documents.service";
import { assertServiceOpenApi } from "../utils/assertServiceOpenApi";
import { expect, test } from "../utils/fixtures";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { openTable, type PageWIds } from "../utils/utils";

test("CLI annotations support PDF uploads without document extraction", async () => {
  const configPath = createConfigTestProject({
    id: "annotations-config-e2e",
    databaseConfig: {
      file_table_config: {
        fileTable: "files",
        storageType: { type: "local" },
        annotationsTable: "file_annotations",
        extractText: false,
        versioning: { tableName: "file_versions", maxVersions: 2 },
      },
    },
    joins: [
      {
        tables: ["conditions", "members"],
        on: [{ id: "condition_id" }],
        type: "one-many",
      },
    ],
    audit: { tableName: "audit_log", tables: { conditions: 1 } },
    tableConfig: {
      members: {
        columns: { id: "serial PRIMARY KEY", condition_id: "integer NOT NULL" },
      },
      conditions: {
        columns: {
          id: "serial PRIMARY KEY",
          source_annotation_id: "integer REFERENCES file_annotations(id)",
        },
      },
    },
  }, test.info().outputPath("config"));
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
    expect(
      tableSchema
        ?.find((table) => table.name === "conditions")
        ?.columns.find((column) => column.name === "source_annotation_id"),
    ).toMatchObject({
      defaultRenderAs: {
        type: "Internal",
        params: {
          component: "FileAnnotation",
          tableName: "file_annotations",
          dataKey: "__managed_source_annotation_id",
        },
      },
    });
    expect(
      tableSchema
        ?.find((table) => table.name === "file_annotations")
        ?.columns.find((column) => column.name === "file_id"),
    ).toMatchObject({
      defaultRenderAs: {
        type: "Internal",
        params: { component: "File" },
      },
    });
    expect(tableSchema?.some((table) => table.name === "file_versions")).toBe(
      true,
    );
    const file = await dbo.files!.insert!(
      {
        data: readFileSync(join(__dirname, "../testAskLLM/sample.pdf")),
        original_name: "source.pdf",
      },
      { returning: "*" },
    );
    // Previously annotations invoked the documents service despite extractText: false.
    assert.equal(file.extraction_status, null);
    assert.equal(file.docling_metadata, null);
    assert.equal(file.version, 1);
    assert.equal(await dbo.file_versions!.count!({ file_id: file.id }), 1);
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
      {
        select: {
          file_annotations: "*",
          source_annotation_id: 1,
          __managed_source_annotation_id: {
            $leftJoin: [
              {
                table: "file_annotations",
                on: [{ source_annotation_id: "id" }],
              },
            ],
            select: { id: 1, text: 1, page: 1 },
          },
        },
      },
    );
    expect(linked).toHaveProperty("file_annotations.0.text", "Source excerpt");
    expect(linked).toHaveProperty("source_annotation_id", annotation.id);
    expect(linked).toHaveProperty(
      "__managed_source_annotation_id.0.text",
      "Source excerpt",
    );
    expect(linked).toHaveProperty("__managed_source_annotation_id.0.page", 1);
    const audit = await dbo.audit_log!.find!();
    assert.equal(audit.length, 1);
  } finally {
    await deployment?.dispose();
    rmSync(configPath, { recursive: true, force: true });
  }
});

test("CLI text annotations validate anchors and span PDF pages", async ({ page }) => {
  const configPath = createConfigTestProject({
    id: "text-annotations-e2e",
    databaseConfig: {
      file_table_config: {
        fileTable: "files", storageType: { type: "local" },
        annotationsTable: "file_annotations", extractText: false,
      },
    },
  }, test.info().outputPath("config"));
  const deployment = await createTestDeployment({ configPath, configId: "text-annotations-e2e" });
  try {
    const { db } = await deployment.connectProjectAs("admin");
    const file = await db.files!.insert!({
      data: createAnnotationPdf(), original_name: "annotations.pdf",
    }, { returning: "*" });
    const anchors = { file_id: file.id, page: 1, end_page: 3,
      start_text: "Beginning phrase", end_text: "Ending phrase" };
    const deferred = await db.file_annotations!.insert!(anchors, { returning: "*" });
    expect(deferred.fallback_edges).toBeNull();
    expect(deferred.rectangles).toEqual([]);

    await db.files!.update!({ id: file.id }, { text_content: [
      "Beginning phrase\nRepeated Repeated", "Middle page", "Ending phrase",
    ] });
    const textOnly = await db.file_annotations!.insert!(anchors, { returning: "*" });
    expect(textOnly.text).toBe("Beginning phrase\nRepeated Repeated\nMiddle page\nEnding phrase");
    expect(textOnly.fallback_edges).toBeNull();
    for (const [changes, message] of [
      [{ start_text: "absent" }, "start_text on page 1: Annotation text was not found"],
      [{ start_text: "Repeated" }, "matches more than once"],
      [{ end_text: "absent" }, "end_text on page 3"],
      [{ page: 3, end_page: 1 }, "end_page >= page"],
      [{ end_text: null }, "Provide non-empty"],
      [{ end_page: null, start_text: "Repeated Repeated", end_text: "Beginning phrase" }, "must not precede"],
    ] as const) {
      await expect(db.file_annotations!.insert!({ ...anchors, ...changes }))
        .rejects.toMatchObject({ message: expect.stringContaining(message) });
    }
    const bbox = { l: 40, t: 750, r: 220, b: 730, coord_origin: "BOTTOMLEFT" };
    const texts = ["Beginning phrase", "Repeated Repeated", "Middle page", "Ending phrase"];
    const metadata = {
      pages: Object.fromEntries([1, 2, 3].map((p) => [p, { size: { width: 600, height: 800 } }])),
      texts: texts.map((text, i) => ({ text, self_ref: `#/texts/${i}`,
        prov: [{ page_no: i < 2 ? 1 : i, bbox, charspan: [0, text.length] }] })),
      tables: [{ prov: [{ page_no: 2, bbox }], data: { table_cells: [
        { text: "Table cell", bbox: { ...bbox, t: 100, b: 120, coord_origin: "TOPLEFT" } },
      ] } }],
    };
    await db.files!.update!({ id: file.id }, { docling_metadata: metadata });
    const resolved = await db.file_annotations!.insert!({ ...anchors, start_text: "Beginning\nphrase" }, { returning: "*" });
    expect(resolved.fallback_edges).toEqual({
      start_x: 40, start_y: 50, end_x: 220, end_y: 70,
    });
    const cell = await db.file_annotations!.insert!({ file_id: file.id, page: 2,
      start_text: "Table cell", end_text: "Table cell" }, { returning: "*" });
    expect(cell.fallback_edges).toEqual({
      start_x: 40, start_y: 100, end_x: 220, end_y: 120,
    });
    await expect(db.file_annotations!.update!({ id: resolved.id }, { start_text: "absent" }))
      .rejects.toMatchObject({ message: expect.stringContaining("was not found") });
    expect((await db.file_annotations!.findOne!({ id: resolved.id })).start_text).toBe("Beginning\nphrase");
    await db.file_annotations!.delete!({ id: { $in: [deferred.id, textOnly.id, cell.id] } });

    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await openTable(page as PageWIds, "files", true);
    await page.locator('[data-table-name="files"]').getByTitle("application/pdf").click();
    const viewer = page.locator(".PdfViewer");
    await expect(viewer.locator(".textLayer")).toContainText("Beginning phrase");
    // DOM matching highlights only the text, rather than the much wider fallback.
    const firstHighlight = viewer.locator(".pdf-viewer__highlight").first();
    await expect(firstHighlight).toBeVisible();
    expect((await firstHighlight.boundingBox())!.width).toBeLessThan(180 * 1.5);
    await viewer.getByTestId("Pagination.nextPage").click();
    await expect(viewer.locator(".textLayer")).toContainText("Middle page");
    await expect(viewer.locator(".pdf-viewer__highlight")).toHaveCount(1);
    await viewer.getByTestId("Pagination.nextPage").click();
    await expect(viewer.locator(".textLayer")).toContainText("Ending phrase");
    await expect(viewer.locator(".pdf-viewer__highlight")).toHaveCount(1);
    // A changed PDF text layer must still display the stored fallback.
    metadata.texts[3]!.text = "Docling-only ending";
    metadata.texts[3]!.prov[0]!.charspan = [0, 19];
    await db.files!.update!({ id: file.id }, { docling_metadata: metadata });
    await db.file_annotations!.update!({ id: resolved.id }, { end_text: "Docling-only ending" });
    await expect(viewer.locator(".pdf-viewer__highlight")).toHaveCSS("width", "900px");

    // Same-page fallbacks use the two edges as opposite rectangle corners.
    await db.file_annotations!.update!({ id: resolved.id }, {
      page: 3, end_page: null, start_text: "Docling-only ending",
    });
    await expect(viewer.locator(".pdf-viewer__highlight")).toHaveCSS("width", "270px");
    await expect(viewer.locator(".pdf-viewer__highlight")).toHaveCSS("height", "30px");

    await db.file_annotations!.delete!({ id: resolved.id });
    await db.files!.update!({ id: file.id }, { docling_metadata: null, text_content: null });
    await viewer.getByTestId("Pagination.firstPage").click();
    await expect(viewer.locator(".textLayer")).toContainText("Beginning phrase");
    const selectText = async () => {
      await viewer.locator(".textLayer span").first().evaluate((span) => {
        const range = document.createRange();
        range.selectNodeContents(span);
        window.getSelection()!.removeAllRanges();
        window.getSelection()!.addRange(range);
      });
      await viewer.locator(".pdfViewer").dispatchEvent("pointerup");
    };
    await selectText();
    await viewer.getByTitle("Continue annotation on another page").click();
    await viewer.getByTestId("Pagination.lastPage").click();
    await expect(viewer.locator(".textLayer")).toContainText("Ending phrase");
    await selectText();
    await viewer.getByTitle("Finish annotation here").click();
    const form = page.getByTestId("SmartForm").last();
    await form.getByTestId("SmartForm.insert").click();
    await expect.poll(() => db.file_annotations!.findOne!()).toMatchObject({
      page: 1, end_page: 3, start_text: "Beginning phrase", end_text: "Ending phrase",
      fallback_edges: {
        start_x: expect.any(Number), start_y: expect.any(Number),
        end_x: expect.any(Number), end_y: expect.any(Number),
      },
    });
  } finally {
    await deployment.dispose();
  }
});

test("CLI text extraction persists Docling profiling without annotations", async () => {
  const configId = "extraction-config-e2e";
  const configPath = createConfigTestProject({
    id: configId,
    databaseConfig: {
      file_table_config: {
        fileTable: "files",
        storageType: { type: "local" },
        extractText: true,
        extractTextOptions: {
          do_ocr: false,
          table_mode: "fast",
        },
      },
    },
  }, test.info().outputPath("config"));
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
    expect(
      columns?.find((column) => column.name === "extraction_status"),
    ).toMatchObject({
      udt_name: "jsonb",
      defaultRenderAs: {
        type: "Internal",
        params: { component: "FileExtractionStatus" },
      },
    });
    expect(
      columns?.find((column) => column.name === "text_content"),
    ).toMatchObject({
      udt_name: "_text",
    });
    // A non-document upload must not invoke the document conversion service.
    const file = await db.files!.insert!(
      { data: Buffer.from("hello"), original_name: "source.txt" },
      { returning: "*" },
    );
    assert.equal(file.extraction_status, null);

    const pdf = await db.files!.insert!(
      {
        data: readFileSync(join(__dirname, "../testAskLLM/sample.pdf")),
        original_name: "sample.pdf",
      },
      { returning: "*" },
    );
    await expect
      .poll(
        async () =>
          (await db.files!.findOne!({ id: pdf.id }))?.extraction_status?.state,
        { timeout: 120_000 },
      )
      .toBe("finished");

    const extractedPdf = await db.files!.findOne!({ id: pdf.id });
    assert.equal(extractedPdf?.extraction_status?.state, "finished");
    await assertServiceOpenApi("documents", documentsService);
    const { timings } = extractedPdf.extraction_status;
    expect(timings.pipeline_total).toBeDefined();
    for (const profilingItem of Object.values(timings) as {
      scope: string;
      count: number;
      times: number[];
      start_timestamps: string[];
    }[]) {
      expect(["page", "document"]).toContain(profilingItem.scope);
      expect(Number.isInteger(profilingItem.count)).toBe(true);
      expect(profilingItem.times.every(Number.isFinite)).toBe(true);
      expect(
        profilingItem.start_timestamps.every(
          (timestamp) => !Number.isNaN(Date.parse(timestamp)),
        ),
      ).toBe(true);
    }
  } finally {
    await deployment?.dispose();
    rmSync(configPath, { recursive: true, force: true });
  }
});

const createAnnotationPdf = () => {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R] /Count 3 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const [i, text] of ["Beginning phrase", "Middle page", "Ending phrase"].entries()) {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    const stream = `BT /F1 12 Tf 40 750 Td (${text}) Tj ET`;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
};
