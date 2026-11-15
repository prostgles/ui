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
import { chipColorsFaded } from "@common/ColumnConfig/chipColors";
import { DEFAULT_ANNOTATION_COLOR } from "@common/managedTableSchema";

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
          files: { columns: { caption: { icon: "Tag" } } },
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
        files: {
          columns: {
            caption: "text",
            category: "text NOT NULL DEFAULT 'general'",
          },
        },
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
    "PROSTGLES_PG_SERVER_URL=postgres://invalid:invalid@127.0.0.1:1\n" +
      "PROSTGLES_APP_DB_NAME=app\nPROSTGLES_STATE_DB_NAME=state\n",
  );
  let deployment: TestDeployment | undefined;
  try {
    deployment = await createTestDeployment({
      configPath,
      configId: "annotations-config-e2e",
      logPath: test.info().outputPath("annotations-server.log"),
    });
    const { db: dbo, tableSchema } = await deployment.connectProjectAs("admin");
    const webApp = await page.request.get(
      `http://localhost:${apiPort}/app-route`,
    );
    expect(await webApp.text()).toBe(webAppHtml);
    expect(
      tableSchema?.find((table) => table.name === "file_annotations"),
    ).toMatchObject({
      managedTableType: "file-annotations",
      card: {
        summaryFields: ["id", "file_id", "file_version", "page"],
        layoutSections: [],
      },
      columnConfigs: {
        text_selections: { show: false },
      },
    });
    /* Managed files publish explicit card fields and independent table formatting. */
    const filesTableSchema = tableSchema?.find(
      (table) => table.name === "files",
    );
    expect(filesTableSchema).toMatchObject({
      card: {
        headerColumn: "original_name",
        subHeaderColumns: ["original_last_modified", "content_length"],
        summaryFields: ["description", "url"],
        layoutSections: [
          {
            items: [
              "id",
              "extension",
              "content_type",
              "added",
              "updated",
              "version",
            ],
          },
        ],
      },
      columnConfigs: {
        content_length: {
          label: "Size",
          format: { type: "File size" },
        },
        text_content: { show: false },
        docling_metadata: { show: false },
      },
    });
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
        original_last_modified: "2024-03-15T12:30:00.000Z",
      },
      { returning: "*" },
    );
    // Previously annotations invoked the documents service despite extractText: false.
    assert.equal(file.extraction_status, undefined);
    assert.equal(file.text_extraction_job_id, undefined);
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
    /* File cards show name, modified date and size without repeating metadata. */
    await openTable(page, "files", true);
    const state = await deployment.connectStateAs("admin");
    const fileWindow = await state.db.windows!.findOne({ table_name: "files" });
    assert.ok(fileWindow);
    const setFileView = async (type: "card" | "table") => {
      await state.db.windows!.update(
        { table_name: "files" },
        { options: { ...fileWindow.options, viewAs: { type } } },
      );
    };
    await setFileView("card");
    const fileCard = page
      .locator('[data-table-name="files"]')
      .getByTestId("CardView.row");
    const fileHeader = fileCard.locator(".CardHeader");
    await expect(fileHeader).toContainText("source.pdf");
    await expect(
      fileHeader.getByTitle("Last modified", { exact: true }),
    ).toContainText("2024-03-15");
    await expect(fileHeader.getByTitle("Size", { exact: true })).toHaveText(
      `${file.content_length} Bytes`,
    );
    await expect(fileHeader).toContainText(" · ");
    await expect(fileCard.locator(".CardBody")).not.toContainText(
      "Last modified",
    );
    await setFileView("table");
    /* Linked file and annotation references must not add unsupported child joins. */
    const files = page.locator('[data-table-name="files"]');
    await files.getByTestId("AddColumnMenu").click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="Referenced"]')
      .click();
    await page
      .getByTestId("JoinPathSelectorV2")
      .locator('[data-key="file_annotations"]')
      .click();
    await page.getByTestId("LinkedColumn.Add").click();
    const linkedExcerpt = files
      .getByTestId("LinkedColumn.OpenRecord")
      .filter({ hasText: "Source excerpt" });
    await expect(linkedExcerpt.getByTitle("Click to copy value")).toContainText(
      file.id.slice(0, 8),
    );
    await expect(files.getByTestId("ErrorComponent")).toHaveCount(0);
    await state.db.windows!.update(
      { id: fileWindow.id },
      {
        columns: [
          { name: "original_name" },
          {
            name: "conditions",
            nested: {
              path: [
                { table: "file_annotations", on: [{ id: "file_id" }] },
                { table: "conditions", on: [{ id: "source_annotation_id" }] },
              ],
              columns: [{ name: "source_annotation_id" }],
              display: { type: "values", labels: "none" },
            },
          },
        ],
      },
    );
    await expect(
      files.getByRole("cell", { name: String(annotation.id), exact: true }),
    ).toBeVisible();
    await expect(files.getByTestId("ErrorComponent")).toHaveCount(0);
    await state.db.windows!.update(
      { id: fileWindow.id },
      { columns: fileWindow.columns },
    );
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
      return (
        url.port === String(apiPort) && url.pathname.endsWith(`/${file.id}`)
      );
    });
    await documents.getByTitle("application/pdf").click();
    expect((await pdfResponse).status()).toBe(200);
    await expect(
      page.getByTestId("PdfViewer").locator(".textLayer").first(),
    ).not.toBeEmpty();
    const annotationsPanel = page
      .getByTestId("PdfViewer")
      .getByRole("complementary", { name: "PDF annotations", exact: true });
    await expect(
      annotationsPanel.getByPlaceholder("Search 1 annotations..."),
    ).toBeVisible();
    /* File details open the source file's form and reset the toolbar toggle on close. */
    const fileDetailsButton = page
      .getByTestId("PdfViewer.toolbar")
      .getByRole("button", { name: "Show file details", exact: true });
    await fileDetailsButton.click();
    const fileDetailsForm = page.getByTestId("SmartForm");
    await expect(fileDetailsForm).toHaveAttribute("data-key", "files");
    await expect(
      fileDetailsForm
        .locator('[data-key="original_name"]')
        .getByRole("textbox"),
    ).toHaveValue("source.pdf");
    await expect(fileDetailsButton).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("Popup.close").last().click();
    await expect(fileDetailsForm).toHaveCount(0);
    await expect(fileDetailsButton).toHaveAttribute("aria-pressed", "false");
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

    /* Annotation references open the PDF; its details retain inline errors. */
    await expect(form).toBeHidden();
    await openTable(page, "conditions", true);
    await page
      .locator('[data-table-name="conditions"]')
      .getByRole("button", { name: "Source excerpt", exact: true })
      .click();
    await expect(page.getByTestId("PdfViewer")).toBeVisible();
    await expect(page.getByTestId("SmartForm")).toHaveCount(0);
    await expect(annotationsPanel.locator(".SmartCard.selected")).toContainText(
      "Source excerpt",
    );
    await page.setViewportSize({ width: 1080, height: 900 });
    await page
      .getByTestId("PdfViewer.toolbar")
      .getByRole("button", { name: "Annotations (1)", exact: true })
      .click();
    await page
      .getByTestId("SearchList.List")
      .getByText("Source excerpt", { exact: true })
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
    await page.getByTestId("Popup.close").last().click();
    await page.setViewportSize({ width: 1280, height: 720 });
    const image = await dbo.files!.insert!(
      {
        data: await page.screenshot({ type: "jpeg" }),
        original_name: "api-port.jpg",
      },
      { returning: "*" },
    );
    await openTable(page, "files", true);
    /* Missing modification dates omit the separator; larger sizes use KB/MB. */
    await setFileView("card");
    const imageHeader = fileCard
      .filter({ hasText: "api-port.jpg" })
      .locator(".CardHeader");
    await expect(
      imageHeader.getByTitle("Last modified", { exact: true }),
    ).toHaveCount(0);
    await expect(imageHeader.getByTitle("Size", { exact: true })).toHaveText(
      /\d+\.\d+ (KB|MB)/,
    );
    await expect(imageHeader).not.toContainText(" · ");
    await setFileView("table");
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
        page.getByTestId("PdfViewer").locator(".textLayer").first(),
      ).not.toBeEmpty();
      if (previewUrl === externalFileUrl) {
        await expect(annotationsPanel).toHaveCount(0);
      } else {
        await expect(
          annotationsPanel.getByPlaceholder("Search 1 annotations..."),
        ).toBeVisible();
      }
      await page.getByTestId("Popup.close").last().click();
    }
    /* File forms preserve custom values and defaults across file selection and replacement. */
    await openTable(page, "files", true);
    await setFileView("table");
    const filesTable = page.locator('[data-table-name="files"]');
    await filesTable.getByTestId("dashboard.window.rowInsert").click();
    const fileForm = page.getByTestId("SmartForm");
    const captionInput = fileForm
      .locator('[data-key="caption"]')
      .getByRole("textbox");
    const categoryInput = fileForm
      .locator('[data-key="category"]')
      .getByRole("textbox");
    await captionInput.fill("Custom caption");
    await expect(categoryInput).toHaveValue("general");
    await expect(fileForm.locator('[data-key="content_length"]')).toHaveCount(
      0,
    );
    await expect(
      fileForm.locator('[data-key="text_extraction_metadata"]'),
    ).toHaveCount(0);
    for (const name of ["initial.txt", "replacement.txt"]) {
      await fileForm.locator('input[type="file"]').setInputFiles({
        name,
        mimeType: "text/plain",
        buffer: Buffer.from("File with custom fields"),
      });
      await expect(captionInput).toHaveValue("Custom caption");
      await expect(categoryInput).toHaveValue("general");
      if (name === "initial.txt") {
        await fileForm.locator(".FileInputMedia .Chip_DeleteBtn").click();
      }
    }
    await fileForm.getByTestId("SmartForm.insert").click();
    await expect(page.locator(".SmartForm")).toBeHidden();
    const customFileFilter = { original_name: "replacement.txt" };
    await expect
      .poll(() => dbo.files!.findOne!(customFileFilter))
      .toMatchObject({ caption: "Custom caption", category: "general" });

    /* Updating custom columns does not replace the stored file. */
    const insertedFile = await dbo.files!.findOne!(customFileFilter);
    assert.ok(insertedFile);
    await filesTable
      .getByRole("row")
      .filter({ hasText: "replacement.txt" })
      .getByTestId("dashboard.window.viewEditRow")
      .click();
    /* File previews and removal controls align with icon-bearing form fields. */
    const savedFilePreview = fileForm.getByTestId("MediaViewer");
    const removeFileButton = fileForm.getByRole("button", {
      name: "Remove file",
      exact: true,
    });
    await expect(savedFilePreview).toBeVisible();
    await expect(removeFileButton).toBeVisible();
    const captionBounds = await fileForm
      .locator('[data-key="caption"] .form-field__hint-wrapper')
      .boundingBox();
    const previewBounds = await savedFilePreview.boundingBox();
    const removeButtonBounds = await removeFileButton.boundingBox();
    assert.ok(captionBounds && previewBounds && removeButtonBounds);
    expect(previewBounds.x).toBeCloseTo(captionBounds.x, 0);
    expect(removeButtonBounds.x).toBeCloseTo(captionBounds.x, 0);
    await captionInput.fill("Updated caption");
    await fileForm.getByTestId("SmartForm.update").click();
    await page.getByTestId("SmartForm.update.confirm").click();
    await expect
      .poll(() => dbo.files!.findOne!(customFileFilter))
      .toMatchObject({
        caption: "Updated caption",
        category: "general",
        storage_key: insertedFile.storage_key,
        version: insertedFile.version,
      });
  } finally {
    await deployment?.dispose();
    rmSync(configPath, { recursive: true, force: true });
  }
});

