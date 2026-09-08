import { annotationsTableColumns } from "@common/managedTableSchema";
import { ROUTES } from "@common/utils";
import { CONVERT_DOCUMENT_DEFAULT_OPTIONS } from "@src/ServiceManager/services/documents/documents.service";
import type e from "express";
import type {
  DBHandlerServer,
  FileTableRow,
  TableConfig,
  TableHooks,
} from "prostgles-server";
import { getLocalStorageClient } from "prostgles-server";
import type { FileTableConfig } from "prostgles-server/dist/ProstglesTypes";
import type { BeforeEachTsTrigger } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";
import type { StorageClient } from "prostgles-server/dist/StorageClient/StorageClientTypes";
import type { DatabaseConfigs, DBS } from "..";
import { getCloudClient } from "../cloudClients/cloudClients";
import type { ConnectionManager } from "./ConnectionManager";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";
import { getSchemaConfig } from "./getSchemaConfig";
import { getServiceManager } from "@src/ServiceManager/getServiceManager";
import type { ProstglesContext } from "@src/schemaConfig";

type ParseTableConfigArgs = {
  dbs: DBS;
  conMgr: ConnectionManager;
  app: e.Express;
  con: ConnectionHotReloadProperties;
  databaseConfig: DatabaseConfigs;
} & (
  | {
      type: "saved";
      newTableConfig?: undefined;
    }
  | {
      type: "new";
      newTableConfig: DatabaseConfigs["file_table_config"];
    }
);

export const parseTableConfig = async ({
  con,
  conMgr,
  app,
  dbs,
  type,
  newTableConfig,
  databaseConfig,
}: ParseTableConfigArgs): Promise<{
  fileTable?: FileTableConfig;
  tableConfig: TableConfig | undefined;
  tableHooks: TableHooks<void, ProstglesContext> | undefined;
}> => {
  const connectionId = con.id;
  let fileTableConfig:
    | (DatabaseConfigs["file_table_config"] &
        Pick<FileTableConfig, "referencedTables">)
    | null = null;
  if (type === "saved") {
    fileTableConfig = databaseConfig.file_table_config;
  } else {
    fileTableConfig = newTableConfig;
  }
  let storageClient: StorageClient | undefined;
  if (fileTableConfig?.storageType.type === "local") {
    storageClient = getLocalStorageClient({
      /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
      localFolderPath: conMgr.getFileFolderPath(connectionId),
    });
  } else if (fileTableConfig?.storageType.credential_id) {
    const s3Credentials = await dbs.credentials.findOne({
      id: fileTableConfig.storageType.credential_id,
    });
    if (s3Credentials) {
      storageClient = getCloudClient({
        accessKeyId: s3Credentials.key_id,
        secretAccessKey: s3Credentials.key_secret,
        Bucket: s3Credentials.bucket!,
        region: s3Credentials.region || "auto",
        endpoint: s3Credentials.endpoint_url,
      });
    }
  } else if (fileTableConfig) {
    console.error(
      "Could not find cloud credentials for fileTable config. File storage will not be set up ",
    );
  }

  const fileTable =
    !fileTableConfig?.fileTable || !storageClient ?
      undefined
    : ({
        expressApp: app,
        tableName: fileTableConfig.fileTable,
        fileServePath: `${ROUTES.STORAGE}/${connectionId}`,
        storageClient,
        referencedTables: fileTableConfig.referencedTables,
      } satisfies FileTableConfig);

  const { tableHooks, tableConfig } =
    getSchemaConfig(databaseConfig.config_sync)?.config ?? {};
  // Preserve extraction for existing annotation configs unless explicitly disabled.
  const extractText =
    fileTableConfig?.extractText ?? !!fileTableConfig?.annotationsTable;
  const fileTableHooksMerged: TableHooks<void, ProstglesContext> | undefined =
    fileTable && extractText ?
      {
        [fileTable.tableName]: {
          beforeEach: [
            {
              commands: { insert: 1, update: 1 },
              validate: async ({ data: fileRow, hookContext }) => {
                const { original_name, content_type } = fileRow;
                const buffer = hookContext?.data as Buffer | undefined;
                const isImageOrPdf =
                  content_type &&
                  ["image/", "application/pdf"].some((prefix) =>
                    content_type.startsWith(prefix),
                  );
                if (!isImageOrPdf || !original_name || !buffer) {
                  return;
                }
                const db =
                  conMgr.getActiveConnectionSilentFail(connectionId)?.prgl.db;

                const documentService = await getServiceManager()
                  .getServiceWithRetries("documents")
                  .catch((err) => {
                    console.error("Failed to get documents service", err);
                    return null;
                  });

                if (!db || !documentService) {
                  return {
                    row: {
                      ...fileRow,
                      extraction_status:
                        !db || !documentService ?
                          {
                            phase: "error",
                            error:
                              !db ?
                                "Internal error: Database handler not found for extraction"
                              : "Internal error: Documents service could not be initialized for extraction. Check service logs for details.",
                          }
                        : {
                            phase: "pending",
                          },
                    },
                  };
                }
                const blobWithType = new Blob([buffer], {
                  type: content_type,
                });
                const doclingResult = await documentService.endpoints[
                  "/v1/convert/file"
                ]({
                  files: [blobWithType],
                  ...CONVERT_DOCUMENT_DEFAULT_OPTIONS,
                  // image_export_mode: "embedded",
                  image_export_mode: "placeholder",
                  to_formats: ["json", "text"],
                })
                  .then((result) => ({ success: true, result }) as const)
                  .catch(
                    (error: unknown) => ({ success: false, error }) as const,
                  );

                return {
                  row: {
                    ...fileRow,
                    extraction_status:
                      doclingResult.success ?
                        {
                          phase: "success",
                        }
                      : {
                          phase: "error",
                          error:
                            doclingResult.error ||
                            "Unknown error during document extraction",
                        },
                    docling_metadata:
                      doclingResult.success ?
                        doclingResult.result.document.json_content
                      : null,
                    text_content:
                      doclingResult.success ?
                        doclingResult.result.document.text_content
                        // doclingResult.result.document.md_content
                      : null,
                  },
                };
              },
            } satisfies BeforeEachTsTrigger<
              FileTableRow & {
                text_content: string | null;
                docling_metadata: any;
                extraction_status: any;
              },
              DBHandlerServer,
              ProstglesContext
            >,
          ],
        },
      }
    : undefined;
  const fileTableConfigMerged: TableConfig | undefined =
    fileTable && (extractText || fileTableConfig?.annotationsTable) ?
      {
        [fileTable.tableName]: {
          columns: {
            text_content: `TEXT`,
            docling_metadata: `JSONB`,
            extraction_status: {
              nullable: true,
              jsonbSchemaType: {
                phase: { enum: ["pending", "success", "error"] },
                error: { type: "unknown", optional: true },
              },
            },
          },
        },
      }
    : undefined;
  if (fileTableConfigMerged && fileTableConfig?.annotationsTable) {
    fileTableConfigMerged[fileTableConfig.annotationsTable] = {
      columns: annotationsTableColumns,
      constraints: {
        references_file_table:
          "FOREIGN KEY (file_id) REFERENCES " +
          fileTableConfig.fileTable +
          "(id) ON DELETE CASCADE",
      },
    };
  }
  const sourceTableConfig = (fileTableConfigMerged || tableConfig) && {
    ...(fileTableConfigMerged || {}),
    ...tableConfig,
  };
  const mergedTableHooks = mergeTableHooks(fileTableHooksMerged, tableHooks);

  return {
    fileTable,
    tableConfig: sourceTableConfig,
    tableHooks: mergedTableHooks,
  };
};

const mergeTableHooks = (
  ...hookSets: (TableHooks<void, ProstglesContext> | undefined)[]
): TableHooks<void, ProstglesContext> | undefined => {
  const result: TableHooks<void, ProstglesContext> = {};
  for (const hooks of hookSets) {
    for (const [tableName, tableHooks] of Object.entries(hooks ?? {})) {
      const existing = result[tableName];
      result[tableName] = {
        ...existing,
        ...tableHooks,
        beforeEach:
          existing?.beforeEach || tableHooks.beforeEach ?
            [...(existing?.beforeEach ?? []), ...(tableHooks.beforeEach ?? [])]
          : undefined,
        afterEach:
          existing?.afterEach || tableHooks.afterEach ?
            [...(existing?.afterEach ?? []), ...(tableHooks.afterEach ?? [])]
          : undefined,
        afterAll:
          existing?.afterAll || tableHooks.afterAll ?
            [...(existing?.afterAll ?? []), ...(tableHooks.afterAll ?? [])]
          : undefined,
      };
    }
  }
  return Object.keys(result).length ? result : undefined;
};
