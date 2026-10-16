import { documentsServiceInputSchema } from "@common/mcp/documentsServiceInputSchema";
import { documentsServiceOutputSchema } from "@common/documentsServiceOutputSchema";
import type { ProstglesService } from "@src/ServiceManager/ServiceManagerTypes";
import type { JSONB } from "prostgles-types";

const port = 5001;

export const documentsService = {
  icon: "FileDocumentOutline",
  label: "Docling",
  description: `Convert documents and images to structured data using [Docling](https://www.docling.ai/). Check [UI](http://localhost:${port}/ui/), [API docs](http://localhost:${port}/docs), and [OpenAPI schema](http://localhost:${port}/openapi.json) for more information.`,
  port,
  openApiEndpoint: "/openapi.json",
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
            BASE_IMAGE: "quay.io/docling-project/docling-serve:v1.34.0",
          },
        },
        cuda: {
          env: {
            DOCLING_SERVE_ENG_LOC_NUM_WORKERS: "1",
            DOCLING_SERVE_NUM_WORKERS: "2",
            OMP_NUM_THREADS: "4",
            MKL_NUM_THREADS: "4",
          },
          buildArgs: {
            BASE_IMAGE: "quay.io/docling-project/docling-serve-cu128:v1.34.0",
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
    DOCLING_DEBUG_PROFILE_PIPELINE_TIMINGS: "true",
  },
  healthCheck: { endpoint: "/health" },
  endpoints: {
    "/ui": {
      method: "GET",
      inputSchema: undefined,
      description: "Interactive web interface for document conversion",
      openApi: false,
      outputSchema: {
        type: "string",
      },
    },
    "/v1/convert/file": {
      method: "POST",
      description: "Convert a document from a file",
      inputSchema: {
        type: {
          files: "Blob[]",
          // files: {
          //   type: "FileLike[]",
          //   mimeTypes: { "application/pdf": 1 },
          // },
          ...documentsServiceInputSchema.type,
        },
      },
      inputType: "FormData",
      outputSchema: documentsServiceOutputSchema,
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
              ],
            },
          },
          options: documentsServiceInputSchema,
        },
      },
      outputSchema: documentsServiceOutputSchema,
    },
    "/health": {
      method: "GET",
      description: "Health check response",
      inputSchema: undefined,
      outputSchema: {
        type: {
          status: "string",
        },
      },
    },
  },
} as const satisfies ProstglesService;

/**
 * TODO: JSONB schema should allow default values
 */
export const CONVERT_DOCUMENT_DEFAULT_OPTIONS = {
  ocr_engine: "auto", // Important for better accuracy
  image_export_mode: "placeholder",
  to_formats: ["md"],
  // images_scale: 4.17, // last thing to improve OCR accuracy. for ~300 DPI
} as const satisfies Partial<JSONB.GetType<typeof documentsServiceInputSchema>>;
