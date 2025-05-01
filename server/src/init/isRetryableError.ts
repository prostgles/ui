import type { AnyObject } from "prostgles-types";
import type { ProstglesInitStateWithDBS } from "./startProstgles";

export const isRetryableError = (
  errorState: Extract<ProstglesInitStateWithDBS, { state: "error" }>,
): boolean => {
  // Explicitly non-retryable Prostgles init errors
  if (errorState.errorType === "init") {
    console.warn(
      "Non-retryable Prostgles Initialization Error detected.",
      errorState.error,
    );
    return false;
  }

  // Explicitly non-retryable connection errors (customise based on common pg error codes)
  if (errorState.error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const code = (errorState.error as AnyObject).code;
    // Examples:
    if (code === "3D000") {
      // Database does not exist
      console.warn(
        `Non-retryable DB connection error: Database does not exist (Code: ${code})`,
      );
      return false;
    }
    if (code === "28P01") {
      // Invalid password / Auth failed
      console.warn(
        `Non-retryable DB connection error: Authentication failed (Code: ${code})`,
      );
      return false;
    }
    // Add other known fatal error codes here (e.g., invalid config, syntax errors)
    // If it's not explicitly non-retryable, assume it might be transient
    console.warn(
      "Potentially retryable DB connection error encountered:",
      errorState.error,
    );
    return true; // Assume other connection errors might be temporary
  }

  // Unexpected errors during startProstgles execution (outside the expected return structure)
  console.error(
    "Unexpected error during startProstgles execution, considering non-retryable:",
    errorState,
  );
  return false;
};
