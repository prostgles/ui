/* Keep this module ambient to replace the package declaration instead of merging overloads. */
declare module "@playwright/test" {
  import type {
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
    TestType,
  } from "playwright/test";

  export * from "playwright/test";

  export const test: TestType<
    Omit<PlaywrightTestArgs & PlaywrightTestOptions, "page"> & {
      page: import("./utils").PageWIds;
    },
    PlaywrightWorkerArgs & PlaywrightWorkerOptions
  >;
  export default test;
}
