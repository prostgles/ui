import {
  documentsServiceInputSchema,
  documentsServiceInputSchemaMcpOptions,
} from "./documentsServiceInputSchema";

export const CONVERTABLE_DOCUMENT_TYPES = [
  /* Document MIME types accepted by Docling's format detection. */
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/html",
  "application/xhtml+xml",
  "text/asciidoc",
  "text/x-asciidoc",
  "text/csv",
  "text/vtt",
  "text/x-tex",
  "application/x-tex",
  "text/x-latex",
  "application/xml",
  "text/xml",
  "application/mets+xml",
  "application/json",
  "application/msword",
  "application/x-msword",
  "application/rtf",
  "text/rtf",
  "application/x-rtf",
  "application/vnd.ms-excel",
  "application/x-msexcel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.template",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.text-template",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.spreadsheet-template",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.presentation-template",
  "application/epub+zip",
  "message/rfc822",
  "application/vnd.ms-outlook",
  "application/x-mimearchive",
  "multipart/related",
] as const;
export const CONVERTABLE_IMAGE_TYPES = [
  // Images
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/gif",
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
