import {
  mdiArrowLeft,
  mdiCheck,
  mdiContentDuplicate,
  mdiDeleteOutline,
  mdiPlus,
} from "@mdi/js";
import React from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import type { DBGeneratedSchema } from "../../../../commonTypes/DBGeneratedSchema";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { isObject } from "../../../../commonTypes/publishUtils";
import type { ExtraProps } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent, {
  getErrorMessage,
} from "../../components/ErrorComponent";
import { InfoRow } from "../../components/InfoRow";
import Loading from "../../components/Loading";
import { CodeConfirmation } from "../../dashboard/Backup/CodeConfirmation";
import RTComp from "../../dashboard/RTComp";
import { JoinedRecords } from "../../dashboard/SmartForm/JoinedRecords/JoinedRecords";
import { get } from "../../utils";
import { getServerInfo } from "../Connections/Connections";
import { NewConnectionForm } from "./NewConnectionForm";
import { PostgresInstallationInstructions } from "../PostgresInstallationInstructions";
import { getOS } from "../ElectronSetup";
import { FlexCol } from "../../components/Flex";
import { SwitchToggle } from "../../components/SwitchToggle";
import PopupMenu from "../../components/PopupMenu";
import { Icon } from "../../components/Icon/Icon";
import type { FullExtraProps } from "../ProjectConnection/ProjectConnection";
import { API_PATH_SUFFIXES } from "../../../../commonTypes/utils";
import { t } from "../../i18n/i18nUtils";

export const getSqlErrorText = (e: any) => {
  let objDetails: [string, any][] = [];

  /** Tablehandler error */
  if (isObject(e) && "txt" in e) {
    objDetails = ["table", "column"]
      .map((k) => [k, e[k]] satisfies [string, any])
      .filter((d) => typeof d[1] === "string");
  }

  /** SQL handler error */
  const text =
    get(e, "err.err_msg") ||
    get(e, "err.constraint") ||
    get(e, "err.txt") | get(e, "err.message") ||
    e.err_msg ||
    e;
  if (typeof text === "string" && isObject(e.err)) {
    objDetails = ["schema", "table", "column"]
      .map((k) => [k, e.err[k]] satisfies [string, any])
      .filter((d) => typeof d[1] === "string");
  }
  if (objDetails.length) {
    return `${objDetails
      .map(([key, val]) => `${key}: ${val}`)
      .concat([text])
      .join("\n")}`;
  }
  return text;
};

export type Connection = Omit<
  DBGeneratedSchema["connections"]["columns"],
  "user_id"
>;

export const DEFAULT_CONNECTION = {
  id: undefined,
  name: "",
  type: "Standard" as Connection["type"],
  db_user: "",
  db_pass: "",
  db_name: "",
  db_host: "",
  db_port: 5432,
  db_ssl: "prefer",
  prgl_url: "",
  prgl_params: "",
  db_conn: "",
  db_watch_shema: true,
  db_connection_timeout: 10_000,
} as const;

type NewConnectionProps = {
  db: FullExtraProps["dbProject"] | undefined;
  connectionId: string | undefined;
  prglState: Pick<
    ExtraProps,
    "dbs" | "dbsMethods" | "dbsTables" | "user" | "theme"
  >;
  onDeleted?: () => void;
  onUpserted?: (connection: Required<Connection>) => void;
  contentOnly?: boolean;
  showTitle: boolean;
};

type NewConnectionState = {
  error?: any;
  nameErr: string;
  connection: Connection;
  originalConnection?: DBSSchema["connections"];
  validationWarning?: string;
  status: string;
  statusOK: boolean;
  conNotFound: boolean;
  mode: "clone" | "edit" | "insert" | "loading";
  wasEdited: boolean;
  dropDatabase: boolean;
};

class NewConnection extends RTComp<NewConnectionProps, NewConnectionState> {
  state: NewConnectionState = {
    conNotFound: false,
    nameErr: "",
    connection: DEFAULT_CONNECTION,
    wasEdited: false,
    status: "",
    statusOK: false,
    dropDatabase: false,
    mode: "loading",
  };

  get conId() {
    return this.props.connectionId;
  }

  onMount = async () => {
    const { prglState: pgrlState } = this.props;
    if (this.conId) {
      const { dbs } = pgrlState;
      const connection = await dbs.connections.findOne({ id: this.conId });
      if (connection && this.mounted) {
        this.setState({
          originalConnection: connection,
          connection,
          mode: "edit",
        });
      } else {
        this.setState({
          conNotFound: true,
          mode: "edit",
        });
      }
    } else {
      this.setState({ mode: "insert" });
    }
  };

  testConnection = async () => {
    const { connection } = this.state;
    const { prglState } = this.props;

    const { dbsMethods } = prglState;
    this.setState({ status: "" });
    try {
      const res = await dbsMethods.testDBConnection!(connection!);
      this.setState({
        status:
          "OK" +
          ((res as any).isSSLModeFallBack ? ". (sslmode=prefer fallback)" : ""),
        statusOK: true,
      });
    } catch (err: any) {
      this.setState({
        status: err.err_msg ?? err.message,
        statusOK: false,
      });
    }
  };