test("CLI annotations stay bound to file revisions", async ({ page }) => {
  const configId = "annotation-revisions-e2e";
  const configPath = createConfigTestProject(
    {
      id: configId,
      /* Revision cards generate a reference display for file_version. */
      connection: {
        table_options: {
          revisions: { card: { headerColumn: "original_name" } },
        },
      },
      tableConfig: {
        conditions: {
          columns: {
            id: "serial PRIMARY KEY",
            source_annotation_id: "integer REFERENCES file_annotations(id)",
          },
        },
      },
      databaseConfig: {
        file_table_config: {
          fileTable: "files",
          annotationsTable: "file_annotations",
          storageType: { type: "local" },
          versioning: { tableName: "revisions" },
          extractText: false,
        },
      },
    },
    test.info().outputPath("config"),
  );
  const deployment = await createTestDeployment({ configId, configPath });
  try {
    const { db, sql } = await deployment.connectProjectAs("admin");
    const file = await db.files!.insert!(
      {
        original_name: "revisions.pdf",
        data: createAnnotationPdf(),
        text_content: ["Beginning phrase", "Middle page", "Ending phrase"],
      },
      { returning: "*" },
    );
    const original = await db.file_annotations!.insert!(
      {
        file_id: file.id,
        page: 1,
        start_text: "Beginning",
        end_text: "phrase",
      },
      { returning: "*" },
    );
    expect(original.file_version).toBe(1);
    await db.files!.update!(
      { id: file.id },
      {
        original_name: "revisions.pdf",
        data: createAnnotationPdf("Replacement phrase"),
        text_content: ["Replacement phrase"],
      },
    );
    const replacement = await db.file_annotations!.insert!(
      {
        file_id: file.id,
        page: 1,
        start_text: "Replacement",
        end_text: "phrase",
      },
      { returning: "*" },
    );
    expect(replacement.file_version).toBe(2);
    const historical = await db.file_annotations!.insert!(
      {
        file_id: file.id,
        file_version: 1,
        page: 3,
        start_text: "Ending",
        end_text: "phrase",
      },
      { returning: "*" },
    );
    expect(historical.text).toBe("Ending phrase");
    await db.file_annotations!.update!(
      { id: original.id },
      { end_text: "phrase" },
    );
    expect(
      await db.file_annotations!.findOne!({ id: original.id }),
    ).toMatchObject({
      file_version: 1,
      text: "Beginning phrase",
    });
    for (const fileVersion of [2, 99]) {
      await expect(
        db.file_annotations!.insert!({
          file_id: file.id,
          file_version: fileVersion,
          page: 1,
          start_text: "Beginning",
          end_text: "phrase",
        }),
      ).rejects.toBeDefined();
    }
    await expect(
      db.file_annotations!.update!(
        { id: original.id },
        {
          file_version: null,
        },
      ),
    ).rejects.toMatchObject({ message: "Provide an annotation file_version" });
    assert.ok(sql);
    await expect(
      sql("UPDATE file_annotations SET file_version = 99 WHERE id = $1", [
        original.id,
      ]),
    ).rejects.toBeDefined();
    await expect(
      sql("DELETE FROM revisions WHERE file_id = $1 AND version = 1", [
        file.id,
      ]),
    ).rejects.toBeDefined();

    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await openTable(page, "files", true);
    await page
      .locator('[data-table-name="files"]')
      .getByTitle("application/pdf")
      .click();
    const viewer = page.getByTestId("PdfViewer");
    await expect(viewer.locator(".textLayer").first()).toContainText(
      "Replacement phrase",
    );
    /* Preview cards omit the file and revision already shown by the PDF. */
    const annotationCard = viewer
      .getByRole("complementary", { name: "PDF annotations" })
      .locator(".SmartCard");
    await expect(annotationCard).toHaveCount(1);
    await expect(annotationCard).toContainText("Replacement phrase");
    await expect(annotationCard.getByTitle("application/pdf")).toHaveCount(0);
    await expect(
      annotationCard
        .locator(".Label")
        .filter({ hasText: /^file (id|version)$/i }),
    ).toHaveCount(0);
    await expect(
      viewer.locator(`[data-annotation-id="${replacement.id}"]`),
    ).toBeVisible();
    await expect(
      viewer.locator(`[data-annotation-id="${original.id}"]`),
    ).toHaveCount(0);
    await page.getByTestId("Popup.close").last().click();
    /* The file form's top preview resolves annotations without row context. */
    await page
      .locator('[data-table-name="files"]')
      .getByTestId("dashboard.window.viewEditRow")
      .click();
    await page
      .getByTestId("SmartForm")
      .getByTestId("MediaViewer")
      .first()
      .getByRole("button")
      .click();
    await expect(viewer.locator(".textLayer").first()).toContainText(
      "Replacement phrase",
    );
    await expect(
      viewer.locator(`[data-annotation-id="${replacement.id}"]`),
    ).toBeVisible();
    await expect(
      viewer.locator(`[data-annotation-id="${original.id}"]`),
    ).toHaveCount(0);
    await page.getByTestId("Popup.close").last().click();
    await page.getByTestId("Popup.close").last().click();
    await openTable(page, "file_annotations", true);
    await page
      .locator('[data-table-name="file_annotations"]')
      .getByRole("row")
      .filter({ hasText: "Beginning phrase" })
      .getByTestId("dashboard.window.viewEditRow")
      .click();
    await page.getByTestId("SmartForm").getByTitle("application/pdf").click();
    await expect(viewer.locator(".textLayer").first()).toContainText(
      "Beginning phrase",
    );
    await expect(
      viewer.locator(`[data-annotation-id="${original.id}"]`),
    ).toBeVisible();
    await expect(
      viewer.locator(`[data-annotation-id="${replacement.id}"]`),
    ).toHaveCount(0);
    await page.getByTestId("Popup.close").last().click();
    await page.getByTestId("Popup.close").last().click();

    /* A reference selects its annotation and page from the historical PDF. */
    const condition = await db.conditions!.insert!(
      { source_annotation_id: historical.id },
      { returning: "*" },
    );
    await openTable(page, "conditions", true);
    await page
      .locator('[data-table-name="conditions"]')
      .getByRole("button", { name: "Ending phrase", exact: true })
      .click();
    await expect(page.getByTestId("SmartForm")).toHaveCount(0);
    await expect(viewer.locator(".textLayer").first()).toContainText(
      "Beginning phrase",
    );
    await expect(
      page.getByTestId("PdfViewer.toolbar").getByTestId("Pagination.page"),
    ).toHaveValue("3");
    const selectedHighlight = viewer
      .getByTestId("PdfViewer.highlight")
      .and(viewer.locator(`[data-annotation-id="${historical.id}"]`));
    await expect(selectedHighlight).toBeInViewport();
    await expect(selectedHighlight).toHaveCSS("opacity", "1");
    await expect(
      viewer
        .getByTestId("PdfViewer.highlight")
        .and(viewer.locator(`[data-annotation-id="${original.id}"]`)),
    ).toHaveCSS("opacity", "0.12");
    await expect(
      viewer.locator(`[data-annotation-id="${replacement.id}"]`),
    ).toHaveCount(0);
    await page.getByTestId("Popup.close").last().click();
    await expect(viewer).toHaveCount(0);
    await db.conditions!.delete!({ id: condition.id });
    await db.files!.delete!({ id: file.id });
    expect(await db.file_annotations!.count!({ file_id: file.id })).toBe(0);
  } finally {
    await deployment.dispose();
  }
});

