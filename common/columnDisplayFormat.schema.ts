export const ContentTypes = ["image", "video", "audio"] as const;

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
            "Column containint the currency code (EUR, GBP, USD, etc...)",
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
    optional: true,
    oneOfType: [
      {
        type: {
          title: "Content type",
          enum: ["Auto"],
          description: "Auto detect from URL and headers (default)",
        },
      },
      {
        type: {
          title: "Content type",
          enum: ["Fixed"],
          description: "Fixed",
        },
        fixedContentType: {
          type: "string",
          title: "Fixed content type",
          allowedValues: ContentTypes,
        },
      },
      {
        type: {
          title: "Content type",
          enum: ["From column"],
          description: "From column",
        },
        contentTypeColumnName: {
          title: "MIME column",
          type: "string",
          description:
            "Column that contains valid extesion values (img, mp4, mp3, ...)",
        },
      },
      {
        type: {
          title: "Content type",
          enum: ["From URL Extension"],
          description: "From URL Extension (e.g. .png, .mp4)",
        },
      },
    ],
  },
} as const; // satisfies JSONB.JSONBSchema["type"];

export const columnDisplayFormatSchema = {
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
        enum: ["Metric Prefix"],
        title: "Format",
        description: "Display large numbers with metric prefixes (e.g. 1.2K)",
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
              { key: "path", label: "Path (SVG)" },
            ].map((v) => v.key),
            description: "List of allowed HTML tags. E.g.: div, p, html",
            optional: true,
          },
        },
      },
    },
    MediaSchema,
  ],
} as const;
