export declare const websearchMcpSchema: {
    readonly websearch: {
        readonly description: "Perform a web search and return results";
        readonly schema: {
            readonly type: {
                readonly q: {
                    readonly type: "string";
                    readonly description: "The search query. This string is passed to external search services. Supports service-specific syntax (e.g., \"site:github.com SearXNG\" for Google)";
                };
                readonly categories: {
                    readonly type: "string";
                    readonly optional: true;
                    readonly description: " Comma-separated list of active search categories. Categories to search in (e.g., 'general,images,videos')";
                };
                readonly engines: {
                    readonly type: "string";
                    readonly optional: true;
                    readonly description: "Comma-separated list of active search engines (e.g., 'google,bing,duckduckgo')";
                };
                readonly language: {
                    readonly type: "string";
                    readonly optional: true;
                    readonly description: "Language code for the search results (e.g., 'en' for English, 'fr' for French)";
                };
                readonly pageno: {
                    readonly type: "integer";
                    readonly optional: true;
                    readonly description: "Search result page number. Defaults to 1.";
                };
                readonly time_range: {
                    readonly enum: readonly ["day", "month", "year"];
                    readonly optional: true;
                    readonly description: "Time range filter for results ('day' = past day, 'month' = past month, 'year' = past year). Only supported by engines that implement time range filtering";
                };
            };
        };
        readonly outputSchema: {
            readonly arrayOfType: {
                readonly title: "string";
                readonly content: "string";
                readonly url: "string";
                readonly score: "number";
                readonly category: "string";
                readonly engine: "string";
                readonly img_src: "string";
                readonly thumbnail: "any";
                readonly template: {
                    readonly optional: true;
                    readonly type: "any";
                };
                readonly publishedDate: {
                    readonly optional: true;
                    readonly type: "any";
                };
                readonly parsed_url: {
                    readonly optional: true;
                    readonly type: "any";
                };
                readonly priority: {
                    readonly optional: true;
                    readonly type: "any";
                };
                readonly engines: {
                    readonly optional: true;
                    readonly type: "any";
                };
                readonly positions: {
                    readonly optional: true;
                    readonly type: "any";
                };
                readonly pubdate: {
                    readonly optional: true;
                    readonly type: "any";
                };
            };
        };
    };
    readonly get_snapshot: {
        readonly description: "Get a snapshot of a web page";
        readonly schema: {
            readonly type: {
                readonly url: {
                    readonly type: "string";
                    readonly description: "URL of the web page to snapshot";
                };
            };
        };
        readonly outputSchema: {
            readonly type: "string";
        };
    };
    readonly get_document_text: {
        readonly description: "Get text contents of a document";
        readonly schema: {
            readonly type: {
                readonly url: {
                    readonly type: "string";
                };
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
                readonly image_export_mode: {
                    readonly optional: true;
                    readonly enum: readonly ["placeholder", "embedded", "referenced"];
                    readonly description: "Image export mode for the document (in case of JSON, Markdown or HTML). Allowed values: placeholder, embedded, referenced. Optional, defaults to Embedded.";
                };
                readonly page_range: {
                    readonly type: "integer[]";
                    readonly optional: true;
                    readonly description: "Only convert a range of pages. The page number starts at 1.";
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
        readonly outputSchema: {
            readonly type: "string";
        };
    };
};
//# sourceMappingURL=websearch.mcp.schema.d.ts.map