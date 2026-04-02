import { documentsServiceInputSchema } from "./documentsServiceInputSchema";
export const CONVERTABLE_DOCUMENT_TYPES = [
    // Documents
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
];
export const CONVERTABLE_IMAGE_TYPES = [
    // Images
    "image/png",
    "image/jpeg",
    "image/tiff",
    "image/bmp",
    "image/webp",
];
export const documentsMcpSchema = {
    get_document_text: {
        mode: undefined,
        description: "Get text contents of a document/image. Based on docling. Supported formats: txt, pdf, docx, pptx, jpg, png, and more.",
        schema: {
            type: Object.assign({ fileAsBase64: "string", contentType: {
                    enum: [...CONVERTABLE_DOCUMENT_TYPES, ...CONVERTABLE_IMAGE_TYPES],
                } }, documentsServiceInputSchema.type),
        },
        outputSchema: {
            type: "string",
        },
    },
};
