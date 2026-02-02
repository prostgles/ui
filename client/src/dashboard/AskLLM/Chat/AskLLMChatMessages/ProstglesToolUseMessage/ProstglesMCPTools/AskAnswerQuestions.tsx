import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import { Checkbox } from "@components/Checkbox";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useEffectDeep } from "prostgles-client";
import type { JSONB } from "prostgles-types";
import React from "react";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { useTypedToolUseResultData } from "./common/useTypedToolUseResultData";

export const AskAnswerQuestions = ({
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
    <FlexCol className="w-full ta-left">
      {questions.map(
        ({ question, answers, allowMultipleChoices }, questionIndex) => {
          return (
            <FlexCol key={question + questionIndex} className="">
              <p className="p-0 m-0 bold">{question}</p>
              <FlexRowWrap
                className="ml-p5 "
                style={{
                  gap: ".5em 2em",
                }}
              >
                {answers.map((answer, answerIndex) => (
                  <Checkbox
                    label={answer}
                    variant="header"
                    key={answer + answerIndex}
                    checked={
                      selectedAnswers.get(question)?.has(answer) || false
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
                ))}
              </FlexRowWrap>
            </FlexCol>
          );
        },
      )}
      {!sentAnswers && (
        <Btn
          disabledInfo={selectedAnswers.size ? undefined : "Select answers"}
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
