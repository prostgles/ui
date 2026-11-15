import type { Rule } from "eslint";
import type ts from "typescript";
import { getConfigModuleErrors } from "./getConfigModuleErrors";

export type { ConfigModuleTypes } from "./configModuleConventions";

const cachedErrors = new WeakMap<ts.Program, Map<string, string[]>>();

const configModuleRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    schema: [],
    messages: { invalidModule: "{{message}}" },
  },
  create: (context) => ({
    Program: (node) => {
      const { program } = context.sourceCode.parserServices as {
        program: ts.Program | undefined;
      };
      if (!program)
        throw new Error("Config module validation requires typed linting.");
      let errors = cachedErrors.get(program);
      if (!errors) {
        errors = getConfigModuleErrors(program);
        cachedErrors.set(program, errors);
      }
      for (const message of errors.get(context.filename) ?? []) {
        context.report({ node, messageId: "invalidModule", data: { message } });
      }
    },
  }),
};

const workflowModuleRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      invalidFilename: "Use the .workflow.ts suffix for workflow files.",
      missingDefinition: "Workflow files must call defineAgenticWorkflow.",
    },
  },
  create: (context) => {
    if (context.filename.endsWith(".d.ts")) return {};
    let hasWorkflowDefinition = false;
    return {
      CallExpression: (node) => {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "defineAgenticWorkflow"
        )
          hasWorkflowDefinition = true;
      },
      "Program:exit": (node) => {
        if (!context.filename.endsWith(".workflow.ts")) {
          context.report({ node, messageId: "invalidFilename" });
        }
        if (!hasWorkflowDefinition) {
          context.report({ node, messageId: "missingDefinition" });
        }
      },
    };
  },
};

export const configModuleEslintPlugin = {
  rules: {
    "config-module": configModuleRule,
    "workflow-module": workflowModuleRule,
  },
};
