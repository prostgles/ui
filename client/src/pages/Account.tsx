import { mdiAccount, mdiApplicationBracesOutline, mdiSecurity } from "@mdi/js";
import { getKeys } from "prostgles-types";
import React, { useState } from 'react';
import { useSearchParams } from "react-router-dom";
import { ExtraProps } from "../App"; 
import Tabs from "../components/Tabs";
import { PasswordlessSetup } from "../dashboard/AccessControl/PasswordlessSetup";
import { APIDetails } from "../dashboard/ConnectionConfig/APIDetails/APIDetails"; 
import { useEffectAsync } from "../dashboard/DashboardMenu/DashboardMenuSettings"; 
import SmartForm from "../dashboard/SmartForm/SmartForm";
import { Connections } from "./Project";
import { Sessions } from "./Sessions";
import { Setup2FA } from "./Setup2FA";

type AccountProps = ExtraProps;
 
export const Account = (props: AccountProps) => { 
  const { dbs, dbsTables, dbsMethods, user, auth, theme  } = props;
  const [dbsConnection, setdbsConnection] = useState<Connections>();

  const [searchParams, setSearchParams] = useSearchParams();
  useEffectAsync(async () => { 
    if(!dbsConnection && auth?.user){
      setdbsConnection(await dbs.connections.findOne({ id: auth.user.state_db_id }));
    }
  }, [dbsConnection, dbs, auth]);
  
  if(!user){
    return null;
  }

  if(user.passwordless_admin){
    return <div className=" f-1 flex-col w-full gap-1 p-p5 o-auto" style={{ maxWidth: "700px" }}>
      <PasswordlessSetup {...props} />
    </div>
  }

  const sectionItems = {
    details: {
      label: "Account details",
      leftIconPath: mdiAccount, 
      content: <SmartForm 
        theme={theme}
        label="" 
        db={dbs as any} 
        methods={dbsMethods}
        tableName="users" 
        tables={dbsTables}
        rowFilter={[{ fieldName: "id", value: user.id }]}
        hideChangesOptions={true}
        confirmUpdates={true} 
        disabledActions={["clone", "delete"]}
      />
    },
    security: {
      label: "Security",
      leftIconPath: mdiSecurity, 
      content: <div className="flex-col gap-1 px-1 f-1">
        <Setup2FA  {...{ user, dbsMethods }} onChange={console.log} />  

        <Sessions displayType="web_session" { ...props } />
      </div>
    },
    api: {
      label: "API",
      leftIconPath: mdiApplicationBracesOutline,
      content: <div className="flex-col gap-1 px-1 f-1">
        {dbsConnection && <APIDetails
          {...props} 
          projectPath={"/iosckt"} 
          connectionId={dbsConnection.id} 
        />}
      </div>
    }
  }

  const sectionItemKeys = getKeys(sectionItems);
  
  return <div className=" f-1 flex-col w-full o-auto ai-center " >

    <div className="flex-col f-1 min-h-0 pt-1 w-full" style={{ maxWidth: "800px"}}>
      <Tabs variant={{ controlsBreakpoint: 200, contentBreakpoint: 500, controlsCollapseWidth: 350 }}
        className="f-1 shadow"
        activeKey={sectionItemKeys.find(s => s === searchParams.get("section")) ?? sectionItemKeys[0]} 
        onChange={section => { setSearchParams({ section: section as string }) }}
        items={sectionItems}
        contentClass="f-1 o-autdo flex-row jc-center bg-1 " 
        onRender={item => <div className="flex-col f-1 max-w-800 min-w-0 bg-0 shadow w-full">
          <h2 style={{ paddingLeft: "18px" }} className=" max-h-fit">{item.label}</h2>
          <div className={" f-1 o-auto flex-row " + (window.isLowWidthScreen? "" : " ")} 
            style={{ alignSelf: "stretch" }}
          >
            {item.content}
          </div>
        </div>}
      />
    </div> 

  </div> 
}