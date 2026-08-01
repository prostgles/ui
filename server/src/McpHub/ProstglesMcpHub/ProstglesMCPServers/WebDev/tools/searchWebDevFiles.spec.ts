import { strict } from "assert";
import { test } from "node:test";
import { join } from "path";
import { searchWebDevFiles } from "./searchWebDevFiles";
const entryDir = process.cwd();
const web_app_directory = join(entryDir, "../");

void test("searchWebDevFiles: basic search", async () => {
  const { result, cwd } = await searchWebDevFiles({
    contentQuery: "usePrgl",
    web_app_directory,
    folder: "client",
    extensions: ["tsx"],
  });

  strict.ok(result.length > 0, "Should find at least one result");
  const firstResult = result[0]!;
  strict.equal(
    firstResult.filePath,
    "src/useAppState/PrglCoreContextProvider.tsx",
    // "First result should be TestComponent.tsx",
  );
  strict.ok(
    firstResult.matchedContent.includes("const usePrglCore = () => {"),
    "Matched content should include 'Test Component'",
  );
});

void test("searchWebDevFiles: file name query", async () => {
  const { result } = await searchWebDevFiles({
    contentQuery: "usePrgl",
    fileNameQuery: "PrglCoreContextProvider",
    web_app_directory,
    folder: "client",
    extensions: ["tsx"],
  });

  strict.ok(result.length === 1, "Should find exactly one result");
  const firstResult = result[0]!;
  strict.ok(
    firstResult.filePath === "src/useAppState/PrglCoreContextProvider.tsx",
    "First result should be PrglCoreContextProvider.tsx",
  );
});

void test("searchWebDevFiles: max files per folder", async () => {
  const { result } = await searchWebDevFiles({
    contentQuery: "import",
    web_app_directory,
    folder: "client",
    extensions: ["ts", "tsx", "js", "jsx"],
    maxFilesPerFolder: 2,
  });

  const truncatedResults = result.filter(
    (res) => res.filePath === "[...truncated]",
  );
  strict.ok(
    truncatedResults.length > 0,
    "Should have truncated results due to max files per folder",
  );
});

void test("searchWebDevFiles: max line length", async () => {
  const { result } = await searchWebDevFiles({
    contentQuery: "import",
    web_app_directory,
    folder: "client",
    extensions: ["ts", "tsx", "js", "jsx"],
    maxLineLength: 100,
  });

  strict.ok(result.length > 0, "Should find at least one result");
  const firstResult = result[0]!;
  const lines = firstResult.matchedContent.split("\n");
  for (const line of lines) {
    strict.ok(
      line.length <= 100,
      `Line length should be less than or equal to 100 characters. Found line with length ${line.length}`,
    );
  }
});
