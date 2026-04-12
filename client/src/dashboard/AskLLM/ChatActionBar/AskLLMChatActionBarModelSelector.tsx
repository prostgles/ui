import { type DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import Popup from "@components/Popup/Popup";
import { ProgressBar } from "@components/ProgressBar";
import { Select } from "@components/Select/Select";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiCircleOutline, mdiDotsVertical } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useMemo, useState } from "react";
import { nFormatter } from "src/utils/utils";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { LLMModelSelector } from "../LLMModelSelector";
import { ChatActionBarBtnStyleProps } from "./AskLLMChatActionBar";

export const AskLLMChatActionBarModelSelector = (
  props: Pick<AskLLMChatProps, "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
    llmMessages: DBSSchema["llm_messages"][];
  },
) => {
  const { activeChat, llmMessages } = props;
  const { extra_body } = activeChat;
  const { dbs } = usePrgl();

  const [show, setShow] = useState(false);

  const totalUsage = useMemo(() => {
    return llmMessages.reduce(
      (acc, msg) => {
        const cost = parseFloat(String(msg.cost));
        acc.cost += cost;
        acc.tokens += msg.total_tokens;
        return acc;
      },
      { cost: 0, tokens: 0 },
    );
  }, [llmMessages]);

  const { data: model } = dbs.llm_models.useFindOne(
    { id: activeChat.model ?? undefined },
    { select: { name: 1, context_length: 1 } },
    {
      skip: !activeChat.model,
      deps: [totalUsage.tokens],
    },
  );
  const context_length = model?.context_length;
  const usageRatio =
    context_length && context_length > 0 ?
      Math.min(1, totalUsage.tokens / context_length)
    : 0;

  const usageColor =
    usageRatio > 0.9 ? "var(--danger, #dc2626)"
    : usageRatio > 0.75 ? "var(--warn, #f59e0b)"
    : "var(--action, #16a34a)";

  const deg = usageRatio * 360;

  const contextIcon =
    context_length ?
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: `conic-gradient(${usageColor} 0 ${deg}deg, rgba(127,127,127,.25) ${deg}deg 360deg)`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--bg-color, #fff)",
          }}
        />
      </div>
    : undefined;
  const updateExtraBody = useCallback(
    async (newBody: Partial<DBSSchema["llm_chats"]["extra_body"]>) => {
      await dbs.llm_chats.update(
        { id: activeChat.id },
        {
          extra_body: {
            ...extra_body,
            ...newBody,
          },
        },
      );
    },
    [activeChat.id, dbs.llm_chats, extra_body],
  );

  const tokensUsed = nFormatter(totalUsage.tokens, 0);
  const contextUsedMessage =
    !context_length ?
      `${tokensUsed} tokens used`
    : `${tokensUsed} / ${nFormatter(context_length, 0)} tokens used (${Math.round(usageRatio * 100)}%)`;
  return (
    <FlexRow className="ml-auto text-2 gap-p25">
      {show && (
        <Popup
          title="LLM model settings"
          positioning="center"
          clickCatchStyle={{ opacity: 1 }}
          onClose={() => setShow(false)}
          contentClassName="flex-col gap-1 p-1"
        >
          <ProgressBar
            messageTop={<div className="bold w-fit">Context usage</div>}
            message={<div className="font-14">{contextUsedMessage}</div>}
            totalValue={context_length || totalUsage.tokens + 1}
            value={totalUsage.tokens}
          />
          <FormField
            label={"Max tokens"}
            type="integer"
            value={extra_body?.max_tokens ?? undefined}
            onChange={async (newValue) => {
              await updateExtraBody({
                max_tokens: newValue,
              });
            }}
          />
          <FormField
            label={"Temperature"}
            type="integer"
            value={activeChat.extra_body?.temperature ?? undefined}
            onChange={async (newValue) => {
              await updateExtraBody({
                temperature: newValue,
              });
            }}
          />
          <SwitchToggle
            label={"Thinking"}
            variant="col"
            checked={activeChat.extra_body?.think ?? false}
            onChange={async (newValue) => {
              await updateExtraBody({
                think: newValue,
              });
            }}
          />
          <Select
            label={"Reasoning"}
            value={
              extra_body?.reasoning && "effort" in extra_body.reasoning ?
                extra_body.reasoning.effort
              : undefined
            }
            options={["low", "medium", "high"]}
            onChange={async (effort) => {
              await updateExtraBody({
                reasoning: { effort },
              });
            }}
          />

          <Select
            label={"MCP tool options"}
            value={activeChat.options?.mcpToolSchemaMode}
            fullOptions={
              [
                {
                  key: "ts-types-in-description",
                  label: "Show as Typescript types",
                  subLabel:
                    "Will append tool input and output schemas as Typescript types in the tool description while removing Json Schema",
                },
                {
                  key: "hide-schemas-and-descriptions",
                  label: "Hide schemas and descriptions",
                  subLabel:
                    "Removes tool input and output schemas and descriptions from the tool description. Full tool info available by using get_tool_schemas",
                },
              ] as const
            }
            optional={true}
            onChange={async (newValue) => {
              await dbs.llm_chats.update(
                { id: activeChat.id },
                {
                  options: {
                    ...activeChat.options,
                    mcpToolSchemaMode: newValue,
                  },
                },
              );
            }}
          />
        </Popup>
      )}
      <LLMModelSelector
        className=" text-2"
        value={activeChat.model}
        btnProps={{ ...ChatActionBarBtnStyleProps, iconPath: "" }}
        onChange={(model) => {
          void dbs.llm_chats.update(
            { id: activeChat.id },
            {
              model,
            },
          );
        }}
      />
      {!!totalUsage.cost && (
        <Chip
          title={"Total cost: " + totalUsage.cost}
          style={{ fontSize: "12px", background: "transparent", opacity: 0.75 }}
          className="pointer"
        >
          ${totalUsage.cost.toFixed(2)}
        </Chip>
      )}
      <Btn
        title={!context_length ? "Model settings. " : contextUsedMessage}
        className=" text-2"
        size="small"
        iconNode={!context_length ? null : contextIcon}
        iconPath={
          !context_length ? mdiDotsVertical
          : !contextIcon ?
            mdiCircleOutline
          : undefined
        }
        onClick={() => setShow(true)}
      />
    </FlexRow>
  );
};
