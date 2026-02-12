import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import { Checkbox } from "@components/Checkbox";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
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
      {questions.map(
        (
          { question, suggested_answers, allowMultipleChoices },
          questionIndex,
        ) => {
          return (
            <FlexCol key={question + questionIndex} className="">
              <p className="p-0 m-0 bold">{question}</p>
              <FlexRowWrap
                className="ml-p5 "
                style={{
                  gap: ".5em 2em",
                }}
              >
                {!suggested_answers.length && (
                  <FormField
                    type="text"
                    value={
                      Array.from(
                        selectedAnswers.get(question)?.keys() ?? [],
                      )[0] || ""
                    }
                    onChange={(newAnswer) => {
                      setSelectedAnswers((prev) => {
                        prev.set(question, new Set([newAnswer]));
                        return new Map(prev);
                      });
                    }}
                  />
                )}
                {suggested_answers.map((answer, answerIndex) => {
                  const checked =
                    selectedAnswers.get(question)?.has(answer) || false;
                  return (
                    <Checkbox
                      label={answer}
                      variant="header"
                      key={answer + answerIndex}
                      checked={checked}
                      iconPath={
                        allowMultipleChoices ?
                          checked ?
                            mdiCheckboxIntermediate
                          : mdiCheckboxBlankOutline
                        : checked ?
                          mdiRadioboxMarked
                        : mdiRadioboxBlank
                      }
                      readOnly={Boolean(sentAnswers)}
                      onChange={
                        sentAnswers ? undefined : (
                          ({ target: { checked } }) => {
                            setSelectedAnswers((prev) => {
                              const questionAnswers =
                                prev.get(question) || new Set();
                              if (!allowMultipleChoices) {
                                questionAnswers.clear();
                              }
                              if (checked) {
                                questionAnswers.add(answer);
                              } else {
                                questionAnswers.delete(answer);
                              }
                              prev.set(question, questionAnswers);
                              return new Map(prev);
                            });
                          }
                        )
                      }
                    />
                  );
                })}
              </FlexRowWrap>
            </FlexCol>
          );
        },
      )}
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
