export const documentsServiceInputSchema = {
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
      description:
        "Image export mode for the document (in case of JSON, Markdown or HTML). Allowed values: placeholder, embedded, referenced. Optional, defaults to Embedded.",
    },

    page_range: {
      type: "integer[]",
      optional: true,
      description:
        "Only convert a range of pages. The page number starts at 1.",
    },
    do_ocr: {
      type: "boolean",
      optional: true,
      description:
        "If enabled, the bitmap content will be processed using OCR. Boolean. Optional, defaults to true",
    },
    force_ocr: {
      type: "boolean",
      optional: true,
      description:
        "If enabled, replace existing text with OCR-generated text over content. Boolean. Optional, defaults to false.",
    },
    ocr_engine: {
      enum: ["auto", "easyocr", "ocrmac", "rapidocr", "tesserocr", "tesseract"],
      optional: true,
      description:
        "The OCR engine to use. String. Allowed values: auto, easyocr, ocrmac, rapidocr, tesserocr, tesseract. Optional, defaults to easyocr.",
    },
    ocr_lang: {
      type: "string[]",
      optional: true,
      description:
        "List of languages used by the OCR engine. Note that each OCR engine has different values for the language names. String or list of strings. Optional, defaults to empty.",
    },
    document_timeout: {
      optional: true,
      type: "number",
      description: "The timeout for processing each document, in seconds.",
    },
    pdf_backend: {
      enum: [
        "pypdfium2",
        "docling_parse",
        "dlparse_v1",
        "dlparse_v2",
        "dlparse_v4",
      ],
      optional: true,
      description:
        "The PDF backend to use. String. Allowed values: pypdfium2, docling_parse, dlparse_v1, dlparse_v2, dlparse_v4. Optional, defaults to docling_parse.",
    },
    table_mode: {
      enum: ["fast", "accurate"],
      optional: true,
      description:
        "Mode to use for table structure, String. Allowed values: fast, accurate. Optional, defaults to accurate.",
    },
    do_table_structure: {
      type: "boolean",
      optional: true,
      description:
        "If enabled, the table structure will be extracted. Boolean. Optional, defaults to true.",
    },
    include_images: {
      type: "boolean",
      optional: true,
      description:
        "If enabled, images will be extracted from the document. Boolean. Optional, defaults to true.",
    },
    md_page_break_placeholder: {
      type: "string",
      optional: true,
      description: "Add this placeholder between pages in the markdown output.",
    },
  },
} as const;
