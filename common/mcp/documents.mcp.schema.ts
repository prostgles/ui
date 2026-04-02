import { documentsServiceInputSchema } from "./documentsServiceInputSchema";

export const documentsMcpSchema = {
  get_document_text: {
    mode: undefined,
    description:
      "Get text contents of a document/image. Based on docling. Supported formats: txt, pdf, docx, pptx, jpg, png, and more.",
    schema: {
      type: {
        ...documentsServiceInputSchema.type,
        fileAsBase64: "string",
        contentType: {
          enum: [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "image/jpeg",
            "image/png",
          ],
        },
      },
    },
    outputSchema: {
      type: "string",
    },
  },
} as const;
