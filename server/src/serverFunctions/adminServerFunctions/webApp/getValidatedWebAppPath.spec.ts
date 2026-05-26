import { strict } from "assert";
import { test } from "node:test";
import { getValidatedWebAppPath } from "./getValidatedWebAppPath";

void test("getValidatedWebAppPath: valid path", () => {
  const { filePath, dirPath } = getValidatedWebAppPath({
    web_app_directory: "/var/www/myapp",
    relativePath: "assets/image.png",
  });
  strict.equal(filePath, "/var/www/myapp/assets/image.png");
  strict.equal(dirPath, "/var/www/myapp/assets");
});

void test("getValidatedWebAppPath: escape attempt", () => {
  try {
    getValidatedWebAppPath({
      web_app_directory: "/var/www/myapp",
      relativePath: "../etc/passwd",
    });
    strict.fail("Expected error for escaping path");
  } catch (e) {
    strict.equal(
      (e as Error).message,
      "Invalid file path: ../etc/passwd. Must be within web app directory: /var/www/myapp",
    );
  }
});
void test("getValidatedWebAppPath: escape attempt 2", () => {
  try {
    getValidatedWebAppPath({
      web_app_directory: "/var/www/myapp",
      relativePath: "./../../outside.txt",
    });
    strict.fail("Expected error for escaping path");
  } catch (e) {
    strict.equal(
      (e as Error).message,
      "Invalid file path: ./../../outside.txt. Must be within web app directory: /var/www/myapp",
    );
  }
});

void test("getValidatedWebAppPath: nested valid path", () => {
  const { filePath, dirPath } = getValidatedWebAppPath({
    web_app_directory: "/var/www/myapp",
    relativePath: "src/components/Button.tsx",
  });
  strict.equal(filePath, "/var/www/myapp/src/components/Button.tsx");
  strict.equal(dirPath, "/var/www/myapp/src/components");
});

void test("getValidatedWebAppPath: root path", () => {
  const { filePath, dirPath } = getValidatedWebAppPath({
    web_app_directory: "/var/www/myapp",
    relativePath: "",
  });
  strict.equal(filePath, "/var/www/myapp");
  strict.equal(dirPath, "/var/www");
});

void test("getValidatedWebAppPath: root path slash", () => {
  const { filePath, dirPath } = getValidatedWebAppPath({
    web_app_directory: "/var/www/myapp",
    relativePath: "/",
  });
  strict.equal(filePath, "/var/www/myapp");
  strict.equal(dirPath, "/var/www");
});

void test("getValidatedWebAppPath: root path dot", () => {
  const { filePath, dirPath } = getValidatedWebAppPath({
    web_app_directory: "/var/www/myapp",
    relativePath: ".",
  });
  strict.equal(filePath, "/var/www/myapp");
  strict.equal(dirPath, "/var/www");
});
