import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
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
import { useTypedToolUseResultDataV2 } from "./common/useTypedToolUseResultData";
import { useSendToolUseResult } from "./common/useSendToolUseResult";

export const AskUserQuestions = ({
  chatId,
  message,
  toolUseResult,
}: Pick<ProstglesMCPToolsProps, "chatId" | "message" | "toolUseResult">) => {
  const { tables } = usePrgl();
  const data = message.input as JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["ask_user_questions"]["schema"]["type"]
  >;
  const { questions } = data;
  const [selectedAnswers, setSelectedAnswers] = React.useState<
    Map<string, Set<string>>
  >(new Map());

  const result = useTypedToolUseResultDataV2(
    toolUseResult?.toolUseResultMessage,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["ask_user_questions"][
      "outputSchema"
    ],
  );
  const sentAnswers = result?.data;
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

  const { sendToolUseResult } = useSendToolUseResult();

  return (
    <FlexCol className="w-full ta-left" data-command="AskUserQuestions">
      <ErrorComponent error={result?.error} />
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
                      label={table.label}
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
            await sendToolUseResult({
              chatId,
              toolUseId: message.id,
              toolName: message.name,
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
            });
          }}
        >
          Submit answers
        </Btn>
      )}
    </FlexCol>
  );
};
