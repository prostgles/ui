import {
  annotationsTableColumns,
  fileTableExtractionColumns,
} from "@common/managedTableSchema";
import { getFileServePath } from "@common/utils";
import type { ParseTableConfigArgs } from "@src/Plugins/parsePlugins";
import type { PluginDefinition } from "@src/Plugins/Plugins";
import type { ProstglesContext, SchemaConfigDatabase } from "@src/schemaConfig";
import type { TableConfig, TableHooks } from "prostgles-server";
import { getLocalStorageClient } from "prostgles-server";
import type { FileTableConfig } from "prostgles-server/dist/ProstglesTypes";
import type { StorageClient } from "prostgles-server/dist/StorageClient/StorageClientTypes";
import { asName, omitKeys } from "prostgles-types";
import { getCloudClient } from "../cloudClients/cloudClients";
import { getAnnotationsTableHook } from "../FileStorage/getAnnotationsTableHook";
import { getFilesTableTextExtractionHook } from "../FileStorage/getFilesTableHook";
import { getFilesTableJobs } from "../FileStorage/getFilesTableJobs";

type FileTableConfigWithReferencedTables = NonNullable<
  SchemaConfigDatabase["file_table_config"]
> &
  Pick<FileTableConfig, "referencedTables">;

export const getFilesPlugin = async ({
  con,
  conMgr,
  app,
  dbs,
  type,
  newTableConfig,
  databaseConfig,
  jobsTableName,
}: ParseTableConfigArgs & { jobsTableName: string }): Promise<
  PluginDefinition | undefined
> => {
  const connectionId = con.id;
  const fileTableConfig: FileTableConfigWithReferencedTables | null =
    type === "saved" ? databaseConfig.file_table_config : newTableConfig;

  if (!fileTableConfig?.fileTable) return;

  const storageClient: StorageClient | undefined = await (async () => {
    if (fileTableConfig.storageType.type === "local") {
      return getLocalStorageClient({
        /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
        localFolderPath: conMgr.getFileFolderPath(connectionId),
      });
    } else if (fileTableConfig.storageType.credential_id) {
      const s3Credentials = await dbs.credentials.findOne({
        id: fileTableConfig.storageType.credential_id,
      });
      if (s3Credentials) {
        return getCloudClient({
          accessKeyId: s3Credentials.key_id,
          secretAccessKey: s3Credentials.key_secret,
          Bucket: s3Credentials.bucket!,
          region: s3Credentials.region || "auto",
          endpoint: s3Credentials.endpoint_url,
        });
      }
    } else {
      console.error(
        "Could not find cloud credentials for fileTable config. File storage will not be set up ",
      );
    }
  })();

  if (!storageClient) return;

  const fileTable = {
    expressApp: app,
    tableName: fileTableConfig.fileTable,
    fileServePath: getFileServePath({ connectionId, fileId: undefined }),
    storageClient,
    referencedTables: fileTableConfig.referencedTables,
    versioning: fileTableConfig.versioning,
  } satisfies FileTableConfig;

  const { extractText, extractTextOptions, annotationsTable } = fileTableConfig;

  const tableConfig: TableConfig = {
    [fileTable.tableName]: {
      ...fileTableExtractionColumns,
      columns:
        extractText ?
          fileTableExtractionColumns.columns
        : omitKeys(fileTableExtractionColumns.columns, ["extraction_job_id"]),
      constraints:
        extractText ?
          {
            extraction_job: `FOREIGN KEY (extraction_job_id) REFERENCES ${asName(jobsTableName)}(id)`,
          }
        : undefined,
    },
  };

  if (annotationsTable) {
    tableConfig[annotationsTable] = {
      columns: annotationsTableColumns,
      constraints: {
        annotation_selection_pages: `CHECK (
          jsonb_array_length(text_selections) > 0
          AND page IS NOT DISTINCT FROM (text_selections->0->>'page')::integer
          AND end_page IS NOT DISTINCT FROM (text_selections->-1->>'page')::integer
        )`,
        references_file_table:
          "FOREIGN KEY (file_id) REFERENCES " +
          fileTableConfig.fileTable +
          "(id) ON DELETE CASCADE",
      },
    };
  }

  /**
   * TODO: move getFilesTableTextExtractionHook logic into getFilesTableJobs when
   */
  const tableHooks: TableHooks<void, ProstglesContext> | undefined = {
    ...(extractText ?
      getFilesTableTextExtractionHook(fileTable.tableName, extractTextOptions)
    : undefined),
    ...(annotationsTable ?
      (getAnnotationsTableHook(
        annotationsTable,
        fileTable.tableName,
      ) as TableHooks<void, ProstglesContext>)
    : undefined),
  };

  return {
    fileTable,
    tableConfig,
    tableHooks,
    jobDefinitions:
      extractText ?
        {
          extractFileText: getFilesTableJobs(fileTable),
        }
      : undefined,
  };
};
