import { mdiContentCopy, mdiDelete } from "@mdi/js";
import type {
  AnyObject,
  ProstglesError,
  TableInfo,
  ValidatedColumnInfo,
} from "prostgles-types";
import React, { useState } from "react";
import { dataCommand } from "../../Testing";
import Btn from "../../components/Btn";
import type { ConfirmDialogProps } from "../../components/ConfirmationDialog";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { Footer } from "../../components/Popup/Popup";
import { isEmpty, pickKeys } from "prostgles-types";
import { useIsMounted } from "../Backup/CredentialSelector";
import type {
  FormAction,
  SmartFormProps,
  SmartFormState,
  getErrorsHook,
} from "./SmartForm";

type P = {
  props: SmartFormProps;
  state: SmartFormState;
  tableInfo: TableInfo | undefined;
  columns: ValidatedColumnInfo[];
  action: "view" | "update" | "insert";
  getThisRow: () => AnyObject;
  getErrors: getErrorsHook;
  parseError: (error: ProstglesError) => void;
  getValidatedRowFilter: () => Promise<AnyObject | undefined>;
  getRowFilter: () => AnyObject | undefined;
  setError: (error: any) => void;
  setAction: (action: FormAction) => void;
};

type ConfirmationPopup = {
  message: string;
  acceptBtn: ConfirmDialogProps["acceptBtn"];
  onAccept: Function;
  onClose?: Function;
};

export const SmartFormFooterButtons = (p: P): JSX.Element => {
  const { props, state, action } = p;

  const { error } = state;
  const newRow = state.newRow ?? props.defaultData ?? props.fixedData;
  const {
    db,
    tableName,
    disabledActions,
    onClose,
    onBeforeInsert,
    confirmUpdates,
    onChange,
  } = props;

  const tableHandler = db[tableName];

  const useConfirmPopup = useState<ConfirmationPopup>();

  const [confirmPopup, setConfirmPopup] = useConfirmPopup;
  const getIsMounted = useIsMounted();

  const btnProps = { ...p, useConfirmPopup, getIsMounted };

  /** Showing Success animation. Will close soon */
  if (state.action.success) {
    return <></>;
  }

  let footerContent: JSX.Element = <></>;
  if (confirmPopup) {
    footerContent = (
      <>
        <div
          className="absolute "
          style={{
            inset: 0,
            opacity: 0.5,
            background: "gray",
            zIndex: 1, // needed to be on top of focused code editors
          }}
        />
        <ConfirmationDialog
          className="bg-color-0"
          style={{ zIndex: 2 }}
          onClose={() => {
            setConfirmPopup(undefined);
          }}
          onAccept={async () => {
            await confirmPopup.onAccept();
            setConfirmPopup(undefined);
          }}
          message={confirmPopup.message}
          acceptBtn={confirmPopup.acceptBtn}
        />
      </>
    );
  } else if (!onChange) {
    const startedUpdatingData = action === "update" && newRow;

    const hasDataToUpdate = Object.keys(newRow || {}).length;
    const showBtn = {
      update:
        !(!confirmUpdates || !tableHandler?.update || !hasDataToUpdate) &&
        !disabledActions?.includes("update"),
      delete:
        !startedUpdatingData &&
        !!tableHandler?.delete &&
        !disabledActions?.includes("delete"),
      insert: !startedUpdatingData && !!tableHandler?.insert,
      clone:
        !startedUpdatingData &&
        !!tableHandler?.insert &&
        !disabledActions?.includes("clone"),
    };

    const errorMsg = state.error ? "Must fix error first" : undefined;

    const footerExtraButtons =
      action === "view" ? null
      : (
        action === "update" &&
        (showBtn.update || showBtn.delete || showBtn.clone)
      ) ?
        <>
          {showBtn.update && (
            <Btn
              {...dataCommand("SmartForm.update")}
              color="action"
              // size="medium"
              className=""
              variant="filled"
              disabledInfo={errorMsg}
              onClick={() => onClickUpdate(btnProps)}
            >
              Update
            </Btn>
          )}
          {showBtn.delete && (
            <Btn
              {...dataCommand("SmartForm.delete")}
              title="Delete record"
              color="danger"
              disabledInfo={errorMsg}
              iconPath={mdiDelete}
              onClick={() => onClickDelete(btnProps)}
            >
              Delete
            </Btn>
          )}
          {showBtn.clone && (
            <Btn
              color="action"
              {...dataCommand("SmartForm.clone")}
              iconPath={mdiContentCopy}
              variant="filled"
              title="Prepare a duplicate insert that excludes primary key fields"
              className=" "
              onClick={() => onClickClone(btnProps)}
            >
              Clone
            </Btn>
          )}
        </>
      : action === "insert" ?
        <>
          {!showBtn.insert ?
            <div>Cannot insert: not allowed</div>
          : <Btn
              color="action"
              {...dataCommand("SmartForm.insert")}
              disabledInfo={errorMsg}
              className=" "
              variant="filled"
              onClick={() => onClickInsert(btnProps)}
            >
              {onBeforeInsert ? `Add` : `Insert`}
            </Btn>
          }
        </>
      : null;

    const showExtraBtns = !!(
      footerExtraButtons && !(state.action.success && !error)
    );

    footerContent =
      !(showExtraBtns || onClose) ?
        <></>
      : <Footer>
          {props.onClose && (
            <Btn
              className=" bg-color-0 mr-auto"
              {...dataCommand("SmartForm.close")}
              onClick={() => onClose?.(true)}
            >
              {action === "view" ? `Close` : `Cancel`}
            </Btn>
          )}
          {showExtraBtns && footerExtraButtons}
        </Footer>;
  }

  return footerContent;
};

