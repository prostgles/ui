import { documentsServiceInputSchema } from "./documentsServiceInputSchema";
export const documentsMcpSchema = {
    get_document_text: {
        mode: undefined,
        description: "Get text contents of a document/image. Based on docling. Supported formats: txt, pdf, docx, pptx, jpg, png, and more.",
        schema: {
            type: Object.assign(Object.assign({}, documentsServiceInputSchema.type), { file: "Blob", contentType: {
                    enum: ["application/pdf"],
                } }),
        },
        outputSchema: {
            type: "string",
        },
    },
};
