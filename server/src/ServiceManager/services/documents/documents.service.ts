import type { ProstglesService } from "../../ServiceManagerTypes";

export const documentsService = {
  icon: "FileDocumentOutline",
  label: "Documents",
  description: "Extract data from documents.",
  port: 5001,
  volumes: {
    "docling-cache": "/app/.cache",
  },
  configs: {
    device: {
      label: "Device",
      description:
        "Select the device for processing. GPU requires CUDA support.",
      defaultOption: "cpu",
      options: {
        cpu: {
          env: {},
          buildArgs: {
            BASE_IMAGE: "quay.io/docling-project/docling-serve:v1.14.0",
          },
        },
        cuda: {
          env: {
            DOCLING_SERVE_ENG_LOC_NUM_WORKERS: "2",
            OMP_NUM_THREADS: "4",
            MKL_NUM_THREADS: "4",
          },
          buildArgs: {
            BASE_IMAGE: "quay.io/docling-project/docling-serve-cu128:v1.14.0",
          },
          gpus: "all",
        },
      },
    },
    ui: {
      label: "Web UI",
      description: "Enable the built-in web interface for testing conversions.",
      defaultOption: "enabled",
      options: {
        enabled: { env: { DOCLING_SERVE_ENABLE_UI: "1" } },
        disabled: { env: { DOCLING_SERVE_ENABLE_UI: "0" } },
      },
    },
  },
  env: {
    DOCLING_SERVE_HOST: "0.0.0.0",
    DOCLING_SERVE_PORT: "5001",
    DOCLING_SERVE_ENABLE_UI: "1",
    DOCLING_SERVE_MAX_SYNC_WAIT: "600",
    DOCLING_SERVE_MAX_DOCUMENT_TIMEOUT: "600",
  },
  healthCheck: { endpoint: "/health" },
  endpoints: {
    "/": {
      method: "GET",
      inputSchema: undefined,
      description: "Service info endpoint",
      outputSchema: {
        type: "string",
      },
    },
    "/ui": {
      method: "GET",
      inputSchema: undefined,
      description: "Interactive web interface for document conversion",
      outputSchema: {
        type: "string",
      },
    },
    "/v1/convert/source": {
      method: "POST",
      description: "Convert a document from a URL",
      inputSchema: {
        type: {
          sources: {
            arrayOf: {
              oneOfType: [
                {
                  kind: { enum: ["http"] },
                  headers: {
                    optional: true,
                    record: {
                      values: "string",
                    },
                  },
                  url: "string",
                },
                {
                  kind: { enum: ["s3"] },
                  endpoint: "string",
                  verify_ssl: { type: "boolean", optional: true },
                  access_key: "string",
                  secret_key: "string",
                  bucket: "string",
                  key_prefix: "string",
                },
                {
                  kind: { enum: ["file"] },
                  filename: "string",
                  base64_string: "string",
                },
              ],
            },
          },
          file_sources: {
            optional: true,
            arrayOfType: {
              filename: "string",
              base64_string: "string",
            },
          },
          options: {
            optional: true,
            type: {
              from_formats: {
                optional: true,
                type: "string[]",
                allowedValues: [
                  "docx",
                  "pptx",
                  "html",
                  "image",
                  "pdf",
                  "asciidoc",
                  "md",
                  "csv",
                  "xlsx",
                  "xml_uspto",
                  "xml_jats",
                  "xml_xbrl",
                  "mets_gbs",
                  "json_docling",
                  "audio",
                  "vtt",
                  "latex",
                ],
              },
              to_formats: {
                optional: true,
                type: "string[]",
                allowedValues: [
                  "md",
                  "json",
                  "yaml",
                  "html",
                  "html_split_page",
                  "text",
                  "doctags",
                ],
              },
              /**
               * Image export mode for the document (in case of JSON, Markdown or HTML). Allowed values: placeholder, embedded, referenced. Optional, defaults to Embedded.
               */
              image_export_mode: {
                optional: true,
                enum: ["placeholder", "embedded", "referenced"],
              },
              do_ocr: {
                optional: true,
                type: "boolean",
              },
              force_ocr: {
                optional: true,
                type: "boolean",
              },
              ocr_engine: {
                optional: true,
                enum: [
                  "auto",
                  "easyocr",
                  "ocrmac",
                  "rapidocr",
                  "tesserocr",
                  "tesseract",
                  "easyocr",
                ],
              },
              ocr_lang: {
                optional: true,
                type: "string[]",
              },
              pdf_backend: {
                optional: true,
                enum: [
                  "pypdfium2",
                  "docling_parse",
                  "dlparse_v1",
                  "dlparse_v2",
                  "dlparse_v4",
                  "docling_parse",
                ],
              },
              table_mode: {
                optional: true,
                enum: ["fast", "accurate"],
              },
              document_timeout: {
                optional: true,
                type: "number",
                description:
                  "The timeout for processing each document, in seconds.",
              },
            },
          },
        },
      },
      outputSchema: {
        type: {
          document: {
            type: {
              filename: { oneOf: ["string", { enum: [null] }] },
              md_content: { oneOf: ["string", { enum: [null] }] },
              json_content: "any",
              html_content: { oneOf: ["string", { enum: [null] }] },
              text_content: { oneOf: ["string", { enum: [null] }] },
              doctags_content: { oneOf: ["string", { enum: [null] }] },
            },
          },
          status: {
            enum: [
              "pending",
              "started",
              "failure",
              "success",
              "partial_success",
              "skipped",
            ],
          },
          errors: "any[]",
        },
      },
    },
    "/health": {
      method: "GET",
      description: "Health check response",
      inputSchema: undefined,
      outputSchema: {
        type: {
          status: {
            type: "string",
            allowedValues: ["healthy"],
          },
        },
      },
    },
  },
} as const satisfies ProstglesService;
