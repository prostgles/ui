import { sliceText } from "@common/utils";
import type { LocalMedia } from "@components/FileInput/FileInput";
import { ShorterText } from "@components/ShorterText";
import type { ValidatedColumnInfo } from "prostgles-types";
import { _PG_date, _PG_numbers, includes, isObject } from "prostgles-types";
import React from "react";
import { dateAsYMD_Time } from "../../Charts";
import { getPGIntervalAsText } from "../../W_SQL/customRenderers";

type P = {
  column:
    | Pick<ValidatedColumnInfo, "udt_name" | "tsDataType" | "file">
    | undefined;
  value: any;
  /**
   * Defaults to true
   */
  showTitle?: boolean;
  maxLength?: number;
  maximumFractionDigits?: number;
  getValues?: () => any[];
  style?: React.CSSProperties;
};
export const renderNull = (
  v: any,
  style: React.CSSProperties | undefined,
  showTitle: boolean,
) => {
  if ([null, undefined].includes(v)) {
    return (
      <i
        style={style}
        className="text-2  noselect"
        title={showTitle ? "NULL" : undefined}
      >
        NULL
      </i>
    );
  }

  return null;
};

export const RenderValue = ({
  column: c,
  value,
  showTitle = true,
  maxLength,
  style,
  maximumFractionDigits = 3,
  getValues,
}: P): JSX.Element => {
  const nullRender = renderNull(value, style, showTitle);
  if (nullRender) return nullRender;
  const getSliced = (v: string | null | undefined, _maxLength?: number) => {
    const nullRender = renderNull(v, style, showTitle);
    if (nullRender) return nullRender;
    if (maxLength) return sliceText(v?.toString(), _maxLength ?? maxLength);

    return v;
  };

  if (c?.file && isObject(value)) {
    const media = value as LocalMedia;
    return <div>{media.name}</div>;
  }

  if (c?.udt_name === "uuid" && value) {
    return <ShorterText style={style} value={value} column={c} />;
  }

  const numericStyle = {
    /* Align numbers to right for an easier read */
    textAlign: "right",
  } as const;

  const { udt_name, tsDataType } = c ?? {};
  if (tsDataType !== "number" && udt_name === "int8") {
    return (
      <span
        style={{
          color: getColumnDataColor({ udt_name: "int4", tsDataType: "number" }),
          ...numericStyle,
          ...style,
        }}
      >
        {BigInt(value).toLocaleString()}
      </span>
    );
  }

  if (
    // tsDataType === "number" &&
    udt_name &&
    includes(_PG_numbers, udt_name) &&
    value !== undefined &&
    value !== null
  ) {
    const maxDecimalsFromValues = getValues?.()
      ?.map((v) => {
        if (v === null || v === undefined) return 0;
        const num = +v;
        if (isNaN(num)) return 0;
        return countDecimals(num);
      })
      .reduce((a, b) => Math.max(a, b), 0);
    const getValue = () => {
      const isFloat =
        udt_name === "float4" ||
        udt_name === "float8" ||
        udt_name === "numeric";
      if (!isFloat) return +value;
      const actualDecimals = countDecimals(+value);
      const maxDecimals =
        +value < 1 && +value > -1 ? actualDecimals + 1 : maximumFractionDigits;
      const slicedValue = getSliced(
        (+value).toLocaleString(undefined, {
          minimumFractionDigits:
            maxDecimalsFromValues ?? Math.min(maxDecimals, actualDecimals),
        }),
      );
      return slicedValue;
    };

    return (
      <span
        title={value}
        style={{ color: getColumnDataColor(c), ...numericStyle, ...style }}
      >
        {getValue()}
      </span>
    );
  }
  if (c?.udt_name === "interval") {
    return <>{getPGIntervalAsText(value)}</>;
  }

  if (value && ["geography", "geometry"].includes(c?.udt_name ?? "")) {
    if (typeof value === "object" && !Array.isArray(value)) {
      return <>{getSliced(JSON.stringify(value))}</>;
    }
    return <ShorterText style={style} value={value} column={c} />;
  }

  if (value && _PG_date.some((v) => v === c?.udt_name)) {
    let val = value;

    if (c?.udt_name !== "timestamp") {
      try {
        const date = new Date(value);
        val =
          dateAsYMD_Time(date) +
          "." +
          date.getMilliseconds().toString().padStart(3, "0");
      } catch (e) {
        console.error(e);
      }
    }

    return (
      <span style={{ color: getColumnDataColor(c), ...style }}>{val}</span>
    );
  }

  if (value && (c?.udt_name.startsWith("json") || isObject(value))) {
    return (
      <span style={{ color: getColumnDataColor(c), ...style }}>
        {getSliced(JSON.stringify(value))}
      </span>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span
        style={{
          color: getColumnDataColor({
            ...c,
            tsDataType: "boolean",
            udt_name: "bool",
          }),
          ...style,
        }}
      >
        {value.toString()}
      </span>
    );
  }
  if (typeof value === "string") {
    if (value === "")
      return (
        <i
          style={style}
          className="text-2 noselect"
          title={showTitle ? "&quot;&quot;" : undefined}
        >
          Empty String
        </i>
      );
    return <>{getSliced(value)}</>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex-row-wrap gap-p25">
        {value.map((v, i) => (
          <span key={i} className="chip gray font-14" style={style}>
            {getSliced(v)}
          </span>
        ))}
      </div>
    );
  }

  return <>{getSliced(value)}</>;
};

const countDecimals = (num: number) => {
  if (Math.floor(num.valueOf()) === num.valueOf()) return 0;
  return num.toString().split(".")[1]?.length || 0;
};

export const getColumnDataColor = (
  c?: Pick<Partial<ValidatedColumnInfo>, "udt_name" | "tsDataType" | "is_pkey">,
  fallBackColor?: string,
) => {
  if (c?.udt_name === "uuid" || c?.is_pkey) {
    return "var(--color-uuid)";
  }

  if (c?.udt_name === "geography" || c?.udt_name === "geometry") {
    return "var(--color-geo)";
  }

  if (
    c?.udt_name === "json" ||
    c?.udt_name === "jsonb" ||
    c?.tsDataType === "any"
  ) {
    return "var(--color-json)";
  }

  if (_PG_date.some((v) => v === c?.udt_name)) {
    return "var(--color-date)";
  }

  if (c && _PG_numbers.includes(c.udt_name as any)) {
    return "var(--color-number)";
  }

  const TS_COL_TYPE_TO_COLOR = {
    number: "var(--color-number)",
    boolean: "var(--color-boolean)",
  } as const;

  return (
    (c?.tsDataType ? TS_COL_TYPE_TO_COLOR[c.tsDataType] : undefined) ??
    fallBackColor
  );
};
