import * as assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../../server/dist/server/src/testing";
import { documentsService } from "../../../server/dist/server/src/ServiceManager/services/documents/documents.service";
import { assertServiceOpenApi } from "../utils/assertServiceOpenApi";
import { expect, test } from "../utils/fixtures";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { openTable } from "../utils/utils";

test("CLI annotations support PDF uploads without document extraction", async ({
  page,
}) => {
  const portReservation = createServer().listen(0, "127.0.0.1");
  await once(portReservation, "listening");
  const address = portReservation.address();
  assert.ok(address && typeof address === "object");
  const apiPort = address.port;
  await new Promise<void>((resolve, reject) => {
    portReservation.close((error) => (error ? reject(error) : resolve()));
  });
  const configPath = createConfigTestProject(
    {
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
      connection: {
        table_options: {
          documents: {
            columns: {
              preview_url: {
                renderAs: { type: "Media", params: { titleColumn: "title" } },
              },
            },
          },
        },
      },
      joins: [
        {
          tables: ["conditions", "members"],
          on: [{ id: "condition_id" }],
        },
      ],
      audit: { tableName: "audit_log", tables: { conditions: 1 } },
      tableConfig: {
        documents: {
          columns: {
            file_id: "uuid PRIMARY KEY REFERENCES files(id)",
            title: "text NOT NULL",
            __managed_file_id: "text DEFAULT 'reserved'",
            preview_url: "text",
          },
        },
        members: {
          columns: {
            id: "serial PRIMARY KEY",
            condition_id: "integer NOT NULL",
          },
        },
        conditions: {
          columns: {
            id: "serial PRIMARY KEY",
            source_annotation_id: "integer REFERENCES file_annotations(id)",
          },
        },
      },
    },
    test.info().outputPath("config"),
  );
  const annotationError =
    "Source annotations are immutable; create a new excerpt for corrections";
  const webAppDirectory = join(configPath, "web-app");
  mkdirSync(webAppDirectory);
  const webAppHtml = "<!doctype html><title>File storage SPA fallback</title>";
  writeFileSync(join(webAppDirectory, "index.html"), webAppHtml);
  const configFile = join(configPath, "index.js");
  writeFileSync(
    configFile,
    readFileSync(configFile, "utf8") +
      `
    module.exports.connection = {
      ...module.exports.connection,
      port: ${apiPort},
      web_app_directory: ${JSON.stringify(webAppDirectory)},
    };
    module.exports.databaseConfig.cors_csp_devmode_enabled = true;
    module.exports.tableHooks = {
      file_annotations: { afterEach: [{
        commands: { update: 1 },
        validate: () => { throw new Error(${JSON.stringify(annotationError)}); },
      }] },
    };
  `,
  );
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
    const webApp = await page.request.get(`http://localhost:${apiPort}/app-route`);
    expect(await webApp.text()).toBe(webAppHtml);
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
        params: { component: "File", dataKey: "__managed_file_id" },
      },
    });
    expect(
      tableSchema
        ?.find((table) => table.name === "documents")
        ?.columns.find((column) => column.name === "file_id")?.defaultRenderAs,
    ).toMatchObject({
      params: { component: "File", dataKey: "__managed_file_id_1" },
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
    assert.equal(file.extraction_job_id, undefined);
    assert.equal(file.docling_metadata, null);
    assert.equal(file.version, 1);
    assert.equal(await dbo.file_versions!.count!({ file_id: file.id }), 1);
    const annotation = await dbo.file_annotations!.insert!(
      {
        file_id: file.id,
        page: 1,
        start_text: "Source excerpt",
        end_text: "Source excerpt",
      },
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

    // A file reference used as the row identity must retain its scalar UUID.
    await dbo.documents!.insert!({ file_id: file.id, title: "Original title" });
    await page.context().addCookies(
      deployment.storageStateAs("admin").cookies.map((cookie) => ({
        ...cookie,
        domain: "localhost",
      })),
    );
    await page.goto(deployment.dashboardUrl.replace("127.0.0.1", "localhost"));
    await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
    const dashboardUrl = page.url();
    /* File previews must use connection context, independent of the URL path. */
    await page.evaluate(() => {
      window.history.replaceState(window.history.state, "", "/file-preview");
    });
    await openTable(page, "documents", true);
    expect(new URL(page.url()).pathname).toBe("/file-preview");
    const documents = page.locator('[data-table-name="documents"]');
    await expect(documents.getByTitle("application/pdf")).toBeVisible();
    const pdfResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.port === String(apiPort) && url.pathname.endsWith(`/${file.id}`);
    });
    await documents.getByTitle("application/pdf").click();
    expect((await pdfResponse).status()).toBe(200);
    await expect(page.locator(".PdfViewer .textLayer").first()).not.toBeEmpty();
    await expect(
      page.getByRole("button", { name: "Annotations (1)", exact: true }),
    ).toBeVisible();
    await page.getByTestId("Popup.close").last().click();
    await page.evaluate((url) => {
      window.history.replaceState(window.history.state, "", url);
    }, dashboardUrl);
    const fileIdHeader = documents
      .getByRole("columnheader")
      .filter({ hasText: "File Id" });
    const setFileFormat = async (current: string, next: string) => {
      await fileIdHeader.click({ button: "right" });
      await page.getByText("Render as", { exact: true }).click();
      await page.getByText(current, { exact: true }).click();
      await page
        .getByTestId("SearchList.List")
        .locator(`[data-key="${next}"]`)
        .click();
      while (await page.getByTestId("Popup.content").count()) {
        await page.keyboard.press("Escape");
      }
    };
    await setFileFormat("Internal", "NONE");
    await expect(documents.getByTitle("Click to copy value")).toBeVisible();
    await setFileFormat("NONE", "Internal");
    await expect(documents.getByTitle("application/pdf")).toBeVisible();
    await documents.getByTestId("dashboard.window.viewEditRow").click();
    const form = page.getByTestId("SmartForm");
    const title = form.locator('[data-key="title"]').getByRole("textbox");
    await expect(title).toHaveValue("Original title");
    await title.fill("Updated title");
    await form.getByTestId("SmartForm.update").click();
    await page
      .getByRole("button", { name: "Update row!", exact: true })
      .click();
    await expect
      .poll(() => dbo.documents!.findOne!({ file_id: file.id }))
      .toMatchObject({ title: "Updated title", __managed_file_id: "reserved" });

    // Annotation links open an immediately saved form; both errors must be readable.
    await expect(form).toBeHidden();
    await openTable(page, "conditions", true);
    await page
      .locator('[data-table-name="conditions"]')
      .getByRole("button", { name: "Source excerpt", exact: true })
      .click();
    const annotationForm = page.getByTestId("SmartForm");
    const textField = annotationForm.locator('[data-key="text"]');
    await textField.getByRole("textbox").fill("Corrected excerpt");
    await expect(textField.getByTestId("ErrorComponent")).toHaveText(
      annotationError,
    );
    const footerError = annotationForm.locator(
      ':scope > [data-command="ErrorComponent"]',
    );
    await expect(footerError).toHaveText(annotationError);
    expect(
      await dbo.file_annotations!.findOne!({ id: annotation.id }),
    ).toMatchObject({ text: "Source excerpt" });
    await page.getByTestId("Popup.close").last().click();
    const image = await dbo.files!.insert!(
      {
        data: await page.screenshot({ type: "jpeg" }),
        original_name: "api-port.jpg",
      },
      { returning: "*" },
    );
    await openTable(page, "files", true);
    const thumbnail = page.locator(
      `[data-table-name="files"] img[src$="/${image.id}"]`,
    );
    await expect(thumbnail).toBeVisible();
    const imageUrl = (await thumbnail.getAttribute("src"))!;
    expect(new URL(imageUrl).origin).toBe(`http://localhost:${apiPort}`);
    const imageProbe = await page.request.get(imageUrl, {
      headers: { Range: "bytes=0-0" },
    });
    expect(imageProbe.status()).toBe(206);
    expect(imageProbe.headers()["content-type"]).toContain("image/jpeg");
    expect(await imageProbe.body()).toEqual(Buffer.from([0xff]));
    await expect
      .poll(() =>
        thumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBe(page.viewportSize()!.width);

    const odtData = readFileSync(join(__dirname, "../sample.odt"));
    const odt = await dbo.files!.insert!(
      { data: odtData, original_name: "source.odt" },
      { returning: "*" },
    );
    const odtButton = page
      .locator('[data-table-name="files"]')
      .getByTitle("application/vnd.oasis.opendocument.text", { exact: true });
    await expect(odtButton.locator("svg path")).toHaveCSS(
      "fill",
      "rgb(10, 124, 58)",
    );
    const odtResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(`/${odt.id}`),
    );
    const downloadPromise = page.waitForEvent("download");
    await odtButton.click();
    expect((await odtResponse).status()).toBe(200);
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("source.odt");
    expect(await download.failure()).toBeNull();
    const downloadedPath = await download.path();
    assert.ok(downloadedPath);
    expect(readFileSync(downloadedPath)).toEqual(odtData);
    await expect(page.getByTestId("Popup.content")).toHaveCount(0);

    await page.route((await odtResponse).url(), (route) =>
      route.fulfill({ status: 403 }),
    );
    await odtButton.click();
    await expect(page.getByTestId("ErrorComponent")).toContainText(
      "Failed to download file (403)",
    );
    await page.getByRole("button", { name: "OK", exact: true }).click();

    await openTable(page, "documents", true);
    const storedFileUrl = new URL(file.url, `http://localhost:${apiPort}`);
    const externalFileUrl = `http://127.0.0.1:${apiPort}${storedFileUrl.pathname}`;
    await page.route(externalFileUrl, (route) =>
      route.fulfill({
        contentType: "application/pdf",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: readFileSync(join(__dirname, "../testAskLLM/sample.pdf")),
      }),
    );
    for (const previewUrl of [
      `${storedFileUrl.pathname}?version=1#page=1`,
      `${storedFileUrl.href}#page=1`,
      externalFileUrl,
    ]) {
      const previewResponse = page.waitForResponse(
        new URL(previewUrl, storedFileUrl).href.split("#")[0]!,
      );
      await dbo.documents!.update!(
        { file_id: file.id },
        { preview_url: previewUrl },
      );
      expect((await previewResponse).ok()).toBe(true);
      await documents
        .getByRole("button", { name: "Updated title", exact: true })
        .click();
      await expect(
        page.locator(".PdfViewer .textLayer").first(),
      ).not.toBeEmpty();
      const annotationsButton = page.getByRole("button", {
        name: "Annotations (1)",
        exact: true,
      });
      if (previewUrl === externalFileUrl) {
        await expect(annotationsButton).toHaveCount(0);
      } else {
        await expect(annotationsButton).toBeVisible();
      }
      await page.getByTestId("Popup.close").last().click();
    }
  } finally {
    await deployment?.dispose();
    rmSync(configPath, { recursive: true, force: true });
  }
});