type ButtonProps = P & {
  useConfirmPopup: [
    ConfirmationPopup | undefined,
    React.Dispatch<React.SetStateAction<ConfirmationPopup | undefined>>,
  ];
  getIsMounted: () => boolean;
};

const onClickInsert = async ({
  state,
  props,
  getThisRow,
  columns,
  getErrors,
  parseError,
  setAction,
  setError,
  tableInfo,
}: ButtonProps) => {
  const {
    db,
    tableName,
    includeMedia = true,
    onInserted,
    onSuccess,
    onBeforeInsert,
  } = props;
  const { referencedInsertData = {}, action } = state;
  const tableHandler = db[tableName];

  if (action.type !== "insert") return;

  getErrors(async (row) => {
    // if (row && columns) {
    try {
      // this.setState({ sendingData: true });
      setAction({ ...action, loading: true });

      let extraKeys: string[] = [];

      if (tableInfo?.hasFiles && includeMedia && tableInfo.fileTableName) {
        const mTblName = tableInfo.fileTableName;
        extraKeys = [mTblName];
      }
      let dataForInsert;
      if (tableInfo?.isFileTable) {
        dataForInsert = getThisRow()[tableName] ?? props.defaultData;
      } else {
        dataForInsert = pickKeys(
          getThisRow(),
          columns
            .filter((c) => c.insert)
            .map((c) => c.name)
            .concat(extraKeys),
        );
        dataForInsert = {
          ...dataForInsert,
          ...referencedInsertData,
        };
      }

      if (onBeforeInsert) {
        onBeforeInsert(dataForInsert);
      } else {
        const doInsert = async () => {
          if (
            tableInfo?.isFileTable &&
            props.isReferencedInsert?.pkeyColumns.length
          ) {
            const { tableName } = props.isReferencedInsert;
            const refTableHandler = db[tableName];
            if (refTableHandler?.update) {
              const filter = pickKeys(
                props.isReferencedInsert.row,
                props.isReferencedInsert.pkeyColumns,
              );
              if (
                Object.values(filter).some((v) =>
                  [null, undefined].includes(v),
                ) ||
                isEmpty(filter)
              ) {
                throw "Invalid nested insert filter";
              }
              const count = await refTableHandler.count?.(filter);
              if (+(count ?? 0) !== 1) throw "Could not match to exactly 1 row";
              return refTableHandler.update(filter, {
                [props.isReferencedInsert.columnName]: dataForInsert[0],
              });
            }
          }

          return tableHandler?.insert!(
            dataForInsert,
            onInserted || onSuccess ? { returning: "*" } : {},
          );
        };
        const nr = await doInsert();
        onSuccess?.("insert", nr as any);
        onInserted?.(nr as any);
      }

      setError(undefined);
      setAction({ ...action, loading: false, success: "inserted" });
    } catch (error: any) {
      parseError(error);
      console.error(error);
    }
  });
};

