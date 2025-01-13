import React from "react";

import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import { InfoRow } from "../../components/InfoRow";
import Loading from "../../components/Loading";
import { AccessControlRuleEditor } from "./AccessControlRuleEditor";
import { AccessControlRules } from "./ExistingAccessRules";
import type { useAccessControlSearchParams } from "./useAccessControlSearchParams";
import { mdiAccountCog, mdiPlus } from "@mdi/js";
import { UserSyncConfig } from "./UserSyncConfig";

type P = ReturnType<typeof useAccessControlSearchParams> & {
  prgl: Prgl;
  className?: string;
};

export type AccessRule = Required<DBSSchema["access_control"]> & {
  access_control_user_types: {
    ids: string[];
  }[];
  isApplied: boolean | undefined;
  published_methods: Required<DBSSchema["published_methods"]>[];
  access_control_allowed_llm: Omit<
    Required<DBSSchema["access_control_allowed_llm"]>,
    "access_control_id"
  >[];
  access_control_methods: Omit<
    Required<DBSSchema["access_control_methods"]>,
    "access_control_id"
  >[];
};

export type EditedAccessRule = Omit<
  AccessRule,
  "database_id" | "id" | "isApplied"
>;

export type AccessControlAction =
  | {
      type: "create";
      selectedRuleId?: undefined;
    }
  | {
      type: "create-default";
      selectedRuleId?: undefined;
    }
  | {
      type: "edit";
      selectedRuleId: number;
      tableName?: string;
    };

export const AccessControl = (props: P) => {
  const { workspaces, connection, rules, dbsConnection, database_config } =
    useGetAccessRules(props.prgl);
  const { className, prgl, action, setAction } = props;

  if (!(prgl.dbs.access_control_user_types as any)?.subscribe) {
    return (
      <InfoRow className="f-0 h-fit">
        Must be admin to access this section{" "}
      </InfoRow>
    );
  }
  if (!connection || !dbsConnection || !database_config || !rules)
    return <Loading />;

  return (
    <div className={"flex-col f-1 " + className}>
      <div className="f-1 flex-row min-h-0 ">
        {action ?
          <AccessControlRuleEditor
            {...props}
            database_config={database_config}
            action={action}
            connection={connection}
            dbsConnection={dbsConnection}
            onCancel={() => {
              setAction(undefined);
            }}
          />
        : <FlexCol className="f-1 relative">
            <FlexRow>
              <Btn
                variant="filled"
                color="action"
                data-command="config.ac.create"
                onClick={() => {
                  setAction({ type: "create" });
                }}
                iconPath={mdiPlus}
              >
                Create new rule
              </Btn>
              <UserSyncConfig {...props.prgl} />

              <Btn
                iconPath={mdiAccountCog}
                variant="faded"
                asNavLink={true}
                href={"/users"}
              >
                Manage users
              </Btn>
            </FlexRow>

            <AccessControlRules
              workspaces={workspaces ?? []}
              rules={rules}
              prgl={prgl}
              onSelect={(r) => {
                setAction({ type: "edit", selectedRuleId: r.id });
              }}
            />
          </FlexCol>
        }
      </div>
    </div>
  );
};

const useGetAccessRules = (prgl: Prgl) => {
  const { connectionId, dbs } = prgl;
  const { data: appliedRules } = dbs.access_control_connections.useSubscribe({
    connection_id: connectionId,
  });
  const { data: _rules } = dbs.access_control.useSubscribe(
    {
      database_id: prgl.databaseId,
    },
    ACCESS_CONTROL_SELECT,
  );
  const rules = _rules?.map((r) => ({
    ...r,
    isApplied: appliedRules?.some((ar) => ar.access_control_id === r.id),
  }));
  const { data: connection } = dbs.connections.useFindOne({ id: connectionId });
  const { data: dbsConnection } = dbs.connections.useFindOne({
    is_state_db: true,
  });
  const { data: database_config } = dbs.database_configs.useFindOne({
    id: prgl.databaseId,
  });
  const { data: workspaces } = dbs.workspaces.useFind();

  return { workspaces, connection, rules, dbsConnection, database_config };
};

export const ACCESS_CONTROL_SELECT = {
  select: {
    "*": 1,
    access_control_user_types: { ids: { $array_agg: ["user_type"] } },
    published_methods: "*",
    access_control_allowed_llm: "*",
    access_control_methods: "*",
  },
} as const;
