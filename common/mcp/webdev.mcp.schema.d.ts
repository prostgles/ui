export declare const webdevMcpSchema: {
    readonly list_directory: {
        readonly description: "List files in the web app directory. Will truncate long lists.";
        readonly schema: {
            readonly type: {
                readonly directoryPath: {
                    readonly type: "string";
                    readonly description: "Directory path to list files from the web app directory. Example: 'src/components'";
                    readonly optional: true;
                };
            };
        };
        readonly outputSchema: {
            readonly arrayOf: "string";
        };
    };
    readonly read_files: {
        readonly description: "Read files from the web app directory";
        readonly schema: {
            readonly type: {
                readonly filePaths: {
                    readonly description: "File paths to read from the web app directory.";
                    readonly arrayOf: "string";
                };
            };
        };
        readonly outputSchema: {
            readonly arrayOfType: {
                readonly filePath: "string";
                readonly content: "string";
            };
        };
    };
    readonly search_files: {
        readonly description: "Search files by content and/or file name in the web app directory";
        readonly schema: {
            readonly type: {
                readonly contentQuery: {
                    readonly type: "string";
                    readonly description: "File content search query. Example: 'useState' to search for files that include 'useState'";
                    readonly optional: true;
                };
                readonly fileNameQuery: {
                    readonly type: "string";
                    readonly optional: true;
                    readonly description: "File name search query to further filter search results. Example: 'Counter' to only include files with 'Counter' in the file name.";
                };
                readonly extensions: {
                    readonly description: "File extensions to limit the search to (e.g., ['ts', 'tsx', 'js', 'jsx'])";
                    readonly arrayOf: "string";
                    readonly optional: true;
                };
            };
        };
        readonly outputSchema: {
            readonly arrayOfType: {
                readonly filePath: "string";
                readonly matchedContent: "string";
            };
        };
    };
    readonly create_component_quick_feedback_preview: {
        readonly description: string;
        readonly schema: {
            readonly type: {
                readonly indexTsx: {
                    readonly type: "string";
                    readonly description: "tsx code for the component. Example: 'import { useState } from \"react\"; ...'";
                };
                readonly css: {
                    readonly type: "string";
                    readonly optional: true;
                    readonly description: "css code for the component. Example: '.container { display: flex; }'";
                };
                readonly dependencies: {
                    readonly description: "Dependencies to install in the environment (e.g., react, axios)";
                    readonly arrayOf: "string";
                    readonly optional: true;
                };
            };
        };
        readonly outputSchema: {
            readonly type: "unknown";
        };
    };
    readonly create_component: {
        readonly description: "Create a react component";
        readonly schema: {
            readonly type: {
                readonly entryPoint: {
                    readonly type: "string";
                    readonly description: "Entry point file for the component. Example: '@/components/Counter/Counter.tsx'";
                };
                readonly files: {
                    readonly description: "tsx/css and other files for the component. Example: { \"@/components/Counter/Counter.tsx\":  \"import { useState } from \"react\"; ...\"  } ";
                    readonly record: {
                        readonly values: "string";
                    };
                };
                readonly dependencies: {
                    readonly description: "Dependencies to install in the environment (e.g., react, axios)";
                    readonly arrayOf: "string";
                    readonly optional: true;
                };
                readonly devDependencies: {
                    readonly description: "Dev Dependencies to install in the environment (e.g., @types/pkg)";
                    readonly arrayOf: "string";
                    readonly optional: true;
                };
                readonly test: {
                    readonly description: "Playwright test to run against the component. Example:  'import { test, expect } from \"@playwright/react\"; ...'";
                    readonly type: "string";
                };
            };
        };
        readonly outputSchema: {
            readonly type: "unknown";
        };
    };
};
//# sourceMappingURL=webdev.mcp.schema.d.ts.map