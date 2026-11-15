import type { DBS } from "@src/index";
import type { ExecutionContext } from "prostgles-server";
import { getConfiguredWorkflow } from "./getConfiguredWorkflow";
import { startAgenticWorkflow } from "./startAgenticWorkflow";

export const getStartAgenticWorkflow = (
  dbs: DBS,
  connectionId: string,
  getExecution: () => ExecutionContext | undefined,
) => {
  /* Share validation for concurrent starts of the same registered source. */
  const loading = new Map<string, ReturnType<typeof getConfiguredWorkflow>>();
  return async (
    name: string,
    input: Record<string, unknown>,
    options: {
      signal?: AbortSignal;
      executionMode?: "series" | "parallel";
      autoApproveAllTools?: boolean;
    } = {},
  ): Promise<{ runId: number }> => {
    const execution = getExecution();
    if (!execution?.user) throw new Error("Workflow execution requires a user");
    options.signal?.throwIfAborted();
    const userId = execution.user.id;
    const pending =
      loading.get(name) ??
      getConfiguredWorkflow(dbs, connectionId, userId, name);
    loading.set(name, pending);
    const workflow = await pending.finally(() => {
      if (loading.get(name) === pending) loading.delete(name);
    });
    const [invocation] = execution.invocations;
    const relatedRecords =
      !invocation ? undefined
      : invocation.type === "function" ?
        invocation.relatedRecords.map(({ tableName, rowPart }) => ({
          tableName,
          row: rowPart,
        }))
      : invocation.rowParts.map((row) => ({
          tableName: invocation.tableName,
          row,
        }));
    const result = await startAgenticWorkflow({
      dbs,
      workflow,
      user: { id: userId },
      connection_id: connectionId,
      userInputValue: input,
      executionMode: options.executionMode ?? "series",
      autoApproveAllTools: options.autoApproveAllTools ?? false,
      signal: options.signal,
      invocationId: invocation?.id,
      relatedRecords,
    });
    if (result.state !== "finished") {
      const errorMessage =
        "error" in result && result.error ? JSON.stringify(result.error)
        : "log" in result ?
          result.log
            .filter(({ type }) => type === "stderr" || type === "error")
            .map(({ text }) => text)
            .join("")
        : "";
      const detail = errorMessage ? `: ${errorMessage}` : "";
      throw new Error(
        `Workflow run ${result.runId} failed: ${result.state}${detail}`,
      );
    }
    return { runId: result.runId };
  };
};