  onClickDelete = async () => {
    const { connection: c, dropDatabase } = this.state;
    const { onDeleted, prglState } = this.props;

    const { dbsMethods } = prglState;
    try {
      await dbsMethods.deleteConnection!(c.id!, { dropDatabase });
      /** Hacky way to prevent reconnections to dropped connection */
      (window as any).dbSocket?.disconnect();
      onDeleted?.();
    } catch (e: any) {
      this.setState({ error: getSqlErrorText(e) });
      throw e;
    }
  };

  addedName = false;
  render() {
    const {
      nameErr,
      connection: c,
      status,
      statusOK,
      conNotFound,
      mode,
      error,
      originalConnection: origCon,
      dropDatabase,
    } = this.state;
    const { prglState, onUpserted, contentOnly, showTitle = true } = this.props;

    if (mode === "loading") {
      return <Loading className="m-auto" />;
    }

    const { dbsMethods, dbs } = prglState;
    if (!dbsMethods.createConnection || !dbsMethods.deleteConnection) {
      return (
        <InfoRow color="warning" className="mt-2">
          {t.common["You do not have sufficient privileges to access this"]}
        </InfoRow>
      );
    }

    if (conNotFound) {
      return (
        <FlexCol className="m-auto">
          <p>{t.NewConnection["Connection not found"]}</p>
          <NavLink to="/">{t.NewConnection["Go back to connections"]}</NavLink>
        </FlexCol>
      );
    }

    const updateConnection = async (con: Partial<Connection>) => {
      if (mode !== "edit" && con.db_name !== undefined) {
        this.addedName = true;
      }

      const currCon = this.state.connection;
      const newData = {
        ...currCon,
        ...con,
      };

      /** Validated connection only after some crucial info is provided */
      let { connection, warning } =
        (
          newData.db_host ||
          newData.db_user ||
          newData.db_name ||
          newData.db_conn ||
          mode === "edit" ||
          mode === "insert"
        ) ?
          await dbsMethods.validateConnection!(newData).catch((error) => {
            return { warning: error, connection };
          })
        : { connection: newData, warning: undefined };

      if (mode !== "edit" && !this.addedName && !connection.name) {
        connection.name = connection.db_name;
      }

      /** If just switched connection type then do not prefill */
      const wasEdited =
        this.state.wasEdited || Object.keys(con).join("") !== "type";
      if (!wasEdited) {
        connection = {
          ...connection,
          db_conn: "",
        };
        warning = undefined;
      }

      this.setState({
        nameErr: "",
        validationWarning: warning,
        status: "",
        statusOK: false,
        connection,
        wasEdited,
      });
    };

    return (
      <FlexCol
        className={"min-h-0 " + (contentOnly ? " " : " mx-auto ")}
        style={{
          maxWidth: "100%",
          maxHeight: "100vh",
          minWidth: "450px",
        }}
      >
        {!contentOnly && (
          <NavLink
            className="p-1 text-1 round flex-row ai-center"
            to={API_PATH_SUFFIXES.DASHBOARD}
          >
            <Icon path={mdiArrowLeft} size={1} />
            <div className="ml-p5">{t.NewConnection.Connections}</div>
          </NavLink>
        )}

        <div
          className={
            "flex-col bg-color-0  min-h-0 " + (contentOnly ? "" : " card p-1 ")
          }
          style={{ maxWidth: "100%" }}
        >
          <div
            className="flex-col gap-1 f-1 o-auto min-h-0 p-p25 no-scroll-bar"
            style={{
              margin: "-.25em" /* Used to ensure focus border is visible */,
            }}
          >
            {mode === "clone" && origCon && (
              <InfoRow color="action">
                {t.NewConnection["Cloning connection"]}:{" "}
                <strong>{getServerInfo(origCon)}</strong>
              </InfoRow>
            )}
            {showTitle && (
              <h2 className="m-0 p-0 mb-1">
                {mode === "edit" ? "Edit" : "Add"} connection
              </h2>
            )}
            {mode === "insert" && (
              <PostgresInstallationInstructions
                os={getOS()}
                placement="add-connection"
              />
            )}
            <NewConnectionForm
              {...this.props}
              dbProps={
                this.props.db ?
                  {
                    dbProject: this.props.db,
                    dbsTables: this.props.prglState.dbsTables,
                    origCon: c,
                    dbsMethods: this.props.prglState.dbsMethods,
                  }
                : undefined
              }
              c={c}
              nameErr={nameErr}
              updateConnection={updateConnection}
              mode={mode}
              test={{
                onTest: this.testConnection,
                status,
                statusOK,
              }}
            />
          </div>
          <ErrorComponent
            error={error}
            style={{ background: "white", padding: "1em" }}
            withIcon={true}
          />
          <div className="flex-row-wrap ai-center mt-1 gap-1 ">
            {mode === "edit" && (
              <CodeConfirmation
                positioning="center"
                title={t.NewConnection["Delete connection"]}
                fixedCode={dropDatabase ? c.db_name : c.name}
                button={
                  <Btn
                    iconPath={mdiDeleteOutline}
                    color="danger"
                    variant="outline"
                    data-command="Connection.edit.delete"
                  >
                    {t.common.Delete}...
                  </Btn>
                }
                message={
                  <div className="flex-col h-fit gap-1">
                    <InfoRow variant="naked" iconPath="">
                      {
                        t.NewConnection[
                          "Any related dashboard content will also be deleted"
                        ]
                      }
                    </InfoRow>

                    <PopupMenu
                      title={t.common["Related data"]}
                      button={
                        <Btn variant="outline">{t.common["Related data"]}</Btn>
                      }
                      clickCatchStyle={{ opacity: 0 }}
                      onClickClose={false}
                    >
                      <JoinedRecords
                        theme={prglState.theme}
                        style={{ padding: 0 }}
                        db={prglState.dbs as any}
                        rowFilter={[{ fieldName: "id", value: this.conId }]}
                        showRelated="descendants"
                        tableName={"connections"}
                        tables={prglState.dbsTables}
                        methods={prglState.dbsMethods}
                        expanded={true}
                        showOnlyFKeyTables={true}
                      />
                    </PopupMenu>
                    <SwitchToggle
                      data-command="Connection.edit.delete.dropDatabase"
                      label={t.NewConnection["Drop database as well"]}
                      checked={dropDatabase}
                      onChange={(dropDatabase) =>
                        this.setState({ dropDatabase })
                      }
                    />
                    <InfoRow
                      className="ws-pre"
                      style={{ opacity: dropDatabase ? 1 : 0 }}
                    >
                      {t.NewConnection["You are about to drop"]}{" "}
                      <strong>{c.db_name}</strong> {t.NewConnection.database}.
                      <br></br>
                      {
                        t.NewConnection[
                          "Ensure data is backed up. This action is not reversible"
                        ]
                      }
                    </InfoRow>
                    <ErrorComponent error={error} />
                  </div>
                }
                confirmButton={(popupClose) => (
                  <Btn
                    color="danger"
                    variant="filled"
                    iconPath={mdiDeleteOutline}
                    className="ml-auto"
                    data-command="Connection.edit.delete.confirm"
                    onClickMessage={async (e, setMsg) => {
                      setMsg({ loading: 1, delay: 0 });
                      try {
                        await this.onClickDelete().then(popupClose);
                      } catch (e) {}
                      setMsg({ loading: 0 });
                    }}
                  >
                    {t.common.Delete}
                  </Btn>
                )}
              />
            )}

            {mode === "edit" && (
              <Btn
                title={t.NewConnection["Clone connection"]}
                className={"f-0 mx-1 w-fit "}
                variant="outline"
                color="action"
                iconPath={mdiContentDuplicate}
                onClick={async (e) => {
                  if (c.name) updateConnection({ name: c.name + " (copy)" });
                  updateConnection({ created: null, is_state_db: null });
                  this.setState({ mode: "clone" });
                }}
              >
                {t.common.Clone}
              </Btn>
            )}

            <Btn
              className={"ml-auto w-fit"}
              variant="filled"
              color="action"
              data-command="Connection.edit.updateOrCreateConfirm"
              iconPath={mode === "edit" ? mdiCheck : mdiPlus}
              disabledInfo={
                (
                  mode === "edit" &&
                  JSON.stringify(c) === JSON.stringify(origCon)
                ) ?
                  t.common["Nothing to update"]
                : undefined
              }
              onClickMessage={async (e, setMsg) => {
                try {
                  const conn = { ...c };
                  if (mode !== "edit") delete conn.id;
                  setMsg({ loading: 1 });
                  if (
                    c.name &&
                    (await dbs!.connections.findOne({
                      name: c.name,
                      "id.<>": conn.id,
                    }))
                  ) {
                    this.setState({
                      nameErr: t.common["Already exists. Chose another name"],
                    });
                    setMsg({ loading: 0 });
                    return;
                  }

                  const { connection } =
                    await dbsMethods.createConnection!(conn);

                  onUpserted?.(connection);
                  setMsg({
                    ok:
                      (mode !== "edit" ? t.common.Create : t.common.Update) +
                      "!",
                  });
                } catch (e: any) {
                  console.error(e);
                  setMsg({ loading: 0 });
                  const status = getErrorMessage(e);
                  this.setState({ status, statusOK: false });
                }
              }}
            >
              {mode !== "edit" ? t.common.Create : t.common.Update}
            </Btn>
          </div>
        </div>
      </FlexCol>
    );
  }
}

export default (props: NewConnectionProps) => {
  const params = useParams();
  const navigate = useNavigate();
  return (
    <NewConnection
      {...props}
      connectionId={props.connectionId ?? params.id}
      onDeleted={() => {
        navigate("/");
      }}
      onUpserted={({ id }) => {
        navigate(API_PATH_SUFFIXES.DASHBOARD + "/" + id);
      }}
    />
  );
};
