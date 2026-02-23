import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { Select } from "@components/Select/Select";
import {
  mdiCheckboxBlankOutline,
  mdiCheckboxIntermediate,
  mdiRadioboxBlank,
  mdiRadioboxMarked,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useEffectDeep } from "prostgles-client";
import type { JSONB } from "prostgles-types";
import React from "react";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { useTypedToolUseResultData } from "./common/useTypedToolUseResultData";

export const AskUserQuestions = ({
  chatId,
  message,
  toolUseResult,
}: Pick<ProstglesMCPToolsProps, "chatId" | "message" | "toolUseResult">) => {
  const {
    dbsMethods: { askLLM },
    connectionId,
    tables,
  } = usePrgl();
  const data = message.input as JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["ask_user_questions"]["schema"]["type"]
  >;
  const { questions } = data;
  const [selectedAnswers, setSelectedAnswers] = React.useState<
    Map<string, Set<string>>
  >(new Map());

  const sentAnswers = useTypedToolUseResultData(
    toolUseResult?.toolUseResultMessage,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["ask_user_questions"][
      "outputSchema"
    ],
  );
  useEffectDeep(() => {
    if (sentAnswers) {
      setSelectedAnswers(
        new Map(
          sentAnswers.map(({ question, answers }) => [
            question,
            new Set(answers),
          ]),
        ),
      );
    } else {
      setSelectedAnswers(new Map());
    }
  }, [questions, sentAnswers]);

  return (
    <FlexCol className="w-full ta-left" data-command="AskUserQuestions">
      {questions.map(({ question, ...questionData }, questionIndex) => {
        const questionResponseValues = Array.from(
          selectedAnswers.get(question)?.values() ?? [],
        );
        return (
          <FlexCol key={question + questionIndex} className="">
            <p className="p-0 m-0 bold">{question}</p>
            <FlexRowWrap
              className="ml-p5 "
              style={{
                gap: ".5em 2em",
              }}
            >
              {questionData.type === "table-columns" &&
                (() => {
                  const table = tables.find(
                    (t) => t.name === questionData.tableName,
                  );
                  if (!table) {
                    return <div>Table {questionData.tableName} not found</div>;
                  }
                  return (
                    <Select
                      data-key={question}
                      options={table.columns.map((c) => c.name)}
                      multiSelect={true}
                      value={questionResponseValues}
                      btnProps={{
                        color:
                          questionResponseValues.length ? "action" : undefined,
                        disabledInfo:
                          sentAnswers ? "Answer already submitted" : undefined,
                        disabledVariant: "no-fade",
                      }}
                      onChange={(newValues) =>
                        setSelectedAnswers((prev) => {
                          prev.set(question, new Set(newValues));
                          return new Map(prev);
                        })
                      }
                    />
                  );
                })()}
              {questionData.type === "table-name" && (
                <Select
                  data-key={question}
                  options={tables.map((t) => t.name)}
                  value={selectedAnswers.get(question)?.values().next().value}
                  btnProps={{
                    color: questionResponseValues.length ? "action" : undefined,
                    disabledInfo:
                      sentAnswers ? "Answer already submitted" : undefined,
                    disabledVariant: "no-fade",
                  }}
                  onChange={(newValue) =>
                    setSelectedAnswers((prev) => {
                      prev.set(question, new Set([newValue]));
                      return new Map(prev);
                    })
                  }
                />
              )}
              {(questionData.type === "free-text" ||
                (questionData.type === "choice" &&
                  !questionData.suggestedAnswers.length)) && (
                <FormField
                  type="text"
                  data-key={question}
                  value={questionResponseValues[0] || ""}
                  readOnly={Boolean(sentAnswers)}
                  onChange={(newAnswer) => {
                    setSelectedAnswers((prev) => {
                      prev.set(question, new Set([newAnswer]));
                      return new Map(prev);
                    });
                  }}
                />
              )}
              {questionData.type === "choice" &&
                questionData.suggestedAnswers.map((answer, answerIndex) => {
                  const checked =
                    questionResponseValues.includes(answer) || false;

                  const iconPath =
                    questionData.allowMultipleChoices ?
                      checked ? mdiCheckboxIntermediate
                      : mdiCheckboxBlankOutline
                    : checked ? mdiRadioboxMarked
                    : mdiRadioboxBlank;
                  const readOnly = Boolean(sentAnswers);
                  return (
                    <Btn
                      key={answer + answerIndex}
                      data-key={question}
                      iconPath={iconPath}
                      iconPosition="left"
                      variant={checked ? "faded" : "icon"}
                      color={checked ? "action" : undefined}
                      disabledInfo={
                        readOnly ? "Answers already submitted" : undefined
                      }
                      disabledVariant="no-fade"
                      style={{
                        whiteSpace: "pre-wrap",
                        textAlign: "start",
                        lineBreak: "anywhere",
                      }}
                      onClick={() => {
                        const newChecked = !checked;
                        setSelectedAnswers((prev) => {
                          const questionAnswers =
                            prev.get(question) || new Set();
                          if (!questionData.allowMultipleChoices) {
                            questionAnswers.clear();
                          }
                          if (newChecked) {
                            questionAnswers.add(answer);
                          } else {
                            questionAnswers.delete(answer);
                          }
                          prev.set(question, questionAnswers);
                          return new Map(prev);
                        });
                      }}
                    >
                      {answer}
                    </Btn>
                  );
                })}
            </FlexRowWrap>
          </FlexCol>
        );
      })}
      {!sentAnswers && (
        <Btn
          disabledInfo={selectedAnswers.size ? undefined : "Select answers"}
          data-command="AskUserQuestions.confirm"
          variant="filled"
          className="ml-auto"
          color="action"
          onClickPromise={async () => {
            await askLLM!({
              chatId,
              connectionId,
              type: "tool-use-result",
              userMessage: [
                {
                  type: "tool_result",
                  tool_use_id: message.id,
                  tool_name: message.name,
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        Array.from(selectedAnswers.entries()).map(
                          ([question, answerSet]) => {
                            return {
                              question,
                              answers: Array.from(answerSet),
                            };
                          },
                        ),
                      ),
                    },
                    {
                      type: "text",
                      text: "The answers have been provided as a JSON array of objects with 'question' and 'answers' fields. DO NOT ASK THE USER FOR THESE ANSWERS AGAIN.",
                    },
                  ],
                },
              ],
              schema: "",
            });
          }}
        >
          Submit answers
        </Btn>
      )}
    </FlexCol>
  );
};