test("CLI text annotations validate anchors and span PDF pages", async ({
  page,
}) => {
  const configPath = createConfigTestProject(
    {
      id: "text-annotations-e2e",
      databaseConfig: {
        file_table_config: {
          fileTable: "files",
          storageType: { type: "local" },
          annotationsTable: "file_annotations",
          extractText: false,
        },
      },
    },
    test.info().outputPath("config"),
  );
  const deployment = await createTestDeployment({
    configPath,
    configId: "text-annotations-e2e",
  });
  try {
    const { db, sql } = await deployment.connectProjectAs("admin");
    const file = await db.files!.insert!(
      {
        data: createAnnotationPdf(),
        original_name: "annotations.pdf",
      },
      { returning: "*" },
    );
    const anchors = {
      file_id: file.id,
      page: 1,
      end_page: 3,
      start_text: "Beginning phrase",
      end_text: "Ending phrase",
    };
    await expect(db.file_annotations!.insert!(anchors)).rejects.toMatchObject({
      message: expect.stringContaining("require extracted text"),
    });
    const deferred = await db.file_annotations!.insert!(
      { ...anchors, end_page: 1, end_text: "Beginning phrase" },
      { returning: "*" },
    );
    expect(deferred.text_selections).toEqual([
      { page: 1, startText: "Beginning phrase", endText: "Beginning phrase" },
    ]);
    await db.files!.update!(
      { id: file.id },
      {
        text_content: [
          "Beginning phrase\nRepeated Repeated",
          "Middle page",
          "Ending phrase",
        ],
      },
    );
    const textOnly = await db.file_annotations!.insert!(anchors, {
      returning: "*",
    });
    expect(textOnly.text).toBe(
      "Beginning phrase\nRepeated Repeated\nMiddle page\nEnding phrase",
    );
    expect(textOnly.text_selections).toHaveLength(3);
    for (const [changes, message] of [
      [{ start_text: "absent" }, "was not found"],
      [{ start_text: "Repeated" }, "matches more than once"],
      [{ end_text: "absent" }, "was not found"],
      [{ page: 3, end_page: 1 }, "end_page >= page"],
      [{ end_text: null }, "Provide non-empty"],
      [
        {
          end_page: 1,
          start_text: "Repeated Repeated",
          end_text: "Beginning phrase",
        },
        "must not precede",
      ],
      [{ text_selections: [] }, "at least one"],
      [
        { text_selections: [{ page: 0, startText: "x", endText: "x" }] },
        "positive page",
      ],
      [
        {
          text_selections: [
            {
              page: 1,
              startText: "x",
              endText: "x",
              rects: [{ x: 0, y: 0, width: -1, height: 10 }],
            },
          ],
        },
        "Invalid selection rectangles",
      ],
    ] as const) {
      await expect(
        db.file_annotations!.insert!({ ...anchors, ...changes }),
      ).rejects.toMatchObject({ message: expect.stringContaining(message) });
    }
    const bbox = { l: 40, t: 760, r: 220, b: 730, coord_origin: "BOTTOMLEFT" };
    const metadata = {
      pages: Object.fromEntries(
        [1, 2, 3].map((p) => [p, { size: { width: 600, height: 800 } }]),
      ),
      texts: ["Beginning phrase", "Middle page", "Ending phrase"].flatMap(
        (text, i) => [
          {
            text,
            self_ref: `#/texts/${i * 2}`,
            label: "text",
            prov: [{ page_no: i + 1, bbox }],
          },
          {
            text: "Footer text",
            self_ref: `#/texts/${i * 2 + 1}`,
            label: "page_footer",
            prov: [{ page_no: i + 1, bbox: { ...bbox, t: 30, b: 10 } }],
          },
        ],
      ),
      furniture: { children: [{ $ref: "#/texts/6" }] },
      tables: [
        {
          prov: [{ page_no: 2, bbox }],
          data: {
            table_cells: [
              {
                text: "Table cell",
                bbox: { ...bbox, t: 100, b: 120, coord_origin: "TOPLEFT" },
              },
            ],
          },
        },
      ],
    };
    // Furniture descendants must stay excluded even when they have no label.
    metadata.texts.push({
      text: "Page number",
      self_ref: "#/texts/6",
      label: "text",
      prov: [{ page_no: 2, bbox }],
    });
    const listItem = {
      text: "Maintain the landscaped boundary.",
      marker: "c)",
      self_ref: "#/texts/7",
      label: "list_item",
      prov: [{ page_no: 2, bbox }],
    };
    metadata.texts.push(listItem);
    await db.files!.update!({ id: file.id }, { docling_metadata: metadata });
    const marked = await db.file_annotations!.insert!(
      {
        file_id: file.id,
        page: 2,
        start_text: "c) Maintain the landscaped boundary.",
        end_text: "c) Maintain the landscaped boundary.",
      },
      { returning: "*" },
    );
    expect(marked).toMatchObject({
      text: "c) Maintain the landscaped boundary.",
      text_selections: [
        {
          page: 2,
          startText: "c) Maintain the landscaped boundary.",
          endText: "c) Maintain the landscaped boundary.",
          bounds: [{ x: 40, y: 40, width: 180, height: 30 }],
        },
      ],
    });
    await db.file_annotations!.delete!({ id: marked.id });
    metadata.texts.pop();
    await db.files!.update!({ id: file.id }, { docling_metadata: metadata });
    const resolved = await db.file_annotations!.insert!(
      { ...anchors, start_text: "Beginning\nphrase" },
      { returning: "*" },
    );
    expect(resolved.text).toBe(
      "Beginning phrase\nMiddle page\nTable cell\nEnding phrase",
    );
    expect(resolved.text_selections[0]).toEqual({
      page: 1,
      startText: "Beginning phrase",
      endText: "Beginning phrase",
      bounds: [{ x: 40, y: 40, width: 180, height: 30 }],
    });
    const cell = await db.file_annotations!.insert!(
      {
        file_id: file.id,
        text_selections: [
          { page: 2, startText: "Middle page", endText: "Middle page" },
          { page: 2, startText: "Table cell", endText: "Table cell" },
        ],
      },
      { returning: "*" },
    );
    expect(cell.text).toBe("Middle page\nTable cell");
    expect(cell.text_selections[1].bounds).toEqual([
      { x: 40, y: 100, width: 180, height: 20 },
    ]);
    const reordered = await db.file_annotations!.insert!(
      {
        file_id: file.id,
        text_selections: [
          { page: 3, startText: "Ending phrase", endText: "Ending phrase" },
          {
            page: 1,
            startText: "Beginning phrase",
            endText: "Beginning phrase",
          },
        ],
      },
      { returning: "*" },
    );
    expect(reordered).toMatchObject({
      page: 1,
      end_page: 3,
      text: "Beginning phrase\nEnding phrase",
      text_selections: [{ page: 1 }, { page: 3 }],
    });
    for (const assignment of [
      "page = 2",
      "end_page = 2",
      "end_page = NULL",
      "text_selections = '[]'",
    ]) {
      await expect(
        sql!(`UPDATE file_annotations SET ${assignment} WHERE id = $1`, [
          reordered.id,
        ]),
      ).rejects.toMatchObject({
        message: expect.stringContaining("annotation_selection_pages"),
      });
    }
    await expect(
      db.file_annotations!.update!(
        { id: resolved.id },
        { start_text: "absent" },
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining("was not found"),
    });
    expect(
      (await db.file_annotations!.findOne!({ id: resolved.id }))?.start_text,
    ).toBe("Beginning\nphrase");
    await db.file_annotations!.delete!({
      id: { $in: [deferred.id, textOnly.id, cell.id, reordered.id] },
    });

    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await openTable(page, "files", true);
    await page
      .locator('[data-table-name="files"]')
      .getByTitle("application/pdf")
      .click();
    const viewer = page.locator(".PdfViewer");
    const highlights = viewer.locator(".pdf-viewer__highlight");
    for (const text of ["Beginning phrase", "Middle page", "Ending phrase"]) {
      await expect(viewer.locator(".textLayer")).toContainText(text);
      // The synthetic table cell has only Docling geometry, so it also renders on page 2.
      await expect(highlights).toHaveCount(text === "Middle page" ? 2 : 1);
      const highlight = (await highlights.first().boundingBox())!;
      const span = (await viewer
        .locator(".textLayer span")
        .filter({ hasText: text })
        .boundingBox())!;
      expect(highlight.x).toBeGreaterThanOrEqual(span.x - 1);
      expect(highlight.y).toBeGreaterThanOrEqual(span.y - 1);
      expect(highlight.x + highlight.width).toBeLessThanOrEqual(
        span.x + span.width + 1,
      );
      expect(highlight.y + highlight.height).toBeLessThanOrEqual(
        span.y + span.height + 1,
      );
      if (text !== "Ending phrase")
        await viewer.getByTestId("Pagination.nextPage").click();
    }
    const fullWidth = (await highlights.boundingBox())!.width;
    await db.file_annotations!.update!(
      { id: resolved.id },
      { end_text: "Ending" },
    );
    await expect
      .poll(async () => (await highlights.boundingBox())?.width)
      .toBeLessThan(fullWidth);
    expect(
      (await db.file_annotations!.findOne!({ id: resolved.id }))?.text,
    ).toBe("Beginning phrase\nMiddle page\nTable cell\nEnding");
    // A mismatched text layer falls back to the supplied bounds, never the whole page.
    metadata.texts[4]!.text = "Docling-only ending";
    await db.files!.update!({ id: file.id }, { docling_metadata: metadata });
    await db.file_annotations!.update!(
      { id: resolved.id },
      { end_text: "Docling-only ending" },
    );
    await expect(highlights).toHaveCount(1);
    const pageBox = (await viewer.locator(".pdfViewer .page").boundingBox())!;
    const scale = pageBox.width / 600;
    await expect
      .poll(async () => (await highlights.boundingBox())?.height)
      .toBeCloseTo(30 * scale, 0);
    const fallbackBox = (await highlights.boundingBox())!;
    expect(fallbackBox.x).toBeCloseTo(pageBox.x + 40 * scale, 0);
    expect(fallbackBox.y).toBeCloseTo(pageBox.y + 40 * scale, 0);
    expect(fallbackBox.width).toBeCloseTo(180 * scale, 0);
    expect(fallbackBox.height).toBeCloseTo(30 * scale, 0);
    await db.file_annotations!.delete!({ id: resolved.id });

    // Docling can remove a real drawing-code hyphen at a PDF line break.
    const drawingText =
      "Swept Path of Proposed Construction Access Drawing no. H5234-8PD002";
    metadata.texts.push({
      text: drawingText,
      self_ref: "#/texts/7",
      label: "text",
      prov: [
        {
          page_no: 3,
          bbox: { l: 40, t: 565, r: 550, b: 525, coord_origin: "BOTTOMLEFT" },
        },
      ],
    });
    await db.files!.update!({ id: file.id }, { docling_metadata: metadata });
    const drawing = await db.file_annotations!.insert!(
      {
        file_id: file.id,
        page: 3,
        start_text: drawingText,
        end_text: drawingText,
      },
      { returning: "*" },
    );
    await expect(highlights).toHaveCount(2);
    for (const [index, text] of ["Swept Path", "002"].entries()) {
      const rect = (await highlights.nth(index).boundingBox())!;
      const span = (await viewer
        .locator(".textLayer span")
        .filter({ hasText: text })
        .boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(span.x - 1);
      expect(rect.y).toBeGreaterThanOrEqual(span.y - 1);
      expect(rect.x + rect.width).toBeLessThanOrEqual(span.x + span.width + 1);
      expect(rect.y + rect.height).toBeLessThanOrEqual(
        span.y + span.height + 1,
      );
    }
    // The same typo without element bounds must not trigger page-wide fuzzy matching.
    await sql!(
      "UPDATE file_annotations SET text_selections = $1::jsonb WHERE id = $2",
      [
        JSON.stringify([
          { page: 3, startText: drawingText, endText: drawingText },
        ]),
        drawing.id,
      ],
    );
    await expect(highlights).toHaveCount(0);
    await db.file_annotations!.delete!({ id: drawing.id });
    await db.files!.update!(
      { id: file.id },
      { docling_metadata: null, text_content: null },
    );
    await viewer.getByTestId("Pagination.firstPage").click();
    await expect(viewer.locator(".textLayer")).toContainText(
      "Beginning phrase",
    );
    const selectText = async (text: string) => {
      await viewer
        .locator(".textLayer span")
        .filter({ hasText: text })
        .evaluate((span) => {
          const range = document.createRange();
          range.selectNodeContents(span);
          window.getSelection()!.removeAllRanges();
          window.getSelection()!.addRange(range);
        });
      await viewer.locator(".pdfViewer").dispatchEvent("pointerup");
    };
    await selectText("Beginning phrase");
    for (const title of ["Add annotation", "Add another selection"]) {
      const button = viewer.getByTitle(title, { exact: true });
      await expect(button).toHaveCSS("box-sizing", "border-box");
      expect((await button.boundingBox())!.height).toBe(32);
    }
    await viewer.getByTitle("Add another selection").click();
    await expect(highlights).toHaveCount(1);
    await selectText("Separate excerpt");
    await viewer.getByTitle("Add another selection").click();
    await expect(highlights).toHaveCount(2);
    await viewer.getByTestId("Pagination.lastPage").click();
    await expect(viewer.locator(".textLayer")).toContainText("Ending phrase");
    await selectText("Ending phrase");
    await viewer.getByTitle("Add another selection").click();
    await expect(highlights).toHaveCount(1);
    await viewer
      .getByRole("button", { name: "Save annotation", exact: true })
      .click();
    const form = page.getByTestId("SmartForm").last();
    await form.getByTestId("SmartForm.insert").click();
    await expect
      .poll(() => db.file_annotations!.findOne!())
      .toMatchObject({
        page: 1,
        end_page: 3,
        text: "Beginning phrase\nSeparate excerpt\nEnding phrase",
        text_selections: [
          {
            page: 1,
            startText: "Beginning phrase",
            rects: [expect.objectContaining({ width: expect.any(Number) })],
          },
          {
            page: 1,
            startText: "Separate excerpt",
            rects: [expect.objectContaining({ width: expect.any(Number) })],
          },
          {
            page: 3,
            startText: "Ending phrase",
            rects: [expect.objectContaining({ width: expect.any(Number) })],
          },
        ],
      });
    await expect(form).toBeHidden();
    await viewer.getByTestId("Pagination.firstPage").click();
    await expect(highlights).toHaveCount(2);
    await viewer.getByTestId("Pagination.nextPage").click();
    await expect(viewer.locator(".textLayer")).toContainText("Middle page");
    await expect(highlights).toHaveCount(0);

    await selectText("Middle page");
    await viewer.getByTitle("Add another selection").click();
    await expect(highlights).toHaveCount(1);
    await viewer
      .getByRole("button", { name: "Cancel annotation", exact: true })
      .click();
    await expect(highlights).toHaveCount(0);
    const saved = await db.file_annotations!.findOne!();
    assert.ok(saved);
    await db.file_annotations!.update!(
      { id: saved.id },
      { name: "Selected annotation" },
    );
    const other = await db.file_annotations!.insert!(
      {
        file_id: file.id,
        name: "Other excerpt",
        page: 3,
        start_text: "Separate excerpt",
        end_text: "Separate excerpt",
      },
      { returning: "*" },
    );
    await viewer.getByTestId("Pagination.lastPage").click();
    await expect(highlights).toHaveCount(2);
    const openSaved = async () => {
      await viewer
        .getByRole("button", { name: "Annotations (2)", exact: true })
        .click();
      await page
        .getByTestId("SearchList.List")
        .getByText("Selected annotation", { exact: true })
        .click();
      await expect(page.getByTestId("SmartForm").last()).toBeVisible();
    };
    await openSaved();
    await expect(viewer.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(
      viewer.locator(
        `.pdf-viewer__highlight[data-annotation-id="${saved.id}"]`,
      ),
    ).toHaveCSS("opacity", "0.4");
    await expect(
      viewer.locator(
        `.pdf-viewer__highlight[data-annotation-id="${other.id}"]`,
      ),
    ).toHaveCSS("opacity", "0.12");
    await page.getByTestId("Popup.close").last().click();
    await expect(viewer.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(
      viewer.locator(
        `.pdf-viewer__highlight[data-annotation-id="${other.id}"]`,
      ),
    ).toHaveCSS("opacity", "0.4");
    await viewer.getByTestId("Pagination.prevPage").click();
    await expect(viewer.locator(".textLayer")).toContainText("Middle page");
    await openSaved();
    await expect(viewer.getByTestId("Pagination.page")).toHaveValue("1");

    const searchInput = viewer.getByPlaceholder("Search document");
    const pressCtrlF = () =>
      page.evaluate(() =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "f",
            ctrlKey: true,
            cancelable: true,
          }),
        ),
      );
    const popupClose = page.getByTestId("Popup.close").last();
    await popupClose.focus();
    await pressCtrlF();
    await expect(searchInput).not.toBeFocused();
    await popupClose.click();
    await pressCtrlF();
    await expect(searchInput).toBeFocused();
  } finally {
    await deployment.dispose();
  }
});

