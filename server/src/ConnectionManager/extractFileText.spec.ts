import assert from "node:assert/strict";
import { test } from "node:test";
import { getFileTextExtractionOptions } from "./extractFileText";

void test("file text extraction uses configured Docling options", () => {
  const options = getFileTextExtractionOptions({
    do_ocr: false,
    table_mode: "fast",
  });

  assert.equal(options.do_ocr, false);
  assert.equal(options.table_mode, "fast");
  assert.deepEqual(options.to_formats, ["json", "md"]);
});
