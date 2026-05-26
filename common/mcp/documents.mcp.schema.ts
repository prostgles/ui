import {
  documentsServiceInputSchema,
  documentsServiceInputSchemaMcpOptions,
} from "./documentsServiceInputSchema";

export const CONVERTABLE_DOCUMENT_TYPES = [
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
] as const;
export const CONVERTABLE_IMAGE_TYPES = [
  // Images
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/bmp",
  "image/webp",
] as const;

export const documentsMcpSchema = {
  get_document_text: {
    mode: undefined,
    description:
      "Converts documents/images into structured data. Supported formats: txt, pdf, docx, pptx, jpg, png, and more. Powered by [docling](https://www.docling.ai/).",
    schema: {
      type: {
        fileAsBase64: "string",
        contentType: {
          enum: [...CONVERTABLE_DOCUMENT_TYPES, ...CONVERTABLE_IMAGE_TYPES],
        },
        ...documentsServiceInputSchemaMcpOptions,
        to_format: {
          optional: true,
          description: `Defaults to "md". Convert the document to a specific format.`,
          enum: documentsServiceInputSchema.type.to_formats.allowedValues,
        },
      },
    },
    outputSchema: {
      type: "string",
    },
  },
} as const;
