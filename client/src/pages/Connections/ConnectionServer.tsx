import { mdiPlus } from "@mdi/js";
import { asName } from "prostgles-client/dist/prostgles";
import { pickKeys } from "prostgles-types";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrglState } from "../../App";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import Popup from "../../components/Popup/Popup";
import Select from "../../components/Select/Select";
import { DBS } from "../../dashboard/Dashboard/DBS";
import { SampleSchemaDefinition, SampleSchemas } from "../../dashboard/SampleSchemas";
import { Connection } from "../NewConnection/NewConnnection";

type ConnectionServerProps = {
  name: string;
  dbsMethods: PrglState["dbsMethods"];
  connections: { id: string; db_name: string; }[];
  dbs: DBS;
};

const Actions = {
  create: "Create a database",
  add: "Add existing database",
} as const;
type ActionTypes = [
  { 
    type: typeof Actions.create,
    applySchema?: SampleSchemaDefinition;
    newDatabaseName?: string;
  }, 
  { 
    type:  typeof Actions.add,
    existingDatabaseName?: string;
  },
];

export const ConnectionServer = ({ name, dbsMethods, connections, dbs }: ConnectionServerProps) => {
  const { runConnectionQuery, getSampleSchemas, createConnection, validateConnection, getCompiledTS } = dbsMethods;
  const connId = connections[0]?.id;
  const [action, setAction] = useState<ActionTypes[number]>();
  const [connectionName, setConnectionName] = useState("");
  const [serverInfo, setServerInfo] = useState<{
    canCreateDb: boolean;
    databases: string[];
    sampleSchemas: SampleSchemaDefinition[];
    usedDatabases: string[];
    mainConnection: Required<Connection>;
    existingConnectionNames: string[];
  } | undefined>(undefined);

  const navigate = useNavigate();
  const [error, setError] = useState<any>();

  if(!runConnectionQuery || !getSampleSchemas || !createConnection || !validateConnection || !connId) return null;

  const onOpenActions = async () => {
    const serverInfo = (await runConnectionQuery(
      connections[0]!.id!,
      `
        SELECT rolcreatedb OR rolsuper as "canCreateDb"
        FROM pg_catalog.pg_roles
        WHERE rolname = "current_user"();
      `
    ))[0]! as { canCreateDb: boolean, databases: string[] };
    const databases = (await runConnectionQuery(
      connections[0]!.id!,
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
      existingConnectionNames: existingConnections.map(c => c.name ?? "").filter(v => v),
    });
  };

  const duplicateConnectionName = serverInfo?.existingConnectionNames.includes(connectionName);
  const ConnectionNameEditor = <FormField 
    label={"New connection name"} 
    value={connectionName} 
    onChange={setConnectionName} 
    error={duplicateConnectionName? "Name already in used" : undefined}
  />;
 
  return <FlexRow className="gap-p25 jc-end p-p5" style={{ fontWeight: 400 }}>
    <h4 title="Server info" className="m-0 flex-row gap-p5 p-p5 ai-center text-1p5 jc-end" >
      {/* <Icon path={mdiServerNetwork} size={1} className="text-gray-400" /> */}
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
          "data-command": "ConnectionServer.add.newDatabase", 
          disabledInfo: error?.toString() ?? (!serverInfo?.canCreateDb? `Not allowed to create databases` : undefined) 
        },
        { 
          key: Actions.add, 
          disabledInfo: error?.toString() 
        },
      ]}
      // className="show-on-parent-hover"
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
            )? "Some data is missing" : duplicateConnectionName? "Must fix connection name error" : undefined, 
            onClickMessage: async (e, setMsg) => {
              setMsg({ loading: 1, delay: 0 });
              try {
                let newDbName = "";
                if(action.type === Actions.create){
                  await runConnectionQuery(connId, `CREATE DATABASE ${asName(action.newDatabaseName!)};`);
                  newDbName = action.newDatabaseName!;
                  
                } else {
                  newDbName = action.existingDatabaseName!
                }
                const validatedConnection = await validateConnection({ 
                  ...pickKeys(serverInfo!.mainConnection!, [
                    "db_conn", 
                    "db_host", 
                    "db_pass", 
                    "db_port", 
                    "db_ssl", 
                    "db_user", 
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
                })
                const { connection: newConnection } = await createConnection(validatedConnection.connection);
                if(action.type === Actions.create && action.applySchema){
                  try {
                    if(action.applySchema.type === "sql"){
                      await runConnectionQuery(newConnection.id, action.applySchema.file);
                    } else {
                      await dbs.database_configs.update({ $existsJoined: { connections: { id: newConnection.id } } }, { table_config_ts: action.applySchema.file });
                    }
                  } catch(error){
                    console.error(error);
                    alert("Something went wrong with creating the sample schema");
                  }
                }
                navigate(`/connections/${newConnection.id}`);
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
            label={"Databases"}
            value={action.existingDatabaseName}
            fullOptions={serverInfo.databases.map(key => ({
              key,
              disabledInfo: serverInfo.usedDatabases.includes(key)? "Already added to connections" : undefined
            })).sort((a, b) => +!!a.disabledInfo - +!!b.disabledInfo)}
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
        <ErrorComponent error={error} />
      </Popup>
    }
  </FlexRow>
}