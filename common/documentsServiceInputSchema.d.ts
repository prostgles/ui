export declare const documentsServiceInputSchema: {
    readonly optional: true;
    readonly type: {
        readonly from_formats: {
            readonly optional: true;
            readonly type: "string[]";
            readonly allowedValues: readonly ["docx", "pptx", "html", "image", "pdf", "asciidoc", "md", "csv", "xlsx", "xml_uspto", "xml_jats", "xml_xbrl", "mets_gbs", "json_docling", "audio", "vtt", "latex"];
        };
        readonly to_formats: {
            readonly optional: true;
            readonly type: "string[]";
            readonly allowedValues: readonly ["md", "json", "yaml", "html", "html_split_page", "text", "doctags"];
        };
        /**
         * Image export mode for the document (in case of JSON, Markdown or HTML). Allowed values: placeholder, embedded, referenced. Optional, defaults to Embedded.
         */
        readonly image_export_mode: {
            readonly optional: true;
            readonly enum: readonly ["placeholder", "embedded", "referenced"];
            readonly description: "Image export mode for the document (in case of JSON, Markdown or HTML). Allowed values: placeholder, embedded, referenced. Optional, defaults to Embedded.";
        };
        readonly do_ocr: {
            readonly type: "boolean";
            readonly optional: true;
            readonly description: "If enabled, the bitmap content will be processed using OCR. Boolean. Optional, defaults to true";
        };
        readonly force_ocr: {
            readonly type: "boolean";
            readonly optional: true;
            readonly description: "If enabled, replace existing text with OCR-generated text over content. Boolean. Optional, defaults to false.";
        };
        readonly ocr_engine: {
            readonly enum: readonly ["auto", "easyocr", "ocrmac", "rapidocr", "tesserocr", "tesseract"];
            readonly optional: true;
            readonly description: "The OCR engine to use. String. Allowed values: auto, easyocr, ocrmac, rapidocr, tesserocr, tesseract. Optional, defaults to easyocr.";
        };
        readonly ocr_lang: {
            readonly type: "string[]";
            readonly optional: true;
            readonly description: "List of languages used by the OCR engine. Note that each OCR engine has different values for the language names. String or list of strings. Optional, defaults to empty.";
        };
        readonly document_timeout: {
            readonly optional: true;
            readonly type: "number";
            readonly description: "The timeout for processing each document, in seconds.";
        };
        readonly pdf_backend: {
            readonly enum: readonly ["pypdfium2", "docling_parse", "dlparse_v1", "dlparse_v2", "dlparse_v4"];
            readonly optional: true;
            readonly description: "The PDF backend to use. String. Allowed values: pypdfium2, docling_parse, dlparse_v1, dlparse_v2, dlparse_v4. Optional, defaults to docling_parse.";
        };
        readonly table_mode: {
            readonly enum: readonly ["fast", "accurate"];
            readonly optional: true;
            readonly description: "Mode to use for table structure, String. Allowed values: fast, accurate. Optional, defaults to accurate.";
        };
        readonly do_table_structure: {
            readonly type: "boolean";
            readonly optional: true;
            readonly description: "If enabled, the table structure will be extracted. Boolean. Optional, defaults to true.";
        };
        readonly include_images: {
            readonly type: "boolean";
            readonly optional: true;
            readonly description: "If enabled, images will be extracted from the document. Boolean. Optional, defaults to true.";
        };
        readonly md_page_break_placeholder: {
            readonly type: "string";
            readonly optional: true;
            readonly description: "Add this placeholder between pages in the markdown output.";
        };
    };
};
//# sourceMappingURL=documentsServiceInputSchema.d.ts.map