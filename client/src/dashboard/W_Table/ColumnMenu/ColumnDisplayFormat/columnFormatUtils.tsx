import type {
  AnyObject,
  DBSchemaTable,
  JSONB,
  ValidatedColumnInfo,
} from "prostgles-types";
import React from "react";
import { MediaViewer, ContentTypes } from "../../../../components/MediaViewer";
import { QRCodeImage } from "../../../../components/QRCodeImage";
import SmartFormField from "../../../SmartForm/SmartFormField/SmartFormField";
import type { RenderedColumn } from "../../tableUtils/onRenderColumn";
import sanitizeHtml from "sanitize-html";
import type { ColumnConfig } from "../ColumnMenu";
import { StyledInterval } from "../../../W_SQL/customRenderers";
import { getAge } from "../../../../../../commonTypes/utils";

const CurrencySchema = {
  type: {
    title: "Format",
    enum: ["Currency"],
    description: "With currency symbol",
  },
  params: {
    oneOfType: [
      {
        type: { enum: ["Fixed"], title: "Type" },
        currencyCode: {
          type: "string",
          title: "Currency code",
          description: "EUR, GBP, USD, etc...",
        },
      },
      {
        type: { enum: ["From column"], title: "Type" },
        currencyCodeField: {
          // enum: ["c"],
          lookup: {
            type: "schema",
            object: "column",
            filter: { tsDataType: "string", table: "" },
          },
          title: "Currency Field",
          description:
            "Column containint the currency code (EUR, GBP, USD, etc...)",
        },
      },
    ],
  },
} as const satisfies JSONB.ObjectType["type"];

const MediaSchema = {
  type: {
    enum: ["Media"],
    title: "Format",
    description: "Display media (video/image/audio) from URL",
  },
  params: {
    oneOfType: [
      {
        type: {
          enum: ["fixed"],
          description: "Fixed",
        },
        fixedContentType: {
          type: "string",
          title: "Fixed content type",
          allowedValues: ContentTypes,
          optional: true,
        },
      },
      {
        type: {
          enum: ["fromColumn"],
          description: "From column",
        },
        contentTypeColumnName: {
          title: "MIME column",
          description:
            "Column that contains valid extesion values (img, mp4, mp3, ...)",
          optional: true,
          lookup: {
            type: "schema",
            object: "column",
            filter: {
              tsDataType: "string",
              table: "",
            },
          },
        },
      },
      {
        type: {
          enum: ["fromUrlEnding"],
          description: "From URL Extension",
        },
      },
    ],
  },
} as const satisfies JSONB.JSONBSchema["type"];

const tryParseNumber = (v) => {
  if (typeof v === "string" && v.length && Number.isFinite(+v)) {
    return +v;
  }
  return v;
};

export const ColumnFormatSchema = {
  title: "Display format",
  description: "Control how data is displayed",
  oneOfType: [
    {
      type: {
        enum: ["NONE"],
        title: "Format",
        description: "Display data as is. Default",
      },
    },
    {
      type: {
        enum: ["URL"],
        title: "Format",
        description: "Clickable URL",
      },
    },
    {
      type: {
        enum: ["Email"],
        title: "Format",
        description: "Email link",
      },
    },
    {
      type: {
        enum: ["Tel"],
        title: "Format",
        description: "Telephone number link",
      },
    },
    {
      type: {
        enum: ["QR Code"],
        title: "Format",
        description: "Display a URL as an image",
      },
    },
    CurrencySchema,
    {
      type: {
        enum: ["UNIX Timestamp"],
        title: "Format",
        description: "Display unix timestamp as datetime",
      },
    },
    {
      type: {
        enum: ["Age"],
        title: "Format",
        description: "Display time difference between now and the value",
      },
      params: {
        type: {
          variant: {
            title: "Variant",
            optional: false,
            oneOfType: [
              {
                type: {
                  title: "Variant",
                  enum: ["short"],
                  description: "Show top two biggest units",
                },
              },
              {
                type: {
                  title: "Variant",
                  enum: ["full"],
                  description: "Show all age units",
                },
              },
            ],
          },
        },
      },
    },
    {
      type: {
        enum: ["HTML"],
        title: "Format",
        description: "Display string as sanitised HTML",
      },
      params: {
        type: {
          noSanitize: {
            type: "boolean",
            title: "Do not sanitize HTML",
            description: "Leave unchecked if you understand the risks",
            optional: true,
          },
          allowedHTMLTags: {
            title: "Allowed HTML Tags",
            type: "string[]",
            allowedValues: [
              { key: "img", label: "Image" },
              { key: "video", label: "Video" },
              { key: "audio", label: "Audio" },
              { key: "svg", label: "SVG" },
              { key: "apth", label: "Path (SVG)" },
            ].map((v) => v.key),
            description: "List of allowed HTML tags. E.g.: div, p, html",
            optional: true,
          },
        },
      },
    },
    MediaSchema,
  ],
} as const satisfies JSONB.JSONBSchema;

export type ColumnFormat = JSONB.GetSchemaType<typeof ColumnFormatSchema>;

type ColumnRenderer = {
  type: ColumnFormat["type"];
  tsDataType: ValidatedColumnInfo["tsDataType"][] | undefined;
  match?: (table: DBSchemaTable, column: ColumnConfig) => boolean | undefined;
  render: (
    value: any,
    row: AnyObject,
    c: RenderedColumn,
    format: ColumnFormat,
    maxCellChars: number,
  ) => any;
};

type FormattedColRender<F extends ColumnFormat> = Pick<
  ColumnRenderer,
  "match"
> & {
  type: F["type"];
  tsDataType: ValidatedColumnInfo["tsDataType"][] | undefined;
  render: (
    value: any,
    row: AnyObject,
    c: RenderedColumn,
    format: F,
    maxCellChars: number,
  ) => any;
};

const removeQuotes = (value: string | number | null) => {
  const v = (value ?? "").toString();
  return (
      ["'", '"'].includes(v.at(0) ?? "") && ["'", '"'].includes(v.at(-1) ?? "")
    ) ?
      v.slice(1, -1)
    : v;
};

const HREFRender: FormattedColRender<any>["render"] = (v, r, c) => (
  <a
    href={
      (c.format?.type === "Email" ? "mailto:"
      : c.format?.type === "Tel" ? "tel:"
      : "") + removeQuotes(v)
    }
    target="_blank"
  >
    {removeQuotes(v)}
  </a>
);

export const DISPLAY_FORMATS = [
  {
    type: "NONE",
    tsDataType: undefined,
    render: (v) => {
      return v;
    },
  } satisfies FormattedColRender<Extract<ColumnFormat, { type: "NONE" }>>,
  {
    type: "Email",
    tsDataType: ["string"],
    render: HREFRender,
  } satisfies FormattedColRender<Extract<ColumnFormat, { type: "Email" }>>,
  {
    type: "Tel",
    tsDataType: undefined,
    render: HREFRender,
  } satisfies FormattedColRender<Extract<ColumnFormat, { type: "Tel" }>>,
  {
    type: "Media",
    tsDataType: ["string"],
    render: (v, row, c, f) => {
      const mediaFormat = f; // ?? { params: {} } as Extract<ColumnFormat, { type: "Media" }>;
      const params = mediaFormat.params as any;
      return (
        <MediaViewer
          url={v}
          content_type={
            params.type === "fixed" ? (params.fixedContentType ?? "image")
            : params.type === "fromColumn" && params.contentTypeColumnName ?
              row[params.contentTypeColumnName]
            : undefined
          }
          // onPrevOrNext={!allowMediaSkip ? undefined : (increment) => {
          //   console.error("MUST HAVE A PARENT VIEWER MANAGING NEXT AND PREV URLS")
          //   const requestedRow = data?.[rowIndex + increment];
          //   return { url: requestedRow?.[c.name] };
          // }}
        />
      );
    },
  } satisfies FormattedColRender<Extract<ColumnFormat, { type: "Media" }>>,
  {
    type: "URL",
    tsDataType: ["string"],
    match: (t, c) =>
      t.info.isFileTable && ["cloud_url", "signed_url"].includes(c.name),
    render: HREFRender,
  } satisfies FormattedColRender<Extract<ColumnFormat, { type: "URL" }>>,
  {
    type: "QR Code",
    tsDataType: ["string"],
    render: (v, r, c, p, maxCellChars) => {
      // Using "90px" because default max row height is 100px
      return v?.toString().trim().length ?
          <QRCodeImage url={v} size={90} variant="table-cell" />
        : SmartFormField.renderValue(c, v, undefined, maxCellChars);
    },
  } satisfies FormattedColRender<Extract<ColumnFormat, { type: "QR Code" }>>,
  {
    type: "HTML",
    tsDataType: ["string"],
    render: (v, c, rc, p) => {
      return (
        <div
          className="relative min-w-0 min-h-0"
          dangerouslySetInnerHTML={{
            __html:
              c.noSanitize ?
                (v ?? "")
              : sanitizeHtml(v, {
                  allowedTags: sanitizeHtml.defaults.allowedTags.concat(
                    p.params.allowedHTMLTags ?? [],
                  ),
                  parser: { lowerCaseAttributeNames: false },
                }),
          }}
        />
      );
    },
  } satisfies FormattedColRender<Extract<ColumnFormat, { type: "HTML" }>>,
  {
    type: "UNIX Timestamp",
    tsDataType: ["number", "string"],
    render: (v) => {
      if (v && (+v).toString() == v) {
        try {
          return SmartFormField.renderValue(
            { tsDataType: "string", udt_name: "timestamp" },
            new Date().toISOString(),
          );
        } catch (e) {
          console.error("Failed to render field as a unix timestamp");
        }
      }

      return v;
    },
  } satisfies FormattedColRender<
    Extract<ColumnFormat, { type: "UNIX Timestamp" }>
  >,
  {
    type: "Age",
    tsDataType: ["string", "number"],
    render: (v, c, rc, p) => {
      if (v) {
        const age = getAge(+new Date(v), Date.now(), true);
        return <StyledInterval value={age} mode={p.params.variant.type} />;
      }

      return v;
    },
  } satisfies FormattedColRender<Extract<ColumnFormat, { type: "Age" }>>,
  {
    type: "Currency",
    tsDataType: ["number", "string"],
    render: (rawValue: any, row, c, { params: { type, ...p } }: any) => {
      const v = tryParseNumber(rawValue);
      if (!Number.isFinite(v) || (!p.currencyCodeField && !p.currencyCode)) {
        return v;
      }

      try {
        const currencyCode =
          type === "Fixed" ? p.currencyCode : row[p.currencyCodeField.column];
        const formatter = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currencyCode,

          // These options are needed to round to whole numbers if that's what you want.
          //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
          //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
        });

        return formatter.format(v); // $2,500.00
      } catch (error) {
        console.warn("Failed to render as currency:", { ...p, error });
      }

      return v;
    },
  } satisfies FormattedColRender<Extract<ColumnFormat, { type: "Currency" }>>,
] as ColumnRenderer[];

export function getFormatOptions(
  colInfo?: Partial<Pick<ValidatedColumnInfo, "udt_name" | "tsDataType">>,
): ColumnRenderer[] {
  if (!colInfo) return [];

  return DISPLAY_FORMATS.filter(
    (r) => !r.tsDataType || r.tsDataType.includes(colInfo.tsDataType as any),
  );
}
