import { mdiAccountKey, mdiPencil, mdiPlus, mdiRefresh } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { DetailedJoinSelect } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { DetailedFilterBase } from "@common/filterUtils";
import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { Select, type FullOption } from "@components/Select/Select";
import { SvgIconFromURL } from "@components/SvgIcon";
import { SmartForm, SmartFormPopup } from "../../SmartForm/SmartForm";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { ChatActionBarBtnStyleProps } from "./AskLLMChatActionBar";

export const AskLLMChatActionBarModelSelector = (
  props: Pick<AskLLMChatProps, "prgl" | "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
    llmMessages: DBSSchema["llm_messages"][];
  },
) => {
  const { prgl, activeChat, llmMessages } = props;
  const activeChatId = activeChat.id;
  const { dbs, dbsMethods } = prgl;

  const { data: models } = dbs.llm_models.useSubscribe(
    {},
    {
      select: {
        "*": 1,
        llm_providers: {
          logo_url: 1,
        },
        llm_credentials: {
          $leftJoin: ["llm_providers", "llm_credentials"],
          select: "*",
          limit: 1,
        } satisfies DetailedJoinSelect,
      },
    },
  );

  const [addProviderCredentials, setAddProviderCredentials] = useState("");
  const [viewModelForm, setViewModelForm] = useState<DetailedFilterBase>();
  const totalCost = useMemo(() => {
    return llmMessages.reduce((acc, msg) => {
      const cost = parseFloat(msg.cost);
      return acc + cost;
    }, 0);
  }, [llmMessages]);
  return (
    <>
      {viewModelForm && (
        <SmartForm
          asPopup={true}
          db={dbs as DBHandlerClient}
          tableName="llm_models"
          rowFilter={[viewModelForm]}
          tables={prgl.dbsTables}
          methods={prgl.dbsMethods}
          onClose={() => setViewModelForm(undefined)}
        />
      )}
      {addProviderCredentials && (
        <SmartForm
          label={"Add LLM credentials for " + addProviderCredentials}
          asPopup={true}
          tableName="llm_credentials"
          db={dbs as DBHandlerClient}
          methods={prgl.dbsMethods}
          defaultData={{
            provider_id: addProviderCredentials,
          }}
          onClose={() => setAddProviderCredentials("")}
          tables={prgl.dbsTables}
          showJoinedTables={false}
        />
      )}
      <Select
        data-command="LLMChatOptions.Model"
        fullOptions={
          models
            ?.map(
              ({
                id,
                name,
                provider_id,
                llm_credentials,
                llm_providers,
                pricing_info,
              }) => {
                const noCredentials = !llm_credentials.length;
                const iconUrl = llm_providers[0]?.logo_url;
                const isFree = Object.values(pricing_info ?? {}).every(
                  (v) => v === 0,
                );
                return {
                  key: id,
                  label: name + (isFree ? " (free)" : ""),
                  subLabel: provider_id,
                  leftContent:
                    !iconUrl ? undefined : (
                      <SvgIconFromURL
                        url={iconUrl}
                        className="mr-p5 text-0"
                        style={{
                          width: "24px",
                          height: "24px",
                        }}
                      />
                    ),
                  rightContent:
                    noCredentials ?
                      <Btn
                        title="Add provider API Key"
                        onClick={() => setAddProviderCredentials(provider_id)}
                        color="action"
                        data-command="LLMChatOptions.Model.AddCredentials"
                        iconPath={mdiAccountKey}
                      />
                    : <Btn
                        title="View info"
                        className="show-on-parent-hover"
                        onClick={() =>
                          setViewModelForm({ fieldName: "id", value: id })
                        }
                        color="action"
                        iconPath={mdiPencil}
                      />,
                  disabledInfo: noCredentials ? "No credentials" : undefined,
                } satisfies FullOption<number>;
              },
            )
            .slice()
            .sort(
              (a, b) =>
                (a.disabledInfo?.length ?? 0) - (b.disabledInfo?.length ?? 0) ||
                a.label.localeCompare(b.label),
            ) ?? []
        }
        size="small"
        btnProps={{
          ...ChatActionBarBtnStyleProps,
          iconPath: "",
        }}
        title="Model"
        emptyLabel="Select model..."
        className="ml-auto text-2"
        multiSelect={false}
        value={activeChat.model}
        onChange={(model) => {
          if (!activeChatId) return;
          dbs.llm_chats.update(
            { id: activeChatId },
            {
              model,
            },
          );
        }}
        endOfResultsContent={
          <FlexCol className="p-1">
            <div className="text-1">End of results.</div>
            <FlexRowWrap>
              <Btn
                title="Refresh models"
                iconPath={mdiRefresh}
                onClickPromise={async () => await dbsMethods.refreshModels?.()}
                color="action"
                variant="faded"
              >
                Refresh models
              </Btn>
              <SmartFormPopup
                asPopup={true}
                label="Add model"
                db={dbs as DBHandlerClient}
                tableName="llm_models"
                methods={prgl.dbsMethods}
                tables={prgl.dbsTables}
                triggerButton={{
                  iconPath: mdiPlus,
                  title: "Add model",
                  color: "action",
                  children: "Add model",
                  variant: "faded",
                }}
              />
            </FlexRowWrap>
          </FlexCol>
        }
      />
      {!!totalCost && (
        <Chip
          title={"Total cost: " + totalCost}
          style={{ fontSize: "12px", background: "transparent", opacity: 0.75 }}
          className="pointer"
        >
          ${totalCost.toFixed(2)}
        </Chip>
      )}
    </>
  );
};
