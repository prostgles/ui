import { filterArr } from "@common/llmUtils";
import type { AnyObject } from "prostgles-types";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { CopyToClipboardBtn } from "@components/CopyToClipboardBtn";
import { FlexRow } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { mdiChevronDown, mdiChevronUp, mdiDelete } from "@mdi/js";
import React, { useMemo } from "react";
import type { DBS } from "src/dashboard/Dashboard/DBS";
import { t } from "src/i18n/i18nUtils";
import type { LLMMessageItem } from "../hooks/useLLMChatMessageGrouper";

export const LLMChatMessageHeader = ({
  item,
  dbs,
}: {
  item: LLMMessageItem;
  dbs: DBS;
}) => {
  const { cost, id, meta, textMessageToCopy, user_id, chat_id, created } =
    useMemo(() => {
      let textMessageToCopy: string | undefined;
      let cost = 0;
      if (item.type === "single_message") {
        cost = item.message.cost ? parseFloat(item.message.cost) : 0;
        const {
          message: { message },
        } = item;
        const textMessages = filterArr(message, {
          type: "text",
        } as const);
        textMessageToCopy =
          textMessages.length && textMessages.length === message.length ?
            textMessages.map((m) => m.text).join("\n")
          : undefined;
      } else {
        cost = item.messages.reduce((acc, curr) => {
          const currCost =
            curr.message.cost ? parseFloat(curr.message.cost) : 0;
          return acc + currCost;
        }, 0);
      }
      const { id, user_id, chat_id, created } =
        item.type === "single_message" ? item.message : item.firstMessage;

      const meta =
        item.type === "single_message" ?
          (item.message.meta as AnyObject)
        : undefined;

      return {
        id,
        user_id,
        textMessageToCopy,
        cost,
        meta,
        chat_id,
        created,
      };
    }, [item]);

  const canCollapse = item.type === "single_message";
  return (
    <FlexRow className="show-on-parent-hover f-1 gap-p25">
      {!user_id && (
        <Chip
          className="ml-p5"
          title={JSON.stringify({ cost, ...meta }, null, 2)}
        >
          {`$${cost.toFixed(!cost ? 0 : 2)}`}
        </Chip>
      )}
      <Select
        title={t.common.Delete + "..."}
        data-command="AskLLM.DeleteMessage"
        fullOptions={[
          {
            key: "thisMessage",
            label: "Delete this message",
          },
          {
            key: "allToBottom",
            label: "Delete this and all following messages",
          },
        ]}
        btnProps={{
          size: "micro",
          variant: "icon",
          iconPath: mdiDelete,
          children: "",
        }}
        onChange={async (option) => {
          if (option === "thisMessage") {
            await dbs.llm_messages.delete({ id });
          } else {
            await dbs.llm_messages.delete({
              chat_id,
              created: {
                $gte: created,
              },
            });
          }
        }}
        className="ml-auto"
      />
      {textMessageToCopy && (
        <CopyToClipboardBtn content={textMessageToCopy} size="micro" />
      )}
      {item.onToggle && (
        <Btn
          title={canCollapse ? "Collapse" : "Expand"}
          iconPath={canCollapse ? mdiChevronUp : mdiChevronDown}
          onClick={item.onToggle}
          size="micro"
        />
      )}
    </FlexRow>
  );
};
