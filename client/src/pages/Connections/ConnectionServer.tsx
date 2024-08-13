import { mdiPlus } from "@mdi/js";
import { asName, usePromise } from "prostgles-client/dist/prostgles";
import { pickKeys } from "prostgles-types";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SampleSchema } from "../../../../commonTypes/utils";
import type { PrglState } from "../../App";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import Popup from "../../components/Popup/Popup";
import Select from "../../components/Select/Select";
import type { DBS } from "../../dashboard/Dashboard/DBS";
import { SampleSchemas } from "../../dashboard/SampleSchemas";
import type { Connection } from "../NewConnection/NewConnnection";
import { CreatePostgresUser, useCreatePostgresUser, type NewPostgresUser } from "./CreatePostgresUser";

type ConnectionServerProps = {
  name: string;
  dbsMethods: PrglState["dbsMethods"];
  connections: { id: string; db_name: string; }[];
  dbs: DBS;
};

const Actions = {
  create: "Create a database in this server",
  add: "Select a database from this server",
} as const;
type ActionTypes = [
  { 
    type: typeof Actions.create,
    applySchema?: SampleSchema;
    newDatabaseName?: string;
  }, 
  { 
    type:  typeof Actions.add,
    existingDatabaseName?: string;
  },
];
type Action = ActionTypes[number];