test("CLI extraction jobs retry, limit concurrency and preserve configured jobs", async () => {
  const configId = "extraction-jobs-e2e";
  const configPath = createConfigTestProject(
    {
      id: configId,
      databaseConfig: {
        file_table_config: {
          fileTable: "files",
          storageType: { type: "local" },
          extractText: true,
        },
      },
      tableConfig: {
        extraction_calls: {
          columns: { id: "serial PRIMARY KEY", name: "text NOT NULL" },
        },
        job_checks: {
          columns: {
            id: "integer PRIMARY KEY",
            released: "boolean DEFAULT false",
            result: "integer DEFAULT 0",
            job_id: "UUID",
          },
        },
        file_hook_calls: {
          columns: {
            id: "serial PRIMARY KEY",
            file_id: "UUID",
            phase: "TEXT",
            text_content: "TEXT[]",
          },
        },
        file_job_links: {
          columns: {
            job_id: "UUID PRIMARY KEY",
            file_id: "UUID NOT NULL",
          },
        },
      },
    },
    test.info().outputPath("config"),
  );
  const configFile = join(configPath, "index.js");
  const source =
    readFileSync(configFile, "utf8") +
    `
module.exports.jobs = {
  tableName: "app_jobs",
  definitions: {
    check: {
      trigger: { type: "row", table: "job_checks", on: ["insert"], jobIdColumn: "job_id" },
      run: async ({ row, dbo }) => { await dbo.job_checks.update({ id: row.id }, { result: 1 }); },
    },
  },
};
const recordFileHooks = (dbo, rows, phase) => dbo.file_hook_calls.insertMany(
  rows.map(row => ({ file_id: row.id, phase, text_content: row.text_content })),
);
module.exports.tableHooks = { files: {
  afterEach: [{
    commands: { update: 1 }, changedFields: ["extraction_job_id"],
    validate: async ({ dbx, row }) => {
      if (row.original_name === "rejected.pdf") throw new Error("Reject extraction job link");
      await dbx.file_job_links.insert({ job_id: row.extraction_job_id, file_id: row.id });
    },
  }, {
    commands: { insert: 1, update: 1 }, changedFields: ["text_content"],
    validate: ({ dbx, row }) => recordFileHooks(dbx, [row], "afterEach"),
  }],
  afterAll: [{
    commands: { insert: 1, update: 1 }, changedFields: ["text_content"],
    validate: ({ dbx, rows }) => recordFileHooks(dbx, rows, "afterAll"),
  }],
  afterCommit: [{
    commands: { insert: 1, update: 1 }, changedFields: ["text_content"],
    run: ({ dbo, rows }) => recordFileHooks(dbo, rows, "afterCommit"),
  }],
} };
module.exports.onMount = ({ dbo, context }) => {
  const serviceManager = context.serviceManager;
  const getService = serviceManager.getServiceWithRetries.bind(serviceManager);
  serviceManager.getServiceWithRetries = async (name, ...args) => {
    if (name !== "documents") return getService(name, ...args);
    return { endpoints: { "/v1/convert/file": async ({ files, md_page_break_placeholder }) => {
      const name = (await files[0].text()).split("\\n").at(-1);
      await dbo.extraction_calls.insert({ name });
      if (name === "blocked") {
        while (!(await dbo.job_checks.findOne({ id: 1 })).released) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }
      }
      const attempts = await dbo.extraction_calls.count({ name });
      if (name === "fail" || (name === "retry" && attempts === 1)) throw new Error("Docling unavailable");
      return {
        document: { json_content: { name }, md_content: name + md_page_break_placeholder + "page two" },
        processing_time: 0.1, timings: {},
      };
    } } };
  };
  return () => { serviceManager.getServiceWithRetries = getService; };
};`;
  writeFileSync(configFile, source);
  const deployment = await createTestDeployment({
    configPath,
    configId,
    logPath: test.info().outputPath("extraction-jobs.log"),
  });
  try {
    const { db, tableSchema } = await deployment.connectProjectAs("admin");
    expect(
      tableSchema
        ?.find((table) => table.name === "files")
        ?.columns.find((column) => column.name === "extraction_job_id")
        ?.references,
    ).toContainEqual(
      expect.objectContaining({ ftable: "app_jobs", fcols: ["id"] }),
    );
    const check = await db.job_checks!.insert!({ id: 1 }, { returning: "*" });
    expect(check.job_id).toEqual(expect.any(String));
    expect(await db.app_jobs!.findOne!({ id: check.job_id })).toMatchObject({
      job_name: "check",
      target_row_pkey: { id: 1 },
    });
    await expect
      .poll(async () => (await db.job_checks!.findOne!({ id: 1 }))?.result)
      .toBe(1);
    const upload = async (name: string, id?: string) => {
      const data = {
        data: Buffer.from(`%PDF-1.4\n${name}`),
        original_name: `${name}.pdf`,
      };
      const file =
        id ?
          (await db.files!.update!({ id }, data, { returning: "*" }))?.[0]
        : await db.files!.insert!(data, { returning: "*" });
      assert.ok(file);
      return file;
    };
    await expect(upload("rejected")).rejects.toMatchObject({
      message: "Reject extraction job link",
    });
    expect(await db.files!.count!({ original_name: "rejected.pdf" })).toBe(0);
    expect(await db.app_jobs!.count!({ job_name: "extractFileText" })).toBe(0);
    expect(await db.file_job_links!.count!({})).toBe(0);
    const blocked = await upload("blocked");
    expect(blocked.extraction_job_id).toEqual(expect.any(String));
    expect(
      await db.file_job_links!.findOne!({ job_id: blocked.extraction_job_id }),
    ).toMatchObject({
      file_id: blocked.id,
    });
    expect(
      await db.app_jobs!.findOne!({ id: blocked.extraction_job_id }),
    ).toMatchObject({
      job_name: "extractFileText",
      target_row_pkey: { id: blocked.id },
    });
    await expect
      .poll(() => db.extraction_calls!.count!({ name: "blocked" }))
      .toBe(1);
    const retry = await upload("retry");
    const fail = await upload("fail");
    await expect
      .poll(() =>
        db.app_jobs!.count!({ job_name: "extractFileText", status: "pending" }),
      )
      .toBe(2);
    expect(
      await db.app_jobs!.count!({
        job_name: "extractFileText",
        status: "running",
      }),
    ).toBe(1);
    expect(await db.extraction_calls!.count!({})).toBe(1);
    await upload("superseded", blocked.id);
    const replacement = await upload("replacement", blocked.id);
    expect(replacement.extraction_job_id).not.toBe(blocked.extraction_job_id);
    expect(
      await db.file_job_links!.findOne!({
        job_id: replacement.extraction_job_id,
      }),
    ).toMatchObject({
      file_id: blocked.id,
    });
    await db.job_checks!.update!({ id: 1 }, { released: true });
    await expect
      .poll(
        async () =>
          (await db.files!.findOne!({ id: retry.id }))?.extraction_status
            ?.state,
        { timeout: 20_000 },
      )
      .toBe("finished");
    await expect
      .poll(
        async () =>
          (await db.files!.findOne!({ id: fail.id }))?.extraction_status?.state,
        { timeout: 20_000 },
      )
      .toBe("error");
    expect(await db.extraction_calls!.count!({ name: "retry" })).toBe(2);
    expect(await db.extraction_calls!.count!({ name: "fail" })).toBe(3);
    expect(await db.files!.findOne!({ id: retry.id })).toMatchObject({
      text_content: ["retry", "page two"],
      docling_metadata: { name: "retry" },
    });
    await expect
      .poll(() =>
        db.app_jobs!.count!({
          job_name: "extractFileText",
          status: "failed",
          attempts: 3,
        }),
      )
      .toBe(1);
    await expect
      .poll(
        async () =>
          (await db.files!.findOne!({ id: blocked.id }))?.text_content,
      )
      .toEqual(["replacement", "page two"]);
    expect(await db.extraction_calls!.count!({ name: "superseded" })).toBe(0);
    expect(
      await db.file_hook_calls!.count!({
        text_content: ["blocked", "page two"],
      }),
    ).toBe(0);
    for (const phase of ["afterEach", "afterAll", "afterCommit"]) {
      await expect
        .poll(() => db.file_hook_calls!.count!({ file_id: retry.id, phase }))
        .toBe(2);
    }
    // Metadata/result writes do not enqueue another extraction; new bytes do.
    await db.files!.update!(
      { id: retry.id },
      { docling_metadata: { note: "metadata only" } },
    );
    expect(await db.app_jobs!.count!({ job_name: "extractFileText" })).toBe(5);
    expect(await db.file_job_links!.count!({})).toBe(5);
    expect(await db.file_hook_calls!.count!({ file_id: retry.id })).toBe(6);
    await db.files!.update!(
      { id: retry.id },
      { text_content: ["retry", "page two"] },
    );
    expect(await db.file_hook_calls!.count!({ file_id: retry.id })).toBe(6);
    await db.files!.update!({ id: retry.id }, { text_content: null });
    expect(await db.file_hook_calls!.count!({ file_id: retry.id })).toBe(9);

    writeFileSync(
      configFile,
      source +
        `
module.exports.jobs.definitions.check.run = async ({ row, dbo }) => {
  await dbo.job_checks.update({ id: row.id }, { result: 2 });
};`,
    );
    const { project: reloaded } = await deployment.syncSchema();
    await reloaded.db.job_checks!.insert!({ id: 2 });
    await expect
      .poll(
        async () => (await reloaded.db.job_checks!.findOne!({ id: 2 }))?.result,
      )
      .toBe(2);
    await reloaded.db.files!.insert!({
      data: Buffer.from("%PDF-1.4\nafter reload"),
      original_name: "reload.pdf",
    });
    await expect
      .poll(() =>
        reloaded.db.extraction_calls!.count!({ name: "after reload" }),
      )
      .toBe(1);
    expect(await reloaded.db.file_job_links!.count!({})).toBe(6);
  } finally {
    await deployment.dispose();
  }
});

test("CLI text extraction persists Docling profiling without annotations", async () => {
  test.setTimeout(900_000);
  const configId = "extraction-config-e2e";
  const configPath = createConfigTestProject(
    {
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
    },
    test.info().outputPath("config"),
  );
  let deployment: TestDeployment | undefined;
  try {
    deployment = await createTestDeployment({
      configPath,
      configId,
      logPath: test.info().outputPath("extraction-server.log"),
    });
    const { db, tableSchema } = await deployment.connectProjectAs("admin");
    const columns = tableSchema?.find(
      (table) => table.name === "files",
    )?.columns;
    expect(
      columns?.find((column) => column.name === "extraction_job_id")
        ?.references,
    ).toContainEqual(
      expect.objectContaining({ ftable: "prostgles_jobs", fcols: ["id"] }),
    );
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

    // A cold Docker build can outlast the extraction timeout.
    await test.step("Start Docling", async () => {
      const state = await deployment!.connectStateAs("admin");
      await state.methods!.toggleService!({
        serviceName: "documents",
        enable: true,
      });
    });

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
    await test.step("Isolate Docling across deployments of the same app", async () => {
      const otherDeployment = await createTestDeployment({
        configPath,
        configId,
        logPath: test.info().outputPath("other-extraction-server.log"),
      });
      try {
        expect(otherDeployment.instanceId).not.toBe(deployment!.instanceId);
        const state = await otherDeployment.connectStateAs("admin");
        await state.methods!.toggleService!({
          serviceName: "documents",
          enable: true,
        });
        await assertServiceOpenApi("documents", documentsService, {
          PROSTGLES_INSTANCE_ID: otherDeployment.instanceId,
        });
      } finally {
        await otherDeployment.dispose();
      }
      await assertServiceOpenApi("documents", documentsService, {
        PROSTGLES_INSTANCE_ID: deployment!.instanceId,
      });
    });
    const { timings } = extractedPdf.extraction_status;
    expect(timings.pipeline_total).toBeDefined();
    for (const profilingItem of Object.values<{
      scope: string;
      count: number;
      times: number[];
      start_timestamps: string[];
    }>(timings)) {
      expect(["page", "document"]).toContain(profilingItem.scope);
      expect(Number.isInteger(profilingItem.count)).toBe(true);
      expect(profilingItem.times.every(Number.isFinite)).toBe(true);
      expect(
        profilingItem.start_timestamps.every(
          (timestamp) => !Number.isNaN(Date.parse(timestamp)),
        ),
      ).toBe(true);
    }
  } catch (error) {
    if (deployment) {
      const state = await deployment.connectStateAs("admin");
      await test.info().attach("documents-service", {
        contentType: "application/json",
        body: JSON.stringify(
          await state.db.services!.findOne({ name: "documents" }),
          null,
          2,
        ),
      });
    }
    throw error;
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
  for (const [i, text] of [
    "Beginning phrase",
    "Middle page",
    "Ending phrase",
  ].entries()) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
    );
    // Footer precedes body in PDF/DOM order, despite appearing below it visually.
    const stream =
      `BT /F1 12 Tf 40 20 Td (Footer text) Tj ET\nBT /F1 12 Tf 40 750 Td (${text}) Tj ET\nBT /F1 12 Tf 40 650 Td (Separate excerpt) Tj ET` +
      (i === 2 ?
        "\nBT /F1 12 Tf 40 550 Td (Swept Path of Proposed Construction Access Drawing no. H5234-8PD-) Tj 0 -15 Td (002) Tj ET"
      : "");
    objects.push(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
};
