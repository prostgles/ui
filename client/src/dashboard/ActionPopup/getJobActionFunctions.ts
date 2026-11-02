import {
  getActionFunctions,
  type DBSchemaTable,
  type JobControlBinding,
  type ServerFunctionHandler,
} from "prostgles-types";

export const getRowActionFunctions = (
  methods: ServerFunctionHandler,
  table: DBSchemaTable,
) => {
  const allowedActions = Object.keys(methods);
  return getActionFunctions(methods, table).filter(({ methodName }) => {
    const job = methods[methodName]?.jobControl;
    return (
      !job ||
      getJobActionFunctions(methods, table, job, allowedActions)[0]
        ?.methodName === methodName
    );
  });
};

export const getJobActionFunctions = (
  methods: ServerFunctionHandler,
  table: DBSchemaTable,
  job: JobControlBinding,
  allowedActions: string[] | undefined,
) =>
  getActionFunctions(methods, table)
    .filter(({ methodName }) => {
      const binding = methods[methodName]?.jobControl;
      return (
        allowedActions?.includes(methodName) &&
        binding?.jobName === job.jobName &&
        binding.tableName === job.tableName &&
        binding.columnName === job.columnName
      );
    })
    .sort(
      (first, second) =>
        Number(
          methods[second.methodName]?.jobControl?.operation === "startOrRetry",
        ) -
        Number(
          methods[first.methodName]?.jobControl?.operation === "startOrRetry",
        ),
    );