test("CLI text annotations validate anchors and span PDF pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1080, height: 900 });
  const configPath = createConfigTestProject(
    {
      id: "text-annotations-e2e",
      connection: {
        table_options: {
          file_annotations: {
            columns: { text: { label: "Quoted text" } },
          },
        },
      },
      tableConfig: {
        annotation_comments: {
          columns: {
            id: "serial PRIMARY KEY",
            annotation_id: "integer REFERENCES file_annotations(id)",
            text: "text NOT NULL",
          },
        },
      },
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
    expect(deferred.color).toBe(DEFAULT_ANNOTATION_COLOR);
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
    const viewer = page.getByTestId("PdfViewer");
    const toolbar = page
      .getByTestId("Popup.header")
      .getByTestId("PdfViewer.toolbar");
    await expect(toolbar).toBeVisible();
    const continuousScroll = toolbar.getByRole("checkbox", {
      name: "Continuous scroll",
    });
    await expect(continuousScroll).toBeChecked();
    await continuousScroll.uncheck();
    const highlights = viewer.getByTestId("PdfViewer.highlight");
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
        await toolbar.getByTestId("Pagination.nextPage").click();
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
    await toolbar.getByTestId("Pagination.firstPage").click();
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
    /* Selection controls stay inside the visible pane when the PDF is wider. */
    await page.setViewportSize({ width: 520, height: 900 });
    await selectText("Beginning phrase");
    for (const title of ["Add annotation", "Add another selection"]) {
      const button = viewer.getByTitle(title, { exact: true });
      await expect(button).toBeInViewport({ ratio: 1 });
      await expect(button).toHaveCSS("box-sizing", "border-box");
      expect((await button.boundingBox())!.height).toBe(32);
    }
    await viewer.getByTitle("Add another selection").click();
    await page.setViewportSize({ width: 1080, height: 900 });
    await expect(highlights).toHaveCount(1);
    await selectText("Separate excerpt");
    await viewer.getByTitle("Add another selection").click();
    await expect(highlights).toHaveCount(2);
    await toolbar.getByTestId("Pagination.lastPage").click();
    await expect(viewer.locator(".textLayer")).toContainText("Ending phrase");
    await selectText("Ending phrase");
    await viewer.getByTitle("Add another selection").click();
    await expect(highlights).toHaveCount(1);
    await viewer
      .getByRole("button", { name: "Save annotation", exact: true })
      .click();
    const form = page.getByTestId("SmartForm").last();
    /* Annotation colors use the shared palette and persist with the excerpt. */
    await form.getByTitle("Annotation color", { exact: true }).click();
    expect(
      await page
        .getByTestId("Popup.content")
        .last()
        .locator("button[data-key]")
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute("data-key")),
        ),
    ).toEqual(chipColorsFaded.map(({ color }) => color));
    await page.locator('[data-key="var(--light-green)"]').click();
    await form.getByTestId("SmartForm.insert").click();
    await expect
      .poll(() => db.file_annotations!.findOne!())
      .toMatchObject({
        page: 1,
        end_page: 3,
        text: "Beginning phrase\nSeparate excerpt\nEnding phrase",
        color: "var(--light-green)",
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
    await toolbar.getByTestId("Pagination.firstPage").click();
    await expect(highlights).toHaveCount(2);
    await expect(highlights.first()).toHaveAttribute(
      "style",
      expect.stringContaining("background-color: var(--light-green)"),
    );
    await toolbar.getByTestId("Pagination.nextPage").click();
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
    await toolbar.getByTestId("Pagination.lastPage").click();
    await expect(highlights).toHaveCount(2);
    const openSaved = async () => {
      await toolbar
        .getByRole("button", { name: "Annotations (2)", exact: true })
        .click();
      await page
        .getByTestId("SearchList.List")
        .getByText("Selected annotation", { exact: true })
        .click();
      await expect(page.getByTestId("SmartForm").last()).toBeVisible();
    };
    await openSaved();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(
      highlights.and(viewer.locator(`[data-annotation-id="${saved.id}"]`)),
    ).toHaveCSS("opacity", "1");
    await expect(
      highlights.and(viewer.locator(`[data-annotation-id="${other.id}"]`)),
    ).toHaveCSS("opacity", "0.12");
    await page.getByTestId("Popup.close").last().click();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(
      highlights.and(viewer.locator(`[data-annotation-id="${other.id}"]`)),
    ).toHaveCSS("opacity", "1");
    await toolbar.getByTestId("Pagination.prevPage").click();
    await expect(viewer.locator(".textLayer")).toContainText("Middle page");
    await openSaved();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("1");

    const searchInput = toolbar.getByPlaceholder("Search document");
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

    /* New searches prefer the current page and scroll to its offscreen match. */
    await toolbar.getByTestId("Pagination.nextPage").click();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("2");
    await searchInput.fill("Footer text");
    await expect(toolbar.locator(".pdf-viewer-search__count")).toHaveText(
      "2/3",
    );
    for (const expectedPage of ["2", "3", "1", "2"]) {
      await expect(toolbar.getByTestId("Pagination.page")).toHaveValue(
        expectedPage,
      );
      await expect(
        viewer.locator(".textLayer span").filter({ hasText: /^Footer text$/ }),
      ).toBeInViewport({ ratio: 1 });
      await toolbar.getByRole("button", { name: "Next result" }).click();
    }
    await toolbar.getByRole("button", { name: "Previous result" }).click();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("2");
    await expect(
      viewer.locator(".textLayer span").filter({ hasText: /^Footer text$/ }),
    ).toBeInViewport({ ratio: 1 });

    /* Enter applies pending input; a page without matches falls back to match 1. */
    await searchInput.fill("Beginning phrase");
    await searchInput.press("Enter");
    await expect(toolbar.locator(".pdf-viewer-search__count")).toHaveText(
      "1/1",
    );
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("1");
    await expect
      .poll(() =>
        page.evaluate(() =>
          Array.from(CSS.highlights.get("pdf-viewer-search-active") ?? [])
            .map((range) => (range instanceof Range ? range.toString() : ""))
            .join(""),
        ),
      )
      .toBe("Beginning phrase");

    /* Search colors preserve the PDF lettering without painting overlay text. */
    await expect(viewer.locator(".textLayer")).toHaveCSS(
      "mix-blend-mode",
      "multiply",
    );
    const searchedText = viewer
      .locator(".textLayer span")
      .filter({ hasText: "Beginning phrase" });
    for (const highlightName of [
      "pdf-viewer-search",
      "pdf-viewer-search-active",
    ]) {
      expect(
        await searchedText.evaluate(
          (span, name) => getComputedStyle(span, `::highlight(${name})`).color,
          highlightName,
        ),
      ).toBe("rgba(0, 0, 0, 0)");
    }

    /* Continuous scrolling preserves navigation, search and text annotations. */
    await searchInput.fill("");
    await expect(continuousScroll).not.toBeChecked();
    await continuousScroll.check();
    const pdfPages = viewer.locator(".pdfViewer .page");
    await expect(pdfPages).toHaveCount(3);
    await toolbar.getByTestId("Pagination.nextPage").click();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("2");
    await expect(pdfPages.nth(1).locator(".textLayer")).toContainText(
      "Middle page",
    );
    await pdfPages.nth(1).hover();
    await page.mouse.wheel(0, 1250);
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(
      pdfPages.nth(2).getByTestId("PdfViewer.highlight"),
    ).toHaveCount(2);
    await selectText("Ending phrase");
    await expect(
      viewer.getByTitle("Add annotation", { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await searchInput.fill("Footer text");
    await expect(toolbar.locator(".pdf-viewer-search__count")).toHaveText(
      "3/3",
    );
    for (const [index, expectedPage] of [3, 1, 2, 3].entries()) {
      if (index) await searchInput.press("Enter");
      await expect(toolbar.getByTestId("Pagination.page")).toHaveValue(
        String(expectedPage),
      );
      await expect(
        pdfPages
          .nth(expectedPage - 1)
          .locator(".textLayer span")
          .filter({ hasText: /^Footer text$/ }),
      ).toBeInViewport({ ratio: 0.99 });
    }
    /* Search highlights every rendered page, including adjacent pages. */
    await expect
      .poll(() =>
        page.evaluate(() =>
          Array.from(CSS.highlights.get("pdf-viewer-search") ?? [])
            .map((range) =>
              range.startContainer.parentElement
                ?.closest(".page")
                ?.getAttribute("data-page-number"),
            )
            .sort(),
        ),
      )
      .toEqual(["1", "2", "3"]);
    /* Returning to the active result's page must not override manual scrolling. */
    await pdfPages.first().evaluate((element) => element.scrollIntoView());
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("1");
    await expect
      .poll(() =>
        page.evaluate(() =>
          Array.from(CSS.highlights.get("pdf-viewer-search-active") ?? []).map(
            (range) =>
              range.startContainer.parentElement
                ?.closest(".page")
                ?.getAttribute("data-page-number"),
          ),
        ),
      )
      .toEqual(["3"]);
    await pdfPages.nth(2).evaluate((element) => element.scrollIntoView());
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(
      pdfPages
        .nth(2)
        .locator(".textLayer span")
        .filter({ hasText: "Ending phrase" }),
    ).toBeInViewport({ ratio: 0.99 });
    await searchInput.fill("");
    await continuousScroll.uncheck();
    await expect(pdfPages).toHaveCount(1);
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(pdfPages.locator(".textLayer")).toContainText("Ending phrase");
    await continuousScroll.check();
    await expect(pdfPages).toHaveCount(3);
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await continuousScroll.uncheck();
    await expect(pdfPages).toHaveCount(1);
    await expect(pdfPages.locator(".textLayer")).toContainText("Ending phrase");

    /* Wide viewers show searchable table cards beside the PDF; narrow viewers use the menu. */
    await searchInput.fill("");
    await page.getByTestId("Popup.close").last().click();
    await page.setViewportSize({ width: 1600, height: 900 });
    /* Reserve the annotation pane's full size before the PDF finishes loading. */
    const pdfResponseReady = Promise.withResolvers<void>();
    await page.route(
      new URL(file.url, deployment.dashboardUrl).href,
      async (route) => {
        await pdfResponseReady.promise;
        await route.continue();
      },
      { times: 1 },
    );
    await page
      .locator('[data-table-name="files"]')
      .getByTitle("application/pdf")
      .click();
    const annotationsPanel = viewer.getByRole("complementary", {
      name: "PDF annotations",
    });
    await expect(annotationsPanel).toBeVisible();
    const loadingPanelBounds = await annotationsPanel.boundingBox();
    assert.ok(loadingPanelBounds);
    expect(loadingPanelBounds.height).toBeGreaterThan(700);
    await expect(viewer.locator(".pdfViewer .page")).toHaveCount(0);
    await continuousScroll.uncheck();
    pdfResponseReady.resolve();
    await expect(viewer.locator(".textLayer")).toContainText(
      "Beginning phrase",
    );
    await expect(
      annotationsPanel.getByPlaceholder("Search 2 annotations..."),
    ).toBeVisible();
    await expect(annotationsPanel.getByRole("heading")).toHaveCount(0);
    await expect(annotationsPanel.locator(".SmartCard")).toHaveCount(2);
    await expect(annotationsPanel.getByTitle("application/pdf")).toHaveCount(0);
    expect(await annotationsPanel.boundingBox()).toEqual(loadingPanelBounds);
    /* PDF clicks reveal offscreen and paginated cards while search and pagination stay fixed. */
    const paneScrollAnnotations = await db.file_annotations!.insert!(
      Array.from({ length: 25 }, (_, index) => ({
        file_id: file.id,
        name: `Pane scroll annotation ${index}`,
        text_selections: [
          {
            page: 2,
            startText: "Middle page",
            endText: "Middle page",
            rects: [{ x: 40, y: 40, width: 100, height: 12 }],
          },
        ],
      })),
      { returning: "*" },
    );
    const annotationPaneSearch = annotationsPanel.locator(".SmartSearch input");
    /* Suggestions and Enter filters only search the displayed annotation fields. */
    await annotationPaneSearch.fill(file.id);
    await expect(annotationsPanel.getByTestId("SearchList.List")).toContainText(
      "No results",
    );
    await annotationPaneSearch.press("Enter");
    await expect(annotationsPanel.locator(".SmartCard")).toHaveCount(0);
    await annotationsPanel.locator(".FilterWrapper_MinimisedRoot").click();
    await annotationsPanel.getByTestId("FilterWrapper.deleteFilter").click();
    await expect(annotationsPanel.locator(".SmartCard")).toHaveCount(25);
    const annotationRows = annotationsPanel.locator(".SmartCardListRows");
    const annotationPagination = annotationsPanel.getByTestId("Pagination");
    await expect(annotationPaneSearch).toHaveAttribute(
      "placeholder",
      "Search 27 annotations...",
    );
    await expect(annotationsPanel.locator(".SmartCard")).toHaveCount(25);
    const searchBounds = await annotationPaneSearch.boundingBox();
    const paginationBounds = await annotationPagination.boundingBox();
    await annotationRows.evaluate((rows) => {
      rows.scrollTop = rows.scrollHeight;
    });
    await expect
      .poll(() => annotationRows.evaluate((rows) => rows.scrollTop))
      .toBeGreaterThan(0);
    await expect(annotationPaneSearch).toBeInViewport({ ratio: 1 });
    await expect(annotationPagination).toBeInViewport({ ratio: 1 });
    expect(await annotationPaneSearch.boundingBox()).toEqual(searchBounds);
    expect(await annotationPagination.boundingBox()).toEqual(paginationBounds);
    await toolbar.getByTestId("Pagination.lastPage").click();
    await viewer
      .locator(".textLayer span")
      .filter({ hasText: /^Separate excerpt$/ })
      .click();
    await expect(
      annotationPagination.getByTestId("Pagination.page"),
    ).toHaveValue("2");
    await expect(annotationsPanel.locator(".SmartCard.selected")).toContainText(
      "Other excerpt",
    );
    await expect(
      annotationsPanel.locator(".SmartCard.selected"),
    ).toBeInViewport({
      ratio: 1,
    });
    const pdfSavedText = viewer
      .locator(".textLayer span")
      .filter({ hasText: /^Ending phrase$/ });
    await pdfSavedText.click();
    await expect(
      annotationPagination.getByTestId("Pagination.page"),
    ).toHaveValue("1");
    const selectedPaneCard = annotationsPanel.locator(".SmartCard.selected");
    await expect(selectedPaneCard).toContainText("Selected annotation");
    await expect(selectedPaneCard).toBeInViewport({ ratio: 1 });
    await annotationRows.evaluate((rows) => {
      rows.scrollTop = rows.scrollHeight;
    });
    await expect(selectedPaneCard).not.toBeInViewport();
    await pdfSavedText.click();
    await expect(selectedPaneCard).toBeInViewport({ ratio: 1 });
    await db.file_annotations!.delete!({
      id: { $in: paneScrollAnnotations.map(({ id }) => id) },
    });
    await expect(annotationPaneSearch).toHaveAttribute(
      "placeholder",
      "Search 2 annotations...",
    );
    await expect(annotationsPanel.locator(".SmartCard")).toHaveCount(2);

    /* PDF interaction and live updates must preserve the loaded annotation list. */
    await expect(annotationsPanel.locator(".cover-loader")).toHaveCount(0);
    const annotationsPanelElement = await annotationsPanel.elementHandle();
    assert.ok(annotationsPanelElement);
    await annotationsPanel.evaluate((panel) => {
      panel.dataset.loadingShown = "false";
      new MutationObserver((mutations) => {
        if (
          mutations.some(({ addedNodes }) =>
            Array.from(addedNodes).some(
              (node) =>
                node instanceof Element &&
                (node.matches(".cover-loader") ||
                  node.querySelector(".cover-loader")),
            ),
          )
        ) {
          panel.dataset.loadingShown = "true";
        }
      }).observe(panel, { childList: true, subtree: true });
    });
    /* The wider annotation panel can be resized without hiding the PDF. */
    await expect(annotationsPanel).toHaveCSS("width", "480px");
    const resizeHandle = annotationsPanel.getByTestId(
      "PdfViewer.annotationsResizer",
    );
    const resizeHandleBounds = await resizeHandle.boundingBox();
    assert.ok(resizeHandleBounds);
    const resizeStartX = resizeHandleBounds.x + resizeHandleBounds.width / 2;
    const resizeStartY = resizeHandleBounds.y + resizeHandleBounds.height / 2;
    await page.mouse.move(resizeStartX, resizeStartY);
    await page.mouse.down();
    await page.mouse.move(resizeStartX - 50, resizeStartY, { steps: 5 });
    await expect(annotationsPanel).toHaveCSS("width", "430px");
    await page.mouse.move(resizeStartX - 100, resizeStartY, { steps: 5 });
    await page.mouse.up();
    const resizedPanelBounds = await annotationsPanel.boundingBox();
    assert.ok(resizedPanelBounds);
    expect(resizedPanelBounds.width).toBeCloseTo(380, -1);
    const otherCard = annotationsPanel
      .locator(".SmartCard")
      .filter({ hasText: "Other excerpt" });
    const savedCard = annotationsPanel
      .locator(".SmartCard")
      .filter({ hasText: "Selected annotation" });
    await expect(otherCard.locator(".SmartCardHeader")).toContainText(
      "Other excerpt",
    );
    await otherCard
      .getByRole("button", { name: "Other excerpt", exact: true })
      .click();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    const annotationText = viewer
      .locator('.pdfViewer .page[data-page-number="3"] .textLayer span')
      .filter({ hasText: /^Separate excerpt$/ });
    await expect(annotationText).toBeInViewport({ ratio: 1 });
    /* PDF clicks select annotation cards; blank areas clear them without affecting text selection. */
    const savedAnnotationText = viewer
      .locator(".textLayer span")
      .filter({ hasText: /^Ending phrase$/ });
    /* Hover emphasizes matching cards and PDF highlights without changing selection or page. */
    const savedPdfHighlight = viewer.locator(
      `[data-annotation-id="${saved.id}"]`,
    );
    const otherPdfHighlight = viewer.locator(
      `[data-annotation-id="${other.id}"]`,
    );
    await savedCard.hover();
    await expect(savedCard).toContainClass("hovered");
    await expect(savedPdfHighlight).toContainClass("hovered");
    await expect(savedPdfHighlight).toHaveCSS("opacity", "1");
    await expect(savedPdfHighlight).toHaveCSS("outline-style", "none");
    await expect(savedCard).toHaveCSS(
      "background-color",
      await savedPdfHighlight.evaluate(
        (highlight) => getComputedStyle(highlight).backgroundColor,
      ),
    );
    await expect(otherCard).toContainClass("selected");
    await expect(savedCard).not.toContainClass("selected");
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    /* Annotation tooltips require dwelling and cancel when the pointer leaves. */
    const annotationTooltip = viewer.getByRole("tooltip");
    await annotationText.hover();
    await expect(annotationTooltip).toHaveCount(0);
    await expect(otherCard).toContainClass("hovered");
    await expect(otherCard).toHaveCSS("outline-style", "none");
    await expect(otherPdfHighlight).toContainClass("hovered");
    await expect(savedCard).not.toContainClass("hovered");
    await expect(savedPdfHighlight).not.toContainClass("hovered");
    await expect(savedPdfHighlight).toHaveCSS("opacity", "0.12");
    await expect(annotationTooltip).toHaveText("Other excerpt");
    await savedAnnotationText.hover();
    await expect(annotationTooltip).toHaveCount(0);
    await expect(savedCard).toContainClass("hovered");
    await expect(savedPdfHighlight).toContainClass("hovered");
    await expect(savedPdfHighlight).toHaveCSS("opacity", "1");
    await expect(otherCard).toContainClass("selected");
    /* Crossing a gap between text lines must not briefly clear hover emphasis. */
    const hoveredHighlightBounds = await savedPdfHighlight.boundingBox();
    assert.ok(hoveredHighlightBounds);
    await page.mouse.move(
      hoveredHighlightBounds.x + 1,
      hoveredHighlightBounds.y - 1,
    );
    await expect(savedCard).toContainClass("hovered");
    await savedAnnotationText.hover();
    await expect(savedCard).toContainClass("hovered");
    await annotationsPanel.locator(".SmartSearch input").hover();
    await expect(annotationsPanel.locator(".SmartCard.hovered")).toHaveCount(0);
    await expect(viewer.locator(".pdf-viewer__highlight.hovered")).toHaveCount(
      0,
    );
    await expect(savedPdfHighlight).toHaveCSS("opacity", "0.12");
    await page.waitForTimeout(700);
    await expect(annotationTooltip).toHaveCount(0);
    await savedAnnotationText.click();
    await expect(savedCard).toContainClass("selected");
    await expect(otherCard).not.toContainClass("selected");
    const clickOutsideHighlight = async () => {
      const textBounds = await annotationText.boundingBox();
      assert.ok(textBounds);
      await page.mouse.click(
        textBounds.x - 15,
        textBounds.y + textBounds.height / 2,
      );
    };
    await clickOutsideHighlight();
    await expect(annotationsPanel.locator(".SmartCard.selected")).toHaveCount(
      0,
    );
    for (const highlight of await highlights.all()) {
      await expect(highlight).toHaveCSS("opacity", "1");
    }
    await annotationText.click();
    await annotationText.click();
    await expect(otherCard).toContainClass("selected");
    await expect(savedCard).not.toContainClass("selected");
    const selectionBounds = await savedAnnotationText.boundingBox();
    assert.ok(selectionBounds);
    const selectionY = selectionBounds.y + selectionBounds.height / 2;
    await page.mouse.move(selectionBounds.x + 1, selectionY);
    await page.mouse.down();
    await page.mouse.move(
      selectionBounds.x + selectionBounds.width - 1,
      selectionY,
      { steps: 5 },
    );
    await page.mouse.up();
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString()))
      .toContain("Ending");
    await expect(annotationTooltip).toHaveCount(0);
    await expect(annotationsPanel.locator(".SmartCard.hovered")).toHaveCount(0);
    await expect(otherCard).toContainClass("selected");
    await expect(
      viewer.getByTitle("Add annotation", { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await viewer.locator(".pdfViewer").evaluate((renderer) => {
      const scrollContainer = renderer.parentElement!;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });
    /* Scrolling away from the selected text clears the annotation selection. */
    await expect(annotationsPanel.locator(".SmartCard.selected")).toHaveCount(
      0,
    );
    await expect(annotationText).not.toBeInViewport();
    await otherCard
      .getByRole("button", { name: "Other excerpt", exact: true })
      .press("Enter");
    await expect(annotationText).toBeInViewport({ ratio: 1 });
    await expect(page.locator(".DetailedCardPopup")).toHaveCount(0);
    await expect(otherCard).toContainClass("selected");
    await expect(annotationsPanel.locator(".SmartCard.selected")).toHaveCount(
      1,
    );
    await expect(otherCard).not.toHaveCSS(
      "background-color",
      await savedCard.evaluate(
        (card) => getComputedStyle(card).backgroundColor,
      ),
    );
    await expect(
      viewer.locator(`[data-annotation-id="${other.id}"]`),
    ).toHaveCSS("opacity", "1");
    /* Match the card's color and blend with the PDF canvas to preserve its text. */
    await expect(
      viewer.locator(`[data-annotation-id="${other.id}"]`),
    ).toHaveCSS(
      "background-color",
      await otherCard.evaluate(
        (card) => getComputedStyle(card).backgroundColor,
      ),
    );
    await expect(viewer.locator(".pdf-viewer__highlight-layer")).toHaveCSS(
      "mix-blend-mode",
      "multiply",
    );
    /* Wheel scrolling can leave a selected annotation's page without snapping back. */
    await continuousScroll.check();
    await expect(pdfPages).toHaveCount(3);
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(otherCard).toContainClass("selected");
    await savedCard.hover();
    await expect(
      pdfPages.last().locator(`[data-annotation-id="${saved.id}"]`),
    ).toContainClass("hovered");
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(otherCard).toContainClass("selected");
    await clickOutsideHighlight();
    await expect(annotationsPanel.locator(".SmartCard.selected")).toHaveCount(
      0,
    );
    await annotationText.click();
    await expect(otherCard).toContainClass("selected");
    await viewer.locator(".pdf-viewer__scroll").hover();
    await page.mouse.wheel(0, -5000);
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("1");
    await expect(annotationsPanel.locator(".SmartCard.selected")).toHaveCount(
      0,
    );
    await expect(pdfPages.first().locator(".textLayer")).toContainText(
      "Beginning phrase",
    );
    await continuousScroll.uncheck();
    await otherCard.getByText("Separate excerpt", { exact: true }).click();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await toolbar.getByTestId("Pagination.prevPage").click();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("2");
    await otherCard.getByText("Separate excerpt", { exact: true }).click();
    await expect(annotationsPanel.locator(".SmartCard.selected")).toHaveCount(
      0,
    );
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("2");
    await otherCard.getByText("Separate excerpt", { exact: true }).click();
    await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
    await expect(annotationText).toBeInViewport({ ratio: 1 });
    await savedCard
      .getByRole("button", { name: "Selected annotation", exact: true })
      .click();
    await expect(savedCard).toContainClass("selected");
    await expect(otherCard).not.toContainClass("selected");
    await otherCard.getByText("Separate excerpt", { exact: true }).click();
    await expect(otherCard).toContainClass("selected");
    await expect(savedCard).not.toContainClass("selected");
    await db.annotation_comments!.insert!({
      annotation_id: other.id,
      text: "Linked annotation comment",
    });
    await otherCard.getByTestId("SmartCard.viewEditRow").click();
    await expect(page.getByTestId("SmartForm")).toBeVisible();
    /* Color edits update both the PDF and the selected card without moving anchors. */
    const annotationForm = page.getByTestId("SmartForm").last();
    /* Popup interactions must not toggle the annotation card beneath them. */
    await annotationForm
      .locator('[data-key="name"]')
      .getByRole("textbox")
      .click();
    await expect(otherCard).toContainClass("selected");
    await annotationForm
      .getByTitle("Annotation color", { exact: true })
      .click();
    await page.locator('[data-key="var(--light-purple)"]').click();
    await expect(otherCard).toContainClass("selected");
    await annotationForm.getByTestId("SmartForm.update").click();
    await page.getByTestId("SmartForm.update.confirm").click();
    await expect
      .poll(() => db.file_annotations!.findOne!({ id: other.id }))
      .toMatchObject({
        color: "var(--light-purple)",
        page: other.page,
        text_selections: other.text_selections,
      });
    await expect(
      viewer.locator(`[data-annotation-id="${other.id}"]`),
    ).toHaveAttribute(
      "style",
      expect.stringContaining("background-color: var(--light-purple)"),
    );
    await expect(otherCard).toHaveAttribute(
      "style",
      expect.stringContaining("var(--light-purple)"),
    );
    await expect(annotationForm).toBeHidden();
    await otherCard.getByTestId("SmartCard.viewEditRow").click();
    /* Opening an annotation from the PDF panel must keep joined sections mounted. */
    const joinedRecords = page
      .getByTestId("SmartForm")
      .getByTestId("JoinedRecords");
    await expect(joinedRecords).toBeVisible();
    const joinedRecordsElement = await joinedRecords.elementHandle();
    assert.ok(joinedRecordsElement);
    await joinedRecords.getByTestId("JoinedRecords.SectionToggle").click();
    const joinedComment = joinedRecords
      .locator(".SmartCard")
      .filter({ hasText: "Linked annotation comment" });
    await expect(joinedComment).toBeVisible();
    const joinedCommentElement = await joinedComment.elementHandle();
    assert.ok(joinedCommentElement);
    await db.file_annotations!.update!(
      { id: other.id },
      { name: "Other excerpt refreshed" },
    );
    await expect(otherCard.locator(".SmartCardHeader")).toContainText(
      "Other excerpt refreshed",
    );
    expect(
      await annotationsPanelElement.evaluate((panel) => panel.isConnected),
    ).toBe(true);
    await expect(annotationsPanel).toHaveAttribute(
      "data-loading-shown",
      "false",
    );
    await page.waitForTimeout(3_000);
    expect(
      await joinedRecordsElement.evaluate((element) => element.isConnected),
    ).toBe(true);
    expect(
      await joinedCommentElement.evaluate((element) => element.isConnected),
    ).toBe(true);
    await db.file_annotations!.update!(
      { id: other.id },
      { name: "Other excerpt" },
    );
    await expect(
      otherCard.getByRole("button", { name: "Other excerpt", exact: true }),
    ).toBeVisible();
    await page.getByTestId("Popup.close").last().click();
    await expect(otherCard).toContainClass("selected");
    /* An active annotation must not override the PDF search's scroll target. */
    await searchInput.fill("Footer text");
    await expect(toolbar.locator(".pdf-viewer-search__count")).toHaveText(
      "3/3",
    );
    for (const [index, expectedPage] of ["3", "1", "2", "3"].entries()) {
      if (index) await searchInput.press("Enter");
      await expect(toolbar.getByTestId("Pagination.page")).toHaveValue(
        expectedPage,
      );
      await expect(
        viewer.locator(".textLayer span").filter({ hasText: /^Footer text$/ }),
      ).toBeInViewport({ ratio: 0.99 });
    }
    await searchInput.fill("");
    await otherCard.getByText("Separate excerpt", { exact: true }).click();
    await expect(annotationText).toBeInViewport({ ratio: 1 });
    const annotationSearch = annotationsPanel.locator(".SmartSearch input");
    await annotationSearch.fill("Separate excerpt");
    await expect(annotationsPanel.getByTestId("SearchList.List")).toContainText(
      "Quoted text:",
    );
    await annotationSearch.fill("Other excerpt");
    await expect(annotationsPanel.getByTestId("SearchList.List")).toContainText(
      "Other excerpt",
    );
    await annotationSearch.press("Enter");
    await expect(annotationsPanel.locator(".SmartCard")).toHaveCount(1);
    await expect(otherCard).toBeVisible();
    const annotationsBounds = await annotationsPanel.boundingBox();
    const pageHost = viewer.locator(".pdfViewer");
    const pageHostBounds = await pageHost.boundingBox();
    const pageGap = await pageHost.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
    const pdfBounds = await viewer.locator(".pdfViewer .page").boundingBox();
    assert.ok(annotationsBounds && pageHostBounds && pdfBounds);
    /* The PDF keeps a 1em gap above, below and beside the annotations panel. */
    expect(
      pdfBounds.x - annotationsBounds.x - annotationsBounds.width,
    ).toBeCloseTo(pageGap, 0);
    expect(pdfBounds.y - pageHostBounds.y).toBeCloseTo(pageGap, 0);
    expect(
      pageHostBounds.y + pageHostBounds.height - pdfBounds.y - pdfBounds.height,
    ).toBeCloseTo(pageGap, 0);
    await page.setViewportSize({ width: 1080, height: 900 });
    await expect(annotationsPanel).toBeHidden();
    await expect(
      toolbar.getByRole("button", { name: "Annotations (2)", exact: true }),
    ).toBeVisible();

    /* Menu-opened forms also keep expanded joined records across live refreshes. */
    await toolbar
      .getByRole("button", { name: "Annotations (2)", exact: true })
      .click();
    await page
      .getByTestId("SearchList.List")
      .getByText("Other excerpt", { exact: true })
      .click();
    await expect(joinedRecords).toBeVisible();
    await expect(
      page
        .getByTestId("SmartForm")
        .getByTitle("Annotation color", { exact: true }),
    ).toHaveAttribute(
      "style",
      expect.stringContaining("background-color: var(--light-purple)"),
    );
    await joinedRecords.getByTestId("JoinedRecords.SectionToggle").click();
    await expect(joinedComment).toBeVisible();
    const menuJoinedCommentElement = await joinedComment.elementHandle();
    assert.ok(menuJoinedCommentElement);
    await db.file_annotations!.update!(
      { id: other.id },
      { name: "Other excerpt refreshed" },
    );
    const annotationName = page
      .getByTestId("SmartForm")
      .locator('[data-key="name"]')
      .getByRole("textbox");
    await expect(annotationName).toHaveValue("Other excerpt refreshed");
    await page.waitForTimeout(3_000);
    expect(
      await menuJoinedCommentElement.evaluate((element) => element.isConnected),
    ).toBe(true);
    await expect(joinedComment).toBeVisible();
    await db.file_annotations!.update!(
      { id: other.id },
      { name: "Other excerpt" },
    );
    await expect(annotationName).toHaveValue("Other excerpt");
    await page.getByTestId("Popup.close").last().click();

    /* Opening an annotation's file from a form or card selects it on its page. */
    await page.getByTestId("Popup.close").last().click();
    await page.setViewportSize({ width: 1600, height: 900 });
    await openTable(page, "file_annotations", true);
    const annotationsWindow = page.locator(
      '[data-table-name="file_annotations"]',
    );
    for (const source of ["form", "card"]) {
      if (source === "form") {
        await annotationsWindow
          .getByRole("row")
          .filter({ hasText: "Other excerpt" })
          .getByTestId("dashboard.window.viewEditRow")
          .click();
        await page
          .getByTestId("SmartForm")
          .getByTitle("application/pdf")
          .click();
      } else {
        const state = await deployment.connectStateAs("admin");
        const annotationWindow = await state.db.windows!.findOne({
          table_name: "file_annotations",
        });
        assert.ok(annotationWindow);
        await state.db.windows!.update(
          { id: annotationWindow.id },
          {
            options: { ...annotationWindow.options, viewAs: { type: "card" } },
          },
        );
        await annotationsWindow
          .getByTestId("CardView.row")
          .filter({ hasText: "Other excerpt" })
          .getByTitle("application/pdf")
          .click();
      }
      await continuousScroll.uncheck();
      await expect(toolbar.getByTestId("Pagination.page")).toHaveValue("3");
      await expect(
        viewer.locator(`[data-annotation-id="${other.id}"]`),
      ).toHaveCSS("opacity", "1");
      await expect(
        viewer.locator(`[data-annotation-id="${saved.id}"]`),
      ).toHaveCSS("opacity", "0.12");
      await expect(page.getByTestId("SmartForm")).toHaveCount(
        source === "form" ? 1 : 0,
      );
      /* An annotation selected through a file link can also be deselected. */
      await otherCard.getByText("Separate excerpt", { exact: true }).click();
      await expect(annotationsPanel.locator(".SmartCard.selected")).toHaveCount(
        0,
      );
      await annotationsPanel.locator(".SmartSearch input").hover();
      await expect(
        viewer.locator(`[data-annotation-id="${saved.id}"]`),
      ).toHaveCSS("opacity", "1");
      await page.getByTestId("Popup.close").last().click();
      if (source === "form") {
        await page.getByTestId("Popup.close").last().click();
      }
    }

    /* Long documents evict canvases and restore annotations when revisited. */
    const longDocument = await db.files!.insert!(
      {
        data: createAnnotationPdf("Long document", 12),
        original_name: "long-document.pdf",
      },
      { returning: "*" },
    );
    await db.file_annotations!.insert!({
      file_id: longDocument.id,
      page: 1,
      end_page: 1,
      start_text: "Long document",
      end_text: "Long document",
    });
    await openTable(page, "files", true);
    await page
      .locator('[data-table-name="files"]')
      .getByRole("row")
      .filter({ hasText: "long-document.pdf" })
      .getByTitle("application/pdf")
      .click();
    await continuousScroll.check();
    await expect(pdfPages).toHaveCount(15);
    for (let pageNumber = 1; pageNumber <= 15; pageNumber += 1) {
      if (pageNumber > 1)
        await toolbar.getByTestId("Pagination.nextPage").click();
      await expect(toolbar.getByTestId("Pagination.page")).toHaveValue(
        String(pageNumber),
      );
      await expect(
        pdfPages.nth(pageNumber - 1).locator(".textLayer"),
      ).toBeVisible();
    }
    await expect
      .poll(() => pdfPages.locator("canvas").count())
      .toBeLessThanOrEqual(10);
    await toolbar.getByTestId("Pagination.firstPage").click();
    await expect(
      pdfPages.first().getByTestId("PdfViewer.highlight"),
    ).toHaveCount(1);
    await continuousScroll.uncheck();
    await expect(pdfPages).toHaveCount(1);
    await expect(pdfPages.getByTestId("PdfViewer.highlight")).toHaveCount(1);
  } finally {
    await deployment.dispose();
  }
});

test("CLI extraction jobs run once, preserve annotation text, limit concurrency and preserve configured jobs", async ({
  page,
}) => {
  const configId = "extraction-jobs-e2e";
  const drawingDetails =
    "Gate, Fence, Construction Road, CCTV Camera & Satellite Dish Details PL.008 R1";
  const secondPageText = `page two\n${drawingDetails}`;
  const configPath = createConfigTestProject(
    {
      id: configId,
      databaseConfig: {
        file_table_config: {
          fileTable: "files",
          storageType: { type: "local" },
          extractText: true,
          extractTextOptions: { do_ocr: false, table_mode: "fast" },
          annotationsTable: "file_annotations",
        },
      },
      connection: {
        table_options: {
          files: { card: { summaryFields: ["description", "url"] } },
          app_jobs: {
            label: "Background jobs",
            columns: { status: { label: "State" } },
          },
        },
      },
      tableConfig: {
        extraction_calls: {
          columns: {
            id: "serial PRIMARY KEY",
            name: "text NOT NULL",
            filename: "text NOT NULL",
          },
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
    commands: { update: 1 }, changedFields: ["text_extraction_job_id"],
    validate: async ({ dbx, row }) => {
      if (!row.text_extraction_job_id) return;
      if (row.original_name === "rejected.pdf") throw new Error("Reject extraction job link");
      /* Replacement clears the old link before the job hook assigns the new one. */
      await dbx.file_job_links.insert({ job_id: row.text_extraction_job_id, file_id: row.id }, { onConflict: "DoNothing" });
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
    return { endpoints: { "/v1/convert/file": async ({ files, md_page_break_placeholder, do_ocr, table_mode }, { signal }) => {
      if (do_ocr !== false || table_mode !== "fast") throw new Error("Configured extraction options were lost");
      const name = (await files[0].text()).split("\\n").at(-1);
      await dbo.extraction_calls.insert({ name, filename: files[0].name });
      if (name === "blocked" || name === "cancelled") {
        while (!(await dbo.job_checks.findOne({ id: 1 })).released) {
          signal.throwIfAborted();
          await new Promise(resolve => setTimeout(resolve, 25));
        }
      }
      if (name === "fail") throw new Error("Docling unavailable");
      const size = { width: 600, height: 800 };
      const bbox = { l: 40, t: 760, r: 220, b: 730, coord_origin: "BOTTOMLEFT" };
      return {
        document: {
          json_content: files[0].type !== "application/pdf" ? { pages: {} } : {
            name,
            pages: { 1: { size }, 2: { size }, 3: { size } },
            texts: [name, "page two"].flatMap((text, index) => [
              { text, prov: [{ page_no: index + 1, bbox }] },
              { text: "Footer", label: "page_footer", prov: [{ page_no: index + 1, bbox }] },
            ]),
            tables: [{
              prov: [{ page_no: 2, bbox }],
              data: { table_cells: [{
                text: ${JSON.stringify(drawingDetails)},
                bbox: { ...bbox, t: 700, b: 670 },
              }] },
            }],
          },
          md_content: "# " + name + md_page_break_placeholder + "| " + ${JSON.stringify(drawingDetails.replace("&", "&amp;"))} + " |",
        },
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
    const project = await deployment.connectProjectAs("admin");
    const { tableSchema } = project;
    let { db, methods } = project;
    /* Job display defaults survive merging plugin jobs and custom table options. */
    expect(
      tableSchema?.find((table) => table.name === "app_jobs"),
    ).toMatchObject({
      label: "Background jobs",
      sort: [{ key: "created_at", asc: false }],
      referenceDisplay: { columns: [{ name: "status" }] },
      card: {
        headerColumn: "job_name",
        subHeaderColumn: "status",
        summaryFields: [
          "progress_numeric",
          "attempts",
          "created_at",
          "duration",
          "error",
          "output",
          "progress_message",
        ],
        layoutSections: [
          {
            items: expect.arrayContaining([
              "id",
              "params",
              "started_at",
              "finished_at",
            ]),
          },
        ],
      },
      defaultColumns: expect.arrayContaining([
        "job_name",
        "status",
        "duration",
        "error",
        "output",
      ]),
      columnConfigs: {
        created_at: {
          label: "Queued",
          format: {
            type: "Age",
            params: { variant: "short", showAgo: true },
          },
        },
        started_at: {
          label: "Started",
          format: {
            type: "Age",
            params: { variant: "short", showAgo: true },
          },
        },
        finished_at: {
          label: "Finished",
          format: {
            type: "Age",
            params: { variant: "short", showAgo: true },
          },
        },
        duration: {
          label: "Duration",
          format: {
            type: "Stopwatch",
            params: { startColumn: "started_at", endColumn: "finished_at" },
          },
          computedConfig: {
            column: "finished_at",
            udt_name: "interval",
            funcDef: { key: "$duration" },
            args: { $duration: { otherColumn: "started_at" } },
          },
        },
        attempts: { label: "Attempts", width: 100 },
        error: {
          label: "Error",
          format: { type: "JSON Summary", params: { path: ["message"] } },
        },
        output: {
          format: { type: "JSON Summary", params: { path: [] } },
        },
        status: {
          label: "State",
          style: {
            type: "Conditional",
            conditions: [
              "pending",
              "running",
              "succeeded",
              "failed",
              "cancelled",
            ].map((condition) =>
              expect.objectContaining({
                operator: "=",
                condition,
                chipColor: expect.stringMatching(/\S/),
                textColor: expect.stringMatching(/\S/),
              }),
            ),
          },
        },
      },
    });
    expect(
      tableSchema?.find((table) => table.name === "app_jobs")?.defaultColumns,
    ).not.toContain("finished_at");
    expect(
      tableSchema
        ?.find((table) => table.name === "files")
        ?.columns.find((column) => column.name === "text_extraction_job_id")
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
    expect(blocked.text_extraction_job_id).toEqual(expect.any(String));
    expect(
      await db.file_job_links!.findOne!({
        job_id: blocked.text_extraction_job_id,
      }),
    ).toMatchObject({
      file_id: blocked.id,
    });
    expect(
      await db.app_jobs!.findOne!({ id: blocked.text_extraction_job_id }),
    ).toMatchObject({
      job_name: "extractFileText",
      target_row_pkey: { id: blocked.id },
    });
    await expect
      .poll(() => db.extraction_calls!.count!({ name: "blocked" }))
      .toBe(1);
    /* A long queue wait must not inflate the running attempt's stopwatch. */
    await project.sql!(
      "UPDATE app_jobs SET created_at = started_at - interval '48 minutes' WHERE id = $1",
      [blocked.text_extraction_job_id],
    );
    /* Default job actions stay available on cards with explicit information levels. */
    await page.clock.install();
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await openTable(page, "files", true);
    const state = await deployment.connectStateAs("admin");
    try {
      const fileWindow = await state.db.windows!.findOne({
        table_name: "files",
      });
      assert.ok(fileWindow);
      await state.db.windows!.update(
        { id: fileWindow.id },
        { options: { ...fileWindow.options, viewAs: { type: "card" } } },
      );
    } finally {
      state.disconnect();
    }
    const fileCards = page
      .locator('[data-table-name="files"]')
      .getByTestId("CardView.row");
    const extractingButton = fileCards
      .filter({ hasText: "blocked.pdf" })
      .getByRole("button", { name: "extractFileText", exact: true });
    await expect(extractingButton).toBeVisible();
    await extractingButton.click();
    const jobDetails = page.getByRole("region", { name: "Job details" });
    const jobSummaryCard = jobDetails.locator(".SmartCard");
    await expect(jobSummaryCard).toBeVisible();
    await expect(jobSummaryCard).not.toHaveCSS("border-top-left-radius", "0px");
    await expect(jobSummaryCard.locator(".SmartCardHeader")).toContainText(
      "extractFileText",
    );
    await expect(
      jobSummaryCard.getByText("running", { exact: true }).locator(".."),
    ).toHaveCSS("border-radius", "12px");
    await expect(
      jobSummaryCard.getByText("Queued", { exact: true }),
    ).toBeVisible();
    await expect(
      jobSummaryCard.locator(".SmartCardCol").filter({
        has: page.getByText("Queued", { exact: true }),
      }),
    ).toContainText("48min");
    await expect(
      jobSummaryCard.getByText("Started", { exact: true }),
    ).toHaveCount(0);
    await expect(
      jobSummaryCard.getByText("Duration", { exact: true }),
    ).toBeVisible();
    const runningStopwatch = jobSummaryCard.locator(".Stopwatch");
    await expect(runningStopwatch).toBeVisible();
    await expect(runningStopwatch).not.toContainText("48m");
    const runningDuration = await runningStopwatch.innerText();
    await page.clock.fastForward(2_000);
    await expect(runningStopwatch).not.toHaveText(runningDuration);
    await expect(
      jobDetails.getByRole("button", { name: "View JSON", exact: true }),
    ).toHaveCount(0);
    await page.getByTestId("Popup.close").last().click();
    const successfulFile = await upload("success");
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
    expect(
      await db.app_jobs!.findOne!({
        id: successfulFile.text_extraction_job_id,
      }),
    ).toMatchObject({ status: "pending", started_at: null });
    await upload("superseded", blocked.id);
    const replacement = await upload("replacement", blocked.id);
    expect(replacement.text_extraction_job_id).not.toBe(
      blocked.text_extraction_job_id,
    );
    expect(
      await db.file_job_links!.findOne!({
        job_id: replacement.text_extraction_job_id,
      }),
    ).toMatchObject({
      file_id: blocked.id,
    });
    await db.job_checks!.update!({ id: 1 }, { released: true });
    await expect
      .poll(
        async () =>
          (
            await db.app_jobs!.findOne!({
              id: successfulFile.text_extraction_job_id,
            })
          )?.status,
        { timeout: 20_000 },
      )
      .toBe("succeeded");
    await expect
      .poll(
        async () =>
          (await db.app_jobs!.findOne!({ id: fail.text_extraction_job_id }))
            ?.status,
        { timeout: 20_000 },
      )
      .toBe("failed");
    await expect(
      fileCards.filter({ hasText: "success.pdf" }).getByRole("button", {
        name: "extractFileText",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      fileCards
        .filter({ hasText: "fail.pdf" })
        .getByRole("button", { name: "extractFileText", exact: true }),
    ).toBeVisible();
    expect(await db.extraction_calls!.count!({ name: "success" })).toBe(1);
    expect(
      await db.app_jobs!.findOne!({
        id: successfulFile.text_extraction_job_id,
      }),
    ).toMatchObject({
      output: { processing_time: 0.1, timings: {} },
    });
    await fileCards
      .filter({ hasText: "success.pdf" })
      .getByRole("button", { name: "extractFileText", exact: true })
      .click();
    await expect(
      page
        .getByRole("region", { name: "Job details" })
        .getByText("Duration", { exact: true }),
    ).toBeVisible();
    const finishedStopwatch = page
      .getByRole("region", { name: "Job details" })
      .locator(".Stopwatch");
    await expect(jobDetails.getByText("Finished", { exact: true })).toHaveCount(
      0,
    );
    await expect(finishedStopwatch).toBeVisible();
    const finishedDuration = await finishedStopwatch.innerText();
    await page.clock.fastForward(5_000);
    await expect(finishedStopwatch).toHaveText(finishedDuration);
    await page
      .getByRole("region", { name: "Job details" })
      .getByRole("button", { name: "View JSON", exact: true })
      .click();
    /* Job output JSON must have enough space to read its contents. */
    const outputEditor = page.locator(".monaco-editor").last();
    await expect(outputEditor).toContainText("processing_time");
    const outputEditorBounds = await outputEditor.boundingBox();
    assert.ok(outputEditorBounds);
    expect(outputEditorBounds.width).toBeGreaterThan(500);
    await page.getByTestId("Popup.close").last().click();
    await page.getByTestId("Popup.close").last().click();
    expect(await db.extraction_calls!.count!({ name: "fail" })).toBe(1);
    const extractedFile = await db.files!.findOne!({ id: successfulFile.id });
    expect(extractedFile).toMatchObject({
      text_content: ["success", secondPageText, ""],
      docling_metadata: { name: "success" },
    });
    assert.ok(extractedFile);
    /* Anchors copied from extracted pages resolve across table cells without Markdown escaping. */
    const selections = [1, 2].map((page) => ({
      page,
      startText: extractedFile.text_content[page - 1],
      endText: extractedFile.text_content[page - 1],
    }));
    const annotation = await db.file_annotations!.insert!(
      { file_id: successfulFile.id, text_selections: selections },
      { returning: "*" },
    );
    expect(annotation).toMatchObject({
      page: 1,
      end_page: 2,
      text: `success\n${secondPageText}`,
      text_selections: [
        {
          page: 1,
          startText: "success",
          endText: "success",
          bounds: [{ x: 40, y: 40, width: 180, height: 30 }],
        },
        {
          page: 2,
          startText: "page two",
          endText: "page two",
          bounds: [{ x: 40, y: 40, width: 180, height: 30 }],
        },
        {
          page: 2,
          startText: drawingDetails,
          endText: drawingDetails,
          bounds: [{ x: 40, y: 100, width: 180, height: 30 }],
        },
      ],
    });
    for (const [field, quote] of [
      ["startText", "missing start"],
      ["endText", drawingDetails.replace("&", "&amp;")],
    ] as const) {
      await expect(
        db.file_annotations!.insert!({
          file_id: successfulFile.id,
          text_selections: selections.map((selection) =>
            selection.page === 2 ? { ...selection, [field]: quote } : selection,
          ),
        }),
      ).rejects.toMatchObject({
        message: `Annotation on page 2: text_selections[1].${field} ${JSON.stringify(quote)}: Annotation text was not found`,
      });
    }
    await expect
      .poll(() =>
        db.app_jobs!.count!({
          job_name: "extractFileText",
          status: "failed",
          attempts: 1,
          max_attempts: 1,
        }),
      )
      .toBe(1);
    await expect
      .poll(
        async () =>
          (await db.files!.findOne!({ id: blocked.id }))?.text_content,
      )
      .toEqual(["replacement", secondPageText, ""]);
    expect(await db.extraction_calls!.count!({ name: "superseded" })).toBe(0);
    expect(
      await db.file_hook_calls!.count!({
        text_content: ["blocked", secondPageText, ""],
      }),
    ).toBe(0);
    for (const phase of ["afterEach", "afterAll", "afterCommit"]) {
      await expect
        .poll(() =>
          db.file_hook_calls!.count!({ file_id: successfulFile.id, phase }),
        )
        .toBe(2);
    }
    // Metadata/result writes do not enqueue another extraction; new bytes do.
    await db.files!.update!(
      { id: successfulFile.id },
      { docling_metadata: { note: "metadata only" } },
    );
    expect(await db.app_jobs!.count!({ job_name: "extractFileText" })).toBe(5);
    expect(await db.file_job_links!.count!({})).toBe(5);
    expect(
      await db.file_hook_calls!.count!({ file_id: successfulFile.id }),
    ).toBe(6);
    await db.files!.update!(
      { id: successfulFile.id },
      { text_content: ["success", secondPageText, ""] },
    );
    expect(
      await db.file_hook_calls!.count!({ file_id: successfulFile.id }),
    ).toBe(6);
    await db.files!.update!({ id: successfulFile.id }, { text_content: null });
    expect(
      await db.file_hook_calls!.count!({ file_id: successfulFile.id }),
    ).toBe(9);

    writeFileSync(
      configFile,
      source +
        `
module.exports.jobs.definitions.check.run = async ({ row, dbo }) => {
  await dbo.job_checks.update({ id: row.id }, { result: 2 });
};`,
    );
    const { project: reloaded } = await deployment.syncSchema();
    db = reloaded.db;
    methods = reloaded.methods;
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

    await page.reload();

    /* A completed job can rerun without a file-status flag. */
    const rerun = (await methods!.rerunFileTextExtraction!({
      row: { id: replacement.id },
    })) as { jobId: string };
    expect(rerun.jobId).not.toBe(replacement.text_extraction_job_id);
    await expect
      .poll(
        async () => (await db.app_jobs!.findOne!({ id: rerun.jobId }))?.status,
      )
      .toBe("succeeded");
    expect(await db.extraction_calls!.count!({ name: "replacement" })).toBe(2);

    /* Cancelling a running extraction stops the card spinner and leaves results empty. */
    await db.job_checks!.update!({ id: 1 }, { released: false });
    const cancelled = await upload("cancelled");
    await expect
      .poll(() => db.extraction_calls!.count!({ name: "cancelled" }))
      .toBe(1);
    await methods!.cancelFileTextExtraction!({
      row: { id: cancelled.id },
    });
    await expect
      .poll(
        async () =>
          (
            await db.app_jobs!.findOne!({
              id: cancelled.text_extraction_job_id,
            })
          )?.status,
      )
      .toBe("cancelled");
    const cancelledCard = fileCards.filter({ hasText: "cancelled.pdf" });
    await expect(
      cancelledCard.getByRole("button", {
        name: "extractFileText",
        exact: true,
      }),
    ).toBeVisible();
    expect(await db.files!.findOne!({ id: cancelled.id })).toMatchObject({
      text_content: null,
    });
    expect(
      await db.app_jobs!.findOne!({ id: cancelled.text_extraction_job_id }),
    ).toMatchObject({
      output: null,
    });
    await db.job_checks!.update!({ id: 1 }, { released: true });
    const retried = (await methods!.extractFileText!({
      row: { id: cancelled.id },
    })) as { jobId: string };
    await expect
      .poll(
        async () =>
          (await db.app_jobs!.findOne!({ id: retried.jobId }))?.status,
      )
      .toBe("succeeded");
    await expect(
      cancelledCard.getByRole("button", {
        name: "extractFileText",
        exact: true,
      }),
    ).toBeVisible();

    /* Unsupported replacements clear the job link and extraction results. */
    const unsupportedReplacement = (
      await db.files!.update!(
        { id: cancelled.id },
        {
          data: Buffer.from([0, 1, 2, 3]),
          original_name: "replacement.bin",
        },
        { returning: "*" },
      )
    )?.[0];
    expect(unsupportedReplacement).toMatchObject({
      text_extraction_job_id: null,
      text_content: null,
      docling_metadata: null,
    });

    /* Non-PDF documents keep their filenames and use Markdown when Docling has no pages. */
    for (const extension of [
      "TXT",
      "md",
      "html",
      "csv",
      "docx",
      "xlsx",
      "pptx",
      "odt",
      "adoc",
      "tex",
      "xml",
      "json",
    ]) {
      const filename = `document.${extension}`;
      const document = await reloaded.db.files!.insert!(
        { data: Buffer.from(filename), original_name: filename },
        { returning: "*" },
      );
      expect(document.text_extraction_job_id).toEqual(expect.any(String));
      await expect
        .poll(
          async () =>
            (
              await reloaded.db.app_jobs!.findOne!({
                id: document.text_extraction_job_id,
              })
            )?.status,
        )
        .toBe("succeeded");
      expect(
        await reloaded.db.extraction_calls!.findOne!({ name: filename }),
      ).toMatchObject({ filename });
      expect(
        (await reloaded.db.files!.findOne!({ id: document.id }))?.text_content,
      ).toEqual([
        `# ${filename}`,
        `| ${drawingDetails.replace("&", "&amp;")} |`,
      ]);
      const annotation = await reloaded.db.file_annotations!.insert!(
        {
          file_id: document.id,
          page: 1,
          start_text: filename,
          end_text: filename,
        },
        { returning: "*" },
      );
      expect(annotation.text).toBe(filename);
    }
    const unsupportedFile = await reloaded.db.files!.insert!(
      { data: Buffer.from([0, 1, 2, 3]), original_name: "source.bin" },
      { returning: "*" },
    );
    expect(unsupportedFile.extraction_status).toBeUndefined();
    expect(unsupportedFile.text_extraction_metadata).toBeUndefined();
    expect(unsupportedFile.text_extraction_job_id).toBeNull();
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
      columns?.find((column) => column.name === "text_extraction_job_id")
        ?.references,
    ).toContainEqual(
      expect.objectContaining({ ftable: "prostgles_jobs", fcols: ["id"] }),
    );
    for (const name of ["text_content", "docling_metadata"]) {
      assert.ok(columns?.some((column) => column.name === name));
    }
    expect(
      columns?.some((column) => column.name === "text_extraction_metadata"),
    ).toBe(false);
    expect(
      columns?.find((column) => column.name === "text_extraction_job_id"),
    ).toMatchObject({
      udt_name: "uuid",
    });
    expect(
      columns?.find((column) => column.name === "text_content"),
    ).toMatchObject({
      udt_name: "_text",
    });
    /* A non-document upload must not invoke the document conversion service. */
    const file = await db.files!.insert!(
      { data: Buffer.from([0, 1, 2, 3]), original_name: "source.bin" },
      { returning: "*" },
    );
    assert.equal(file.extraction_status, undefined);

    // A cold Docker build can outlast the extraction timeout.
    await test.step("Start Docling", async () => {
      const state = await deployment!.connectStateAs("admin");
      await state.methods!.toggleService!({
        serviceName: "documents",
        enable: true,
      });
    });

    /* Text-based documents must complete extraction through the real Docling service. */
    for (const [filename, content] of [
      ["source.txt", "Plain text decision notice"],
      ["source.md", "# Markdown decision notice"],
      ["source.html", "<html><body><p>HTML decision notice</p></body></html>"],
      ["source.csv", "number,condition\n1,CSV decision notice"],
    ] as const) {
      const document = await db.files!.insert!(
        { data: Buffer.from(content), original_name: filename },
        { returning: "*" },
      );
      await expect
        .poll(
          async () =>
            (
              await db.prostgles_jobs!.findOne!({
                id: document.text_extraction_job_id,
              })
            )?.status,
          { timeout: 120_000 },
        )
        .toBe("succeeded");
      expect(
        (await db.files!.findOne!({ id: document.id }))?.text_content?.join(
          "\n",
        ),
      ).toContain("decision notice");
    }

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
          (
            await db.prostgles_jobs!.findOne!({
              id: pdf.text_extraction_job_id,
            })
          )?.status,
        { timeout: 120_000 },
      )
      .toBe("succeeded");

    const extractionJob = await db.prostgles_jobs!.findOne!({
      id: pdf.text_extraction_job_id,
    });
    assert.ok(extractionJob?.output);
    expect(extractionJob.output.processing_time).toEqual(expect.any(Number));
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
    const { timings } = extractionJob.output;
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

const createAnnotationPdf = (
  firstPageText = "Beginning phrase",
  extraPages = 0,
) => {
  const pageTexts = [
    firstPageText,
    "Middle page",
    "Ending phrase",
    ...Array.from(
      { length: extraPages },
      (_, index) => `Extra page ${index + 4}`,
    ),
  ];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageTexts.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pageTexts.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const [i, text] of pageTexts.entries()) {
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
