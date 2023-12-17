import { mdiAccount, mdiTable } from "@mdi/js";
import React, { useState } from 'react';
import { ExtraProps } from "../../App";
import Btn from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu";
import { Table } from "../../components/Table/Table";
import { usePromise } from "../ProstglesMethod/hooks";
import { getUnknownColInfo } from "../W_Table/tableUtils/getEditColumn";
import SmartTable from "../SmartTable";

type UserStatsProps = Pick<ExtraProps, "dbs" | "dbsTables" | "dbsMethods" | "theme">;

export const UserStats = ({ dbs, dbsTables, dbsMethods, theme }: UserStatsProps) => {

  const existingUserStats = usePromise(() => 
    dbs.users.find({}, { 
      select: { type: 1, count: { $countAll: [] } },
      orderBy: { count: -1 } as any
    }) as Promise<{
        type: string;
        count: number;
      }[]>
  );

  const [viewAllUsers, setViewAllUsers] = useState(false);


  return <PopupMenu 
    className="UserStats ml-auto"
    button={
      <Btn iconPath={mdiAccount} color="action" size="small" title="Total number of users">
        {existingUserStats?.reduce((a, v) => a + +v.count, 0) ?? 0}
      </Btn>
    }
    onClickClose={false}
    positioning="center"
    clickCatchStyle={{ opacity: .5 }}
    title={viewAllUsers? "All users" : "User type stats"}
    footerButtons={viewAllUsers? undefined : [
      { 
        label: "View/Edit users",
        iconPath: mdiTable,
        color: "action",
        variant: "filled",
        onClick: () => setViewAllUsers(true)
      }
    ]}
    onClose={() => {
      setViewAllUsers(false)
    }}
    render={() => (
      <div className="UserStats flex-col gap-1 pb -1 o-auto" style={{ minWidth: "250px"}}>
        {viewAllUsers? <SmartTable
          theme={theme}
          key={"selectedRuleId"} 
          db={dbs as any} 
          methods={dbsMethods}
          tableName="users" 
          tables={dbsTables} 
          allowEdit={true} 
          showInsert={true}
        />  :
        <Table 
          cols={[
            getUnknownColInfo("type", "User type", "string", false),
            getUnknownColInfo("count", "User count", "string", true)
          ]}
          rows={existingUserStats ?? []}
        />}
      </div>

    )} 
  />
}