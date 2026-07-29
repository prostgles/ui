import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { pageReload } from "@components/Loader/Loading";
import React from "react";
import type { PrglCore } from "../../App";
import { CreateFileColumn } from "./CreateFileColumn";
import { FileColumnConfigControls } from "./FileColumnConfigControls";
import type { useFileTableConfigControls } from "./useFileTableConfigControls";

type FileStorageReferencedTablesConfigProps = Pick<PrglCore, "tables"> &
  Pick<
    ReturnType<typeof useFileTableConfigControls>,
    | "canCreateTables"
    | "canUpdateRefColumns"
    | "setRefsConfig"
    | "updateRefsConfig"
    | "refsConfig"
  > & {
    file_table_config: DBSSchema["database_configs"]["file_table_config"];
  };

export const FileStorageReferencedTablesConfig = ({
  file_table_config,
  tables,
  setRefsConfig,
  refsConfig,
  updateRefsConfig,
  canUpdateRefColumns,
}: FileStorageReferencedTablesConfigProps) => {
  const tc = file_table_config;
  if (!tc?.fileTable) return null;

  return (
    <FlexCol className="f-1 mt-2">
      <h3 className="m-0 p-0">Referenced column limits</h3>
      <div>
        <p className="p-0 m-0">
          The following tables have columns that reference the file table{" "}
          <strong>{tc.fileTable}</strong>
        </p>
        <p className="p-0 m-0">
          Specify allowed file types and sizes as desired. By default any file
          type is allowed{" "}
        </p>
      </div>
      <FileColumnConfigControls
        tables={tables}
        refsConfig={refsConfig}
        onChange={setRefsConfig}
      />
      <CreateFileColumn fileTable={file_table_config?.fileTable} />

      {canUpdateRefColumns && (
        <div className="my-1">
          <Btn
            variant="filled"
            color="action"
            onClickMessage={async (_, setMsg) => {
              setMsg({ loading: 1 });
              try {
                await updateRefsConfig();
                setMsg({ ok: "Updated!" });
                setTimeout(() => {
                  void pageReload(
                    "FileStorageReferencedTablesConfig updateRefsConfig",
                  );
                }, 500);
              } catch (err) {
                setMsg({ err });
              }
            }}
          >
            Update column configurations
          </Btn>
        </div>
      )}
    </FlexCol>
  );
};
