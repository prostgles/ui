import { useEffect } from "react";
import type { SmartFormProps } from "./SmartForm";
import { getErrorsHook } from "./SmartFormV2";

export const useSmartFormGetData = (props: SmartFormProps) => {
  const { tableName, db, getRef } = this.props;
  const { action } = this.state;

  useEffect(() => {
    if (getRef) {
      getRef({ getErrors: this.getErrors });
    }
  });

  const rowFilter = this.getRowFilter();
  if (
    action.initialised &&
    (action.type === "view" || action.type === "update") &&
    (dS?.action || dP?.rowFilter || dS?.rowFilter) &&
    this.rowSubFilterStr !== JSON.stringify(rowFilter || "")
  ) {
    this.rowSubFilterStr = JSON.stringify(rowFilter || "");
    await this.rowSub?.unsubscribe();
    if (!this.props.rowFilter?.length || !rowFilter) {
      this.setState({
        action: {
          ...this.state.action,
          loading: false,
          dataItemLoaded: true,
        },
      });
      return;
    }

    const tableHandler = db[tableName];

    const findAndSetRow = async () => {
      const select = await this.getSelect();
      const currentRow = await tableHandler?.findOne?.(rowFilter, { select });
      const newAction = {
        ...this.state.action,
        loading: false,
        currentRow,
        dataItemLoaded: true,
      };

      this.setState(
        {
          action: newAction,
        },
        () => {
          this.props.onLoaded?.();
        },
      );
    };

    if (tableHandler?.subscribeOne && !this.props.noRealtime) {
      try {
        const findParams = { select: await this.getSelect() };
        /** validate find args */
        await findAndSetRow();
        this.rowSub = await tableHandler.subscribeOne(
          rowFilter,
          findParams,
          (currentRow) => {
            if (currentRow) {
              this.setState({
                action: {
                  ...this.state.action,
                  loading: false,
                  currentRow,
                  dataItemLoaded: true,
                },
              });
            }
          },
        );
      } catch (error) {
        console.error("Could not subscribe", {
          tableName,
          rowFilter,
          error,
          select: await this.getSelect(),
        });
        findAndSetRow();
      }
    } else {
      findAndSetRow();
    }
  }
};

const getErrors: getErrorsHook = async (cb) => {
  const {
    defaultData = {},
    rowFilter,
    cannotBeNullMessage = "Must not be empty",
  } = this.props;
  const {
    newRow = {},
    defaultColumnData = {},
    // tableInfo,
    referencedInsertData = {},
  } = this.state;
  let data = {
    ...defaultColumnData,
    ...defaultData,
    ...newRow,
    ...referencedInsertData,
  };
  let _errors: AnyObject | undefined;

  const { columns, table } = this;
  const tableInfo = table?.info;

  this.getDisplayedColumns()
    .filter((c) => c.insert || c.update)
    .forEach((c) => {
      const val = data[c.name];

      /* Check against not null rules */
      if (!c.is_nullable) {
        const isNull = (v) => [undefined, null].includes(v);

        const willInsertMedia =
          tableInfo?.hasFiles &&
          tableInfo.fileTableName &&
          c.references?.some((r) => r.ftable === tableInfo.fileTableName) &&
          data[tableInfo.fileTableName]?.length;
        if (
          /* If it's an insert then ensure all non nullable cols are filled */
          (!rowFilter && isNull(val) && !c.has_default && !willInsertMedia) ||
          /* If update then ensure not updating non nullable with null  */
          val === null
        ) {
          _errors ??= {};
          _errors[c.name] = cannotBeNullMessage;
        }
      }

      /** Ensure json fields are not string */
      if (c.udt_name.startsWith("json") && typeof val === "string") {
        try {
          data = {
            ...data,
            [c.name]: JSON.parse(val),
          };
        } catch (error) {
          _errors ??= {};
          _errors[c.name] = "Must be a valid json";
        }
      }
    });

  if (!_errors) {
    let verr;
    if (this.props.onValidateValue) {
      await Promise.all(
        columns.map(async (c) => {
          const err = await this.props.onValidateValue?.(data[c.name], data, c);
          if (err) {
            verr = verr || {};
            verr = { ...verr, [c.name]: err };
          }
        }),
      );
    } else if (this.props.onValidate) {
      verr = await this.props.onValidate(data, columns);
    }
    const errors = verr || (await cb(data));

    if (errors && !isEmpty(errors)) {
      this.setState({ errors });
    }
  } else {
    this.setState({ errors: _errors });
  }
};