const onClickUpdate = async ({
  state,
  props,
  getErrors,
  parseError,
  getValidatedRowFilter,
  useConfirmPopup,
  setAction,
  setError,
  tableInfo,
}: ButtonProps) => {
  const { db, tableName, onSuccess } = props;
  const { action } = state;

  const tableHandler = db[tableName];

  const [_, setConfirmPopup] = useConfirmPopup;

  if (action.type !== "update") return;

  getErrors(async (row) => {
    // if (row) {}
    setConfirmPopup({
      message: "Are you sure you want to update?",
      acceptBtn: {
        dataCommand: "SmartForm.update.confirm",
        text: "Update row!",
        color: "action",
      },
      onAccept: async () => {
        setConfirmPopup(undefined);
        // this.setState({ sendingData: true });
        setAction({ ...action, loading: true });

        const _newRow = row;
        const newRow = tableInfo?.isFileTable ? _newRow[tableName][0] : _newRow;
        let f;
        try {
          f = await getValidatedRowFilter();
          const nr = await tableHandler?.update!(f, newRow, { returning: "*" });
          onSuccess?.("update", nr as any);
          setError(undefined);
          setAction({ ...action, success: "updated", loading: false });
        } catch (error: any) {
          parseError(error);

          console.error(error, f, newRow);
        }
      },
      onClose: () => setConfirmPopup(undefined),
    });
  });
};

const onClickClone = async ({
  parseError,
  props,
  getRowFilter,
  setAction,
  setError,
}: ButtonProps) => {
  const { db, tables, tableName } = props;
  const tableHandler = db[tableName];

  try {
    const rowFilter = getRowFilter();
    const rows = await tableHandler?.find!(rowFilter);
    if (rows?.length === 1) {
      const tbl = tables.find((t) => t.name === tableName);
      const clonedRow = rows[0];
      tbl?.columns.map((c) => {
        if (c.is_pkey) {
          delete clonedRow?.[c.name];
        }
      });
      setAction({
        type: "insert",
        data: {},
        clonedRow,
        initialised: true,
      });
    } else {
      setError(
        "Could not clone row because the row filter refers to more than 1 row",
      );
    }
  } catch (error: any) {
    parseError(error);
    console.error(error);
  }
};

const onClickDelete = async ({
  props,
  parseError,
  getValidatedRowFilter,
  useConfirmPopup,
  state,
  setAction,
  setError,
  getIsMounted,
}: ButtonProps) => {
  const { db, tableName, onSuccess } = props;
  const tableHandler = db[tableName];
  const { action } = state;

  if (action.type === "insert") throw "Cannot delete an insert!";

  const [_, setConfirmPopup] = useConfirmPopup;
  setConfirmPopup({
    message: "Are you sure you want to delete this?",
    acceptBtn: {
      dataCommand: "SmartForm.delete.confirm",
      text: "Delete!",
      color: "danger",
    },
    onAccept: async () => {
      setConfirmPopup(undefined);
      setAction({ ...action, loading: true });
      try {
        await tableHandler?.delete!(await getValidatedRowFilter());
        onSuccess?.("delete");

        setError(undefined);
        setAction({ ...action, loading: false, success: "deleted" });
      } catch (error: any) {
        parseError(error);
        console.error(error);
      }
    },
    onClose: () => {
      setConfirmPopup(undefined);
    },
  });
};