export const ConnectionServer = ({ name, dbsMethods, connections, dbs }: ConnectionServerProps) => {
  const { runConnectionQuery, getSampleSchemas, createConnection, validateConnection } = dbsMethods;
  const connId = connections[0]!.id;
  const [action, setAction] = useState<ActionTypes[number]>();
  const [connectionName, setConnectionName] = useState("");
  const [serverInfo, setServerInfo] = useState<{
    canCreateDb: boolean;
    rolname: string;
    databases: string[];
    sampleSchemas: SampleSchema[];
    usedDatabases: string[];
    mainConnection: Required<Connection>;
    existingConnectionNames: string[];
  } | undefined>(undefined);

  const navigate = useNavigate();
  const [error, setError] = useState<any>();
  
  const newUser = useCreatePostgresUser({ connId, runConnectionQuery });
  const { newPgUser, newUserPasswordError, newUsernameError } = newUser;

  if(!runConnectionQuery || !getSampleSchemas || !createConnection || !validateConnection || !connId) return null;

  const onOpenActions = async () => {
    const serverInfo = (await runConnectionQuery(
      connId,
      `
        SELECT rolcreatedb OR rolsuper as "canCreateDb", rolname
        FROM pg_catalog.pg_roles
        WHERE rolname = "current_user"();
      `
    ))[0]! as { canCreateDb: boolean, databases: string[]; rolname: string; };
    const databases = (await runConnectionQuery(
      connId,
      `
        SELECT datname FROM pg_catalog.pg_database
      `
    )) as { datname: string; }[];
    const sampleSchemas = await getSampleSchemas();
    const existingConnections = await dbs.connections.find({}, { select: { name: 1 } });
    setServerInfo({ 
      ...serverInfo, 
      sampleSchemas,
      databases: databases.map(d => d.datname), 
      usedDatabases: connections.map(c => c.db_name),
      mainConnection: (await dbs.connections.findOne({ id: connId }))!,
      existingConnectionNames: existingConnections.map(c => c.name).filter(v => v),
    });
  };

  const duplicateConnectionName = serverInfo?.existingConnectionNames.includes(connectionName);
  const duplicateDbName = action?.type === Actions.create && serverInfo?.databases.includes(action.newDatabaseName!);
  const ConnectionNameEditor = <FormField 
    label={"New connection name"} 
    value={connectionName} 
    onChange={setConnectionName} 
    error={duplicateConnectionName? "Name already in used" : undefined}
  />;

  const onCreateConnection = async (action: Action) => {

    let newDbName = "";
    let newDbOwnerCredentials: undefined | Pick<Connection, "db_user" | "db_pass">;
    if(newPgUser.create) {
      if(newUsernameError || newUserPasswordError) throw "User already exists or password is missing";
      await runConnectionQuery(connId, `CREATE USER ${asName(newPgUser.name)} WITH ENCRYPTED PASSWORD $1;`, [newPgUser.password]);
      newDbOwnerCredentials = {
        db_user: newPgUser.name,
        db_pass: newPgUser.password,
      }
    }
    if(action.type === Actions.create){ 
      const createDbQuery = [
        `CREATE DATABASE ${asName(action.newDatabaseName!)}`,
        newDbOwnerCredentials && newPgUser.permissions.type === "owner"? `WITH OWNER ${JSON.stringify(newPgUser.name)}` : "",
      ].join("\n");
      await runConnectionQuery(connId, createDbQuery);
      newDbName = action.newDatabaseName!;
      
    } else {
      if(newDbOwnerCredentials && newPgUser.permissions.type === "owner"){
        await runConnectionQuery(connId, `ALTER DATABASE ${asName(action.existingDatabaseName!)} SET OWNER TO ${asName(newPgUser.name)};`);
      }
      newDbName = action.existingDatabaseName!
    }

    if(newDbOwnerCredentials && newPgUser.permissions.type === "custom"){
      const escapedUserName = asName(newUser.newPgUser.name);
      // console.log(await runConnectionQuery(connId, "SELECT current_user"));
      await runConnectionQuery(
        connId, 
        `
        GRANT CONNECT ON DATABASE ${asName(newDbName)} TO ${escapedUserName};
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ${escapedUserName};
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${escapedUserName};
        `
      );
    }

    const validatedConnection = await validateConnection({ 
      ...pickKeys(serverInfo!.mainConnection!, [
        "db_conn", 
        "db_host", 
        "db_port",
        "db_ssl", 
        "db_user", 
        "db_pass", 
        "db_ssl", 
        "ssl_certificate",
        "ssl_client_certificate", 
        "ssl_client_certificate_key", 
        "ssl_reject_unauthorized", 
      ]), 
      name: connectionName, 
      db_name: newDbName!,  
      type: "Standard", 
      db_conn: null,
      ...newDbOwnerCredentials,
    });
    const newConn = await createConnection(validatedConnection.connection, action.type === Actions.create? action.applySchema?.name : undefined);
    const { connection: newConnection } = newConn;
    if(action.type === Actions.create && action.applySchema?.type === "dir" && action.applySchema.workspaceConfig){
      for await (const workspace of action.applySchema.workspaceConfig.workspaces){
        await dbs.sql?.(`DELETE FROM workspaces WHERE name = $1`, [workspace.name]);
        await dbs.workspaces.insert({ ...workspace, connection_id: newConnection.id });
      }
    }
    navigate(`/connections/${newConnection.id}`);
  }
  
  const cannotCreateDb = error?.toString() || serverInfo && !serverInfo.canCreateDb;
  return <FlexRow className="gap-p25 jc-end p-p5" style={{ fontWeight: 400 }}>
    <h4 title="Server info" className="m-0 flex-row gap-p5 p-p5 ai-center text-1p5 jc-end" >
      {/* <Icon path={mdiServerNetwork} size={1} className="text-2" /> */}
      <div>{name}</div>
    </h4>
    <Select 
      btnProps={{ 
        iconPath: mdiPlus, 
        children: "", 
        size: "small", 
        color: "action", 
        variant: "filled",
        "data-command": "ConnectionServer.add",
        "data-key": name,
      }}
      fullOptions={[
        { key: Actions.create, 
          /** This is to ensure serverInfo is loaded before clicking  */
          "data-command": !serverInfo || cannotCreateDb? undefined : "ConnectionServer.add.newDatabase", 
          disabledInfo: error?.toString() ?? (cannotCreateDb? `Not allowed to create databases with this user (${serverInfo?.rolname})` : undefined) 
        },
        { 
          key: Actions.add, 
          disabledInfo: error?.toString() 
        },
      ]}
      onOpen={onOpenActions}
      onChange={action => {
        setAction({ type: action, });
      }}
    />
    {!!action &&
      <Popup
        clickCatchStyle={{ opacity: .3 }}
        positioning="center"
        title={action.type}
        onClose={() => setAction(undefined)}
        autoFocusFirst={{ selector: "input" }}
        footerButtons={[
          { label: "Cancel", onClickClose: true, },
          { 
            label: "Create and connect",
            variant: "filled",
            color: "action",
            "data-command": "ConnectionServer.add.confirm",
            disabledInfo: (
              action.type === Actions.create && !action.newDatabaseName && !connectionName || 
              action.type === Actions.add && !action.existingDatabaseName &&  !connectionName
            )? "Some data is missing" : 
              duplicateConnectionName? "Must fix connection name error" : 
              (newUsernameError ?? newUserPasswordError ?? undefined), 
            onClickMessage: async (e, setMsg) => {
              setMsg({ loading: 1, delay: 0 });
              try {
                await onCreateConnection(action);
              } catch(error) {
                console.error(error);
                setError(error)
              }
              setMsg({ loading: 0 });
            }, 
          },
        ]}
        contentClassName="flex-col gap-1 p-1 mx-p25"
      >
        {action.type === Actions.create? <>
          <FormFieldDebounced
            label={"New database name"}
            data-command="ConnectionServer.NewDbName" 
            inputProps={{ autoFocus: true }}
            error={duplicateDbName? "Name already in use" : undefined}
            onChange={newDatabaseName => {
              setAction({ ...action, newDatabaseName });
              setConnectionName(newDatabaseName);
            }}
            value={action.newDatabaseName} 
          />
          {!action.newDatabaseName && <FlexCol>
              <div>Or</div>
              <SampleSchemas 
                title={"Create demo schema (optional)"}
                name={action.applySchema?.name}
                dbsMethods={{ getSampleSchemas }}
                onChange={applySchema => {
                  const newDatabaseName = applySchema.name.split(".")[0]!;
                  setConnectionName(newDatabaseName);
                  setAction({ 
                    ...action, 
                    newDatabaseName,
                    applySchema,
                  })
                }}
              />
          </FlexCol>}
          {!!action.newDatabaseName && <>  
            {ConnectionNameEditor}
            <SampleSchemas 
              title={"Create demo schema (optional)"}
              name={action.applySchema?.name}
              dbsMethods={{ getSampleSchemas }}
              onChange={applySchema => {
                setAction({ 
                  ...action, 
                  applySchema,
                })
              }}
            />
          </>}
        
        </> : serverInfo? <>
          <Select
            label={"Database"}
            value={action.existingDatabaseName}
            fullOptions={serverInfo.databases.map(key => ({
              key,
              subLabel: serverInfo.usedDatabases.includes(key)? "Already added to connections" : undefined
            })).sort((a, b) => +!!a.subLabel - +!!b.subLabel)}
            onChange={existingDatabaseName => {
              setAction({ 
                ...action, 
                existingDatabaseName, 
              });
              if(!connectionName){
                setConnectionName(existingDatabaseName);
              }
            }}
          />
          {action.existingDatabaseName && ConnectionNameEditor}
        </> : "Something went wrong"}
        {(action.type === Actions.create? action.newDatabaseName : action.existingDatabaseName) && <CreatePostgresUser 
          {...newUser}
          connectionName={connectionName} 
        />}
        <ErrorComponent error={error} />
      </Popup>
    }
  </FlexRow>
}