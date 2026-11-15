import { getKeys, type JSONB } from "prostgles-types";
import {
  actionColumnParamsSchema,
  actionColumnsParamsSchema,
} from "./actionColumn";
import { HTML_COLUMN_ALLOWED_STYLES } from "./htmlColumnStyles";

export const ContentTypes = ["image", "video", "audio"] as const;

export const HTML_COLUMN_ALLOWED_TAGS = [
  "div",
  "span",
  "p",
  "br",
  "hr",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "small",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "table",
  "caption",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
];

const CurrencySchema = {
  type: {
    title: "Format",
    enum: ["Currency"],
    description: "With currency symbol",
  },
  params: {
    oneOfType: [
      {
        mode: { enum: ["Fixed"], title: "Type" },
        metricPrefix: {
          type: "boolean",
          title: "Use Metric Prefix",
          optional: true,
        },
        currencyCode: {
          type: "string",
          title: "Currency code",
          description: "EUR, GBP, USD, etc...",
        },
      },
      {
        mode: { enum: ["From column"], title: "Type" },
        metricPrefix: {
          type: "boolean",
          title: "Use Metric Prefix",
          optional: true,
        },
        currencyCodeField: {
          type: "string",
          title: "Currency Field",
          description:
            "Column containing the currency code (EUR, GBP, USD, etc...)",
        },
      },
    ],
  },
} as const; // satisfies JSONB.ObjectType["type"];

const MediaSchema = {
  type: {
    enum: ["Media"],
    title: "Format",
    description: "Display media (video/image/audio) from URL",
  },
  params: {
    type: {
      contentType: {
        optional: true,
        title: "Content type",
        oneOfType: [
          {
            mode: {
              enum: ["Auto"],
              title: "Auto detect from URL and headers (default)",
            },
          },
          {
            mode: { enum: ["Fixed"], title: "Fixed" },
            fixedContentType: {
              type: "string",
              title: "Fixed content type",
              allowedValues: ContentTypes,
            },
          },
          {
            mode: { enum: ["From column"], title: "From column" },
            contentTypeColumnName: {
              title: "MIME column",
              type: "string",
              description:
                "Column that contains valid extension values (img, mp4, mp3, ...)",
            },
          },
          {
            mode: {
              enum: ["From URL Extension"],
              title: "From URL Extension (e.g. .png, .mp4)",
            },
          },
        ],
      },
      titleColumn: {
        optional: true,
        type: "string",
        title: "Title column",
      },
    },
  },
} as const; // satisfies JSONB.JSONBSchema["type"];

export const columnDisplayFormatSchema = {
  title: "Display format",
  description: "Control how data is displayed",
  oneOfType: [
    {
      type: { enum: ["ActionColumns"], title: "Format" },
      params: { type: actionColumnsParamsSchema },
    },
    {
      type: { enum: ["Action"], title: "Format" },
      params: {
        type: actionColumnParamsSchema,
      },
    },
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
      params: {
        optional: true,
        type: {
          urlColumn: {
            type: "string",
            optional: true,
            title: "URL column",
            description:
              "Use another column as the URL, keeping this column as the link text. Leave unset to use this column's value as the URL.",
          },
          linkText: {
            type: "string",
            optional: true,
            title: "Link text",
            description:
              "Fixed text to display for every link. Leave empty to use this column's value.",
          },
        },
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
        enum: ["Avatar"],
        title: "Format",
        description: "Name initials in a circle. Set colors in column styles.",
      },
      params: {
        optional: true,
        type: {
          firstNameColumn: {
            type: "string",
            optional: true,
            title: "First name column",
            description:
              "Leave name columns unset to use this column's full name.",
          },
          lastNameColumn: {
            type: "string",
            optional: true,
            title: "Last name column",
          },
        },
      },
    },
    {
      type: {
        enum: ["Metric Prefix"],
        title: "Format",
        description: "Display large numbers with metric prefixes (e.g. 1.2K)",
      },
    },
    {
      type: {
        enum: ["File size"],
        title: "Format",
        description: "Display bytes as a readable file size (e.g. 1.25 MB)",
      },
    },
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
        optional: true,
        type: {
          variant: {
            title: "Variant",
            description: "Short shows top two biggest units",
            enum: ["short", "full"],
          },
          showTimestamp: {
            type: "boolean",
            title: "Show timestamp",
            description: "Show the date and time above the age",
            optional: true,
          },
          showAgo: {
            type: "boolean",
            title: "Show ago",
            description:
              'Add "ago" for past timestamps or "in" for future timestamps',
            optional: true,
          },
        },
      },
    },
    {
      type: {
        enum: ["Stopwatch"],
        title: "Format",
        description:
          "Elapsed time between two timestamps. Ticks while the finish timestamp is null.",
      },
      params: {
        type: {
          startColumn: { type: "string", title: "Start column" },
          endColumn: { type: "string", title: "Finish column" },
        },
      },
    },
    {
      type: {
        enum: ["Markdown", "MarkdownPopup"],
        title: "Format",
        description: "Display string as Markdown",
      },
    },
    {
      type: {
        enum: ["JSON Summary"],
        title: "Format",
        description: "Show a JSON value as a button that opens the full JSON",
      },
      params: {
        type: {
          path: {
            type: "string[]",
            title: "JSON path",
            description:
              "Property names or array indexes, in order. For registration.type, use type. Leave empty to show View JSON.",
          },
        },
      },
    },
    {
      type: {
        enum: ["JSON Diff", "Text Diff"],
        title: "Format",
        description: "Compare JSON or plain text values from two columns",
      },
      params: {
        type: {
          oldColumn: "string",
          newColumn: "string",
        },
      },
    },
    {
      type: {
        enum: ["DoclingDocument"],
        title: "Format",
        description: "Renders a Docling parsed document",
      },
    },
    {
      type: {
        enum: ["Logs"],
        title: "Format",
        description: "Renders a log viewer for text data",
      },
    },
    {
      type: {
        enum: ["HTML"],
        title: "Format",
        description: `Display the column value as basic sanitised HTML. Allowed tags: ${HTML_COLUMN_ALLOWED_TAGS.join(", ")}. Only the style attribute is allowed, with these CSS properties: ${getKeys(HTML_COLUMN_ALLOWED_STYLES).join(", ")}. Colours accept names, hex, rgb/rgba and hsl/hsla. Lengths accept non-negative px (up to 999.99), em/rem (up to 9.99); sizing also accepts whole percentages up to 100%. Spacing and borders also accept 2-4 whole px values. Content is clipped to its container. Positioning, transforms, URLs, custom properties, scripts, style tags, links, media, SVG, forms and embeds are not supported. Sanitisation cannot be disabled. No parameters are needed.`,
      },
    },
    MediaSchema,
  ],
} as const;

export type UserColumnFormat = JSONB.GetSchemaType<
  typeof columnDisplayFormatSchema
>;
