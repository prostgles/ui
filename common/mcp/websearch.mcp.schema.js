import { documentsServiceInputSchema } from "./documentsServiceInputSchema";
export const websearchMcpSchema = {
    websearch: {
        description: "Perform a web search and return results",
        schema: {
            type: {
                q: {
                    type: "string",
                    description: 'The search query. This string is passed to external search services. Supports service-specific syntax (e.g., "site:github.com SearXNG" for Google)',
                },
                categories: {
                    type: "string",
                    optional: true,
                    description: " Comma-separated list of active search categories. Categories to search in (e.g., 'general,images,videos')",
                },
                engines: {
                    type: "string",
                    optional: true,
                    description: "Comma-separated list of active search engines (e.g., 'google,bing,duckduckgo')",
                },
                language: {
                    type: "string",
                    optional: true,
                    description: "Language code for the search results (e.g., 'en' for English, 'fr' for French)",
                },
                pageno: {
                    type: "integer",
                    optional: true,
                    description: "Search result page number. Defaults to 1.",
                },
                time_range: {
                    enum: ["day", "month", "year"],
                    optional: true,
                    description: "Time range filter for results ('day' = past day, 'month' = past month, 'year' = past year). Only supported by engines that implement time range filtering",
                },
            },
        },
        outputSchema: {
            arrayOfType: {
                title: "string",
                content: "string",
                url: "string",
                score: "number",
                category: "string",
                engine: "string",
                img_src: "string",
                thumbnail: "any",
                template: { optional: true, type: "any" },
                publishedDate: { optional: true, type: "any" },
                parsed_url: { optional: true, type: "any" },
                priority: { optional: true, type: "any" },
                engines: { optional: true, type: "any" },
                positions: { optional: true, type: "any" },
                pubdate: { optional: true, type: "any" },
            },
        },
    },
    get_snapshot: {
        description: "Get a snapshot of a web page",
        schema: {
            type: {
                url: {
                    type: "string",
                    description: "URL of the web page to snapshot",
                },
            },
        },
        outputSchema: {
            type: "string",
        },
    },
    get_document_text: {
        description: "Get text contents of a document",
        schema: {
            type: Object.assign(Object.assign({}, documentsServiceInputSchema.type), { url: {
                    type: "string",
                } }),
        },
        outputSchema: {
            type: "string",
        },
    },
};
