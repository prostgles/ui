import { mdiMagnify } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import type { ExtraProps } from "../../App";
import Btn from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu";
import SmartTable from "../SmartTable";

type UserStatsProps = Pick<
  ExtraProps,
  "dbs" | "dbsTables" | "dbsMethods" | "theme"
>;

export const UserStats = ({
  dbs,
  dbsTables,
  dbsMethods,
  theme,
}: UserStatsProps) => {
  const existingUserStats = usePromise(
    () =>
      dbs.users.find(
        {},
        {
          select: { type: 1, count: { $countAll: [] } },
          orderBy: { count: -1 } as any,
        },
      ) as Promise<
        {
          type: string;
          count: number;
        }[]
      >,
  );

  const userCount = existingUserStats?.reduce((a, v) => a + +v.count, 0) ?? 0;

  return (
    <PopupMenu
      className="UserStats"
      button={
        <Btn
          title={`Search ${userCount} users`}
          iconPath={mdiMagnify}
          color="action"
          size="small"
        />
      }
      onClickClose={false}
      positioning="center"
      clickCatchStyle={{ opacity: 0.5 }}
      title={"All users"}
      showFullscreenToggle={{}}
      footerButtons={[
        {
          label: "Close",
          onClickClose: true,
        },
      ]}
      render={() => (
        <div
          className="UserStats flex-col gap-1 pb -1 o-auto"
          style={{ minWidth: "250px" }}
        >
          <SmartTable
            theme={theme}
            key={"selectedRuleId"}
            db={dbs as any}
            methods={dbsMethods}
            filter={[
              { fieldName: "type", type: "$in", value: [], disabled: true },
            ]}
            tableName="users"
            tables={dbsTables}
            allowEdit={true}
            showInsert={true}
          />
        </div>
      )}
    />
  );
};
