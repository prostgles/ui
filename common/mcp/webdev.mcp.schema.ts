export const webdevMcpSchema = {
  list_directory: {
    description:
      "List files in the web app directory. Will truncate long lists.",
    schema: {
      type: {
        directoryPath: {
          type: "string",
          description:
            "Directory path to list files from the web app directory. Example: 'src/components'",
          optional: true,
        },
      },
    },
    outputSchema: {
      arrayOf: "string",
    },
  },
  read_files: {
    description: "Read files from the web app directory",
    schema: {
      type: {
        filePaths: {
          description: "File paths to read from the web app directory.",
          arrayOf: "string",
        },
      },
    },
    outputSchema: {
      arrayOfType: {
        filePath: "string",
        content: "string",
      },
    },
  },
  search_files: {
    description:
      "Search files by content and/or file name in the web app directory",
    schema: {
      type: {
        contentQuery: {
          type: "string",
          description:
            "File content search query. Example: 'useState' to search for files that include 'useState'",
          optional: true,
        },
        fileNameQuery: {
          type: "string",
          optional: true,
          description:
            "File name search query to further filter search results. Example: 'Counter' to only include files with 'Counter' in the file name.",
        },
        extensions: {
          description:
            "File extensions to limit the search to (e.g., ['ts', 'tsx', 'js', 'jsx'])",
          arrayOf: "string",
          optional: true,
        },
      },
    },
    outputSchema: {
      arrayOfType: {
        filePath: "string",
        matchedContent: "string",
      },
    },
  },
  create_component_quick_feedback_preview: {
    description: [
      "Quickly show the user a component they need you to create so they can provide feedback.",
      "It is crucial that you first show a very basic and simple design and component to get feedback early to ensure you are on the right track and to avoid doing unnecessary work.",
      "The tsx and css files will be both named ComponentQuickFeedbackPreview and saved in the components folder. This means you can import the css file in the tsx file using './ComponentQuickFeedbackPreview.css'",
      "Use best practices for component design and code structure to make it easy for the user to understand and provide feedback.",
    ].join("\n"),
    schema: {
      type: {
        indexTsx: {
          type: "string",
          description:
            "tsx code for the component. Example: 'import { useState } from \"react\"; ...'",
        },
        css: {
          type: "string",
          optional: true,
          description:
            "css code for the component. Example: '.container { display: flex; }'",
        },
        dependencies: {
          description:
            "Dependencies to install in the environment (e.g., react, axios)",
          arrayOf: "string",
          optional: true,
        },
      },
    },
    outputSchema: {
      type: "unknown",
    },
  },
  create_component: {
    description: "Create a react component",
    schema: {
      type: {
        entryPoint: {
          type: "string",
          description:
            "Entry point file for the component. Example: '@/components/Counter/Counter.tsx'",
        },
        files: {
          description: `tsx/css and other files for the component. Example: { "@/components/Counter/Counter.tsx":  "import { useState } from "react"; ..."  } `,
          record: {
            values: "string",
          },
        },
        dependencies: {
          description:
            "Dependencies to install in the environment (e.g., react, axios)",
          arrayOf: "string",
          optional: true,
        },
        devDependencies: {
          description:
            "Dev Dependencies to install in the environment (e.g., @types/pkg)",
          arrayOf: "string",
          optional: true,
        },
        test: {
          description:
            "Playwright test to run against the component. Example:  'import { test, expect } from \"@playwright/react\"; ...'",
          type: "string",
        },
      },
    },
    outputSchema: {
      type: "unknown",
    },
  },
} as const;
