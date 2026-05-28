import { documentsServiceInputSchemaMcpOptions } from "./documentsServiceInputSchema";
export const webMcpSchema = {
  fetch: {
    description:
      "Fetches content from a URL, with optional conversion for documents",
    schema: {
      type: {
        url: {
          type: "string",
          description: "URL of the content to fetch",
        },
        mode: {
          enum: ["raw", "convert"],
          optional: true,
          description:
            "Defaults to raw. raw = fetch raw content without conversion. convert = attempt document conversion if the URL points to a document. Supported formats include txt, pdf, docx, pptx, jpg, png, and more.",
        },
        headers: {
          optional: true,
          record: {
            values: "string",
          },
        },
        start_index: {
          type: "integer",
          optional: true,
          description:
            "Starting index for slicing the fetched content. Defaults to 0.",
        },
        max_length: {
          type: "integer",
          optional: true,
          description:
            "Maximum length of the returned content slice. Defaults to returning the full content.",
        },
        timeout: {
          type: "integer",
          optional: true,
          description:
            "Maximum time in milliseconds to wait for the fetch operation. Defaults to 15000 (15 seconds).",
        },
      },
    },
    outputSchema: {
      type: "string",
    },
  },
  websearch: {
    description:
      "Performs a web search and return results. Powered by [SearXNG](https://docs.searxng.org/)",
    schema: {
      type: {
        q: {
          type: "string",
          description:
            'The search query. This string is passed to external search services. Supports service-specific syntax (e.g., "site:github.com SearXNG" for Google)',
        },
        categories: {
          type: "string",
          optional: true,
          description:
            " Comma-separated list of active search categories. Categories to search in (e.g., 'general,images,videos')",
        },
        engines: {
          type: "string",
          optional: true,
          description:
            "Comma-separated list of active search engines (e.g., 'google,bing,duckduckgo')",
        },
        language: {
          type: "string",
          optional: true,
          description:
            "Language code for the search results (e.g., 'en' for English, 'fr' for French)",
        },
        pageno: {
          type: "integer",
          optional: true,
          description: "Search result page number. Defaults to 1.",
        },
        time_range: {
          enum: ["day", "month", "year"],
          optional: true,
          description:
            "Time range filter for results ('day' = past day, 'month' = past month, 'year' = past year). Only supported by engines that implement time range filtering",
        },
      },
    },
    outputSchema: {
      arrayOfType: {
        title: "string",
        content: "string",
        url: "string",
        score: "number",
        category: "string",
        engine: "string",
        img_src: "string",
        thumbnail: "any",
        template: { optional: true, type: "any" },
        publishedDate: { optional: true, type: "any" },
        parsed_url: { optional: true, type: "any" },
        priority: { optional: true, type: "any" },
        engines: { optional: true, type: "any" },
        positions: { optional: true, type: "any" },
        pubdate: { optional: true, type: "any" },
      },
    },
  },
  get_snapshot: {
    description: "Get a snapshot of a web page",
    schema: {
      type: {
        url: {
          type: "string",
          description: "URL of the web page to snapshot",
        },
      },
    },
    outputSchema: {
      type: "string",
    },
  },
  get_document_text: {
    description: "Get text contents of a document",
    schema: {
      type: {
        ...documentsServiceInputSchemaMcpOptions,
        url: {
          type: "string",
        },
      },
    },
    outputSchema: {
      type: "string",
    },
  },
} as const;

const internalNetworkSubnets = [
  "127.0.0.1/32", // localhost IPv4
  "::1/128", // localhost IPv6

  // RFC1918 private ranges
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",

  // Carrier-grade NAT
  "100.64.0.0/10",

  // Link-local
  "169.254.0.0/16",
  "fe80::/10",

  // Unique local IPv6
  "fc00::/7",

  // Multicast
  "224.0.0.0/4",
  "ff00::/8",

  // Reserved / unspecified
  "0.0.0.0/8",
  "::/128",

  // Benchmarking / documentation
  "192.0.2.0/24",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "2001:db8::/32",
];

export const webMcpConfigSchema = {
  access: {
    renderWithComponent: "WebMcpConfig",
    type: {
      mode: {
        enum: ["allow", "deny", "unrestricted"],
        description:
          "Access control mode. 'allow' means only URLs matching the patterns in 'hosts' are allowed. 'deny' means URLs matching the patterns are blocked. 'unrestricted' means no URL filtering or blockedSubnet check is applied.",
      },
      urlPatterns: {
        type: "string[]",
        description:
          "Patterns can be simple substrings (e.g., 'example.com') or wildcard patterns (e.g., '*.example.com'). The 'mode' field determines whether these patterns define allowed URLs or blocked URLs.",
      },
      blockInternalSubnets: {
        type: "boolean",
        optional: true,
        description:
          "If true, the server will block requests to IP addresses in common internal subnets (e.g., localhost, private network ranges) in addition to any user-defined blocked subnets. Defaults to true.",
      },
      internalSubnets: {
        optional: true,
        type: "string[]",
        description: "Optional list of IP subnets in CIDR notation",
      },
    },
    defaultValue: {
      mode: "deny",
      urlPatterns: [],
      blockInternalSubnets: true,
      internalSubnets: internalNetworkSubnets,
    },
  },
} as const;

export const GOOGLE_FAVICON_ENDPOINT = "https://www.google.com/s2/favicons";
export const GOOGLE_FAVICON_ENDPOINT_REDIRECT = "https://*.gstatic.com/";
