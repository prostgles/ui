import React from "react";
import type {
  FilterType,
  SimpleFilter,
} from "../../../../commonTypes/filterUtils";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import RTComp from "../RTComp";
import { parseValue } from "../SmartForm/SmartFormField/fieldUtils";
import { colIs } from "../W_Table/ColumnMenu/ColumnSelect";
import { getTableSelect } from "../W_Table/tableUtils/getTableSelect";
import type { BaseFilterProps } from "./SmartFilter";
import { _PG_numbers } from "prostgles-types";
import { FlexRowWrap } from "../../components/Flex";

type NumberOrDateFilterProps = BaseFilterProps & {
  type: "number" | "date";
  inputType: string;
};

type Limits = {
  min: number;
  max: number;
};
type NumberOrDateFilterState = {
  limits?: Limits;
};

export class NumberOrDateFilter extends RTComp<
  NumberOrDateFilterProps,
  NumberOrDateFilterState
> {
  static TYPES: FilterType[] = ["$between"];

  state: NumberOrDateFilterState = {};

  onDelta = async (dP, dS, dD) => {
    const { db, column, tableName, filter, tables } = this.props;

    const tableHandler = db[tableName];
    if (
      !this.state.limits &&
      tableName &&
      tableHandler?.findOne &&
      !filter?.value?.length
    ) {
      let limits: Limits | undefined;

      if (column.type === "column") {
        limits = (await tableHandler.findOne(
          {},
          {
            select: {
              min: { $min: [column.name] },
              max: { $max: [column.name] },
            },
          },
        )) as Limits | undefined;
      } else {
        const { select } = await getTableSelect(
          { table_name: tableName, columns: column.columns },
          tables,
          db,
          {},
        );
        const _minVal = await tableHandler.findOne(
          {},
          { select, orderBy: { [column.name]: 1 } },
        );
        const _maxVal = await tableHandler.findOne(
          {},
          { select, orderBy: { [column.name]: -1 } },
        );

        if (_minVal && _maxVal) {
          const isNumeric = _PG_numbers.includes(column.udt_name as any);
          const minVal = _minVal[column.name];
          const maxVal = _maxVal[column.name];
          limits = {
            min: isNumeric ? Number(minVal) : minVal,
            max: isNumeric ? Number(maxVal) : maxVal,
          };
        }
      }
      if (!limits) return;
      this.setState({ limits });
      this.setValue(limits);
    }
  };

  setValue = (
    val: { min?: number; max?: number; _val?: number },
    fromUser = false,
  ) => {
    const { column, filter } = this.props;
    let {
      min = filter?.value?.[0],
      max = filter?.value?.[1],
      _val = filter?.value,
    } = val;

    /** Change the other value if needed */
    if (
      min?.toString().length &&
      max?.toString().length &&
      typeof +min === typeof +max &&
      +min > +max
    ) {
      if ("min" in val) {
        max = +min;
      } else {
        min = +max;
      }
    }

    const isDate = colIs(column, "_PG_date");
    if (isDate) {
      min = new Date(min);
      max = new Date(max);
      _val = new Date(_val);
    }

    const type: SimpleFilter["type"] = this.props.filter?.type ?? "$between";
    let value: any = [min, max];

    if (Object.values(val)[0] === ("" as any)) {
    } else if (column.udt_name === "time") {
      if (type === "$between") {
        if (min && max) {
          if (min > max) min = max;
        }
        value = [min, max];
      } else {
        value = _val;
      }
    } else if (_val === null) {
      value = _val;
    } else if (_val && Number.isFinite(+_val)) {
      value = +_val;
    } else if (min && Number.isFinite(+min) && max && Number.isFinite(+max)) {
      if (+min > +max) min = +max;
      value = [+min, +max];
    } else if (min && Number.isFinite(+min) && type === "$between") {
      value = [+min, +min + 1];
    } else if (max && Number.isFinite(+max) && type === "$between") {
      value = [+max - 1, +max];
    } else {
      console.warn("Invalid filter value");

      return;
    }

    if (isDate && value !== null) {
      if (Array.isArray(value)) value = value.map((v) => new Date(v));
      else value = new Date(value);
    }

    const filterIsValid =
      Array.isArray(value) &&
      value.length === 2 &&
      value.every((v) => `${v}`.length && Number.isFinite(+v));

    this.props.onChange({
      fieldName: column.name,
      type,
      value,
      disabled: !filterIsValid,
    });
  };

  render() {
    const { filter, column, type: dataType, inputType } = this.props;

    const type = filter?.type ?? "=";
    const min =
        type === "$between" ? filter?.value?.[0]
        : type === ">=" ? filter?.value
        : null,
      max =
        type === "$between" ? filter?.value?.[1]
        : type === "<=" ? filter?.value
        : null;

    const commonProps = {
      className: "p-p25 mr-p5",
      style: colIs(column, "_PG_date") ? {} : { maxWidth: "125px" },
      inputStyle: { padding: "4px 8px" },
      type: inputType,
      asColumn: true,
    };

    return (
      <FlexRowWrap className="gap-0 f-1 p-p5" style={{ minWidth: "150px" }}>
        <FormFieldDebounced
          {...commonProps}
          value={parseValue(column, min)}
          placeholder="Min"
          onChange={(min) => {
            this.setValue({ min });
          }}
        />
        <FormFieldDebounced
          {...commonProps}
          value={parseValue(column, max)}
          placeholder="Max"
          onChange={(max) => {
            this.setValue({ max });
          }}
        />
      </FlexRowWrap>
    );
  }
}
