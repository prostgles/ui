import { makeToolUse, type ToolUse } from "./utils";

export const getAskUserToolUse = (isValid: boolean) =>
  ({
    tool: [
      makeToolUse("prostgles-ui", "ask_user_questions", {
        questions: [
          {
            type: "choice",
            question: "What is your favorite color?",
            allowMultipleChoices: false,
            suggestedAnswers: ["Red", "Blue", "Green", "Yellow"],
          },
          {
            type: "choice",
            question: "What is my favorite color?",
            allowMultipleChoices: true,
            suggestedAnswers: ["Red", "Blue", "Green", "Yellow"],
          },
          {
            type: "table-columns",
            tableName: "users",
            question: "Table columns",
          },
          {
            type: "table-name",
            question: "Table name",
          },
          {
            type: isValid ? "free-text" : "invalid-type",
            question: "Free text",
          },
        ],
      }),
    ],
  }) as const satisfies ToolUse;
