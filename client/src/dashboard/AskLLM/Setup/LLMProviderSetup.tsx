import type { DBSSchema } from "@common/publishUtils";
import Chip from "@components/Chip";
import { InfoRow } from "@components/InfoRow";
import type { DBHandlerClient } from "prostgles-client";
import React, { useMemo } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import {
  SmartCardList,
  type SmartCardListProps,
} from "../../SmartCardList/SmartCardList";

export const LLMProviderSetup = () => {
  const { dbsSql, dbs, dbsTables, dbsMethodSchema } = usePrglCore();
  const listProps = useMemo(() => {
    return {
      showTopBar: {
        insert: true,
      },
      fieldConfigs: [
        {
          name: "llm_providers" as "name",
          select: { logo_url: 1 },
          label: "",
        },
        {
          name: "provider_id",
          hide: true,
        },
        {
          name: "name",
          label: "",
          render: (name: string | null, row) => name || row.provider_id,
        },
        {
          name: "is_default",
          className: "o-visible",
          renderMode: "full",
          render: (is_default) =>
            is_default ? <Chip color="blue">default</Chip> : " ",
        },
      ],
    } satisfies Pick<
      SmartCardListProps<DBSSchema["llm_credentials"]>,
      "fieldConfigs" | "showTopBar"
    >;
  }, []);

  return (
    <>
      <SmartCardList
        className="mb-1 w-fit min-w-0"
        sql={dbsSql}
        db={dbs as DBHandlerClient}
        tableName={"llm_credentials"}
        methods={dbsMethodSchema}
        tables={dbsTables}
        noDataComponent={
          <InfoRow color="info" variant="filled">
            No LLM providers
          </InfoRow>
        }
        excludeNulls={true}
        realtime={true}
        {...listProps}
      />
    </>
  );
};
