import type { DetailedFilterBase } from "@common/filterUtils";
import type { DBSSchema } from "@common/publishUtils";
import Btn, { type BtnProps } from "@components/Btn";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { Select, type FullOption } from "@components/Select/Select";
import { SvgIconFromURL } from "@components/SvgIcon";
import { mdiAccountKey, mdiPencil, mdiPlus, mdiRefresh } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { DBHandlerClient } from "prostgles-client";
import type { DetailedJoinSelect } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { nFormatter } from "src/utils/utils";
import { SmartForm, SmartFormPopup } from "../SmartForm/SmartForm";

type P = {
  btnProps?: BtnProps<void>;
  value: number | null;
  onChange: (modelId: number, model: DBSSchema["llm_models"]) => void;
  modelName?: string;
  forAgent?: true;
  className?: string;
};
export const LLMModelSelector = ({
  btnProps,
  onChange,
  value: valueFromProps,
  modelName,
  className,
  forAgent,
}: P) => {
  const { dbs, dbsMethods, dbsSql, dbsTables, dbsMethodSchema } = usePrgl();
  const [refreshing, setRefreshing] = useState(false);
  const [addProviderCredentials, setAddProviderCredentials] = useState("");

  const { data: models } = dbs.llm_models.useFind(
    forAgent ?
      {
        mcp_tool_support: true,
      }
    : {},
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
      orderBy: {
        key: forAgent ? "agent_suitability_rank" : "chat_suitability_rank",
        asc: true,
        nulls: "last",
      },
    },
    { deps: [refreshing, addProviderCredentials] },
  );
  const modelFromName = useMemo(() => {
    if (!modelName || !models) return null;
    return models.find((m) => m.name === modelName);
  }, [modelName, models]);
  const value = valueFromProps ?? modelFromName?.id ?? null;

  const [viewModelForm, setViewModelForm] = useState<DetailedFilterBase>();

  const sortedModelsMap = useMemo(() => {
    return new Map(
      (models ?? [])
        .toSorted((a, b) =>
          (
            (a.llm_credentials?.length ?? 0) -
              (b.llm_credentials?.length ?? 0) || forAgent
          ) ?
            (a.agent_suitability_rank || Infinity) -
            (b.agent_suitability_rank || Infinity)
          : Number(a.chat_suitability_rank || Infinity) -
            Number(b.chat_suitability_rank || Infinity),
        )
        .map((m) => [m.id, m] as const),
    );
  }, [forAgent, models]);

  return (
    <>
      {viewModelForm && (
        <SmartForm
          asPopup={true}
          sql={dbsSql}
          db={dbs as DBHandlerClient}
          tableName="llm_models"
          rowFilter={[viewModelForm]}
          tables={dbsTables}
          methods={dbsMethodSchema}
          onClose={() => setViewModelForm(undefined)}
        />
      )}
      {addProviderCredentials && (
        <SmartForm
          label={"Add LLM credentials for " + addProviderCredentials}
          asPopup={true}
          tableName="llm_credentials"
          db={dbs as DBHandlerClient}
          sql={dbsSql}
          methods={dbsMethodSchema}
          defaultData={{
            provider_id: addProviderCredentials,
          }}
          onClose={() => setAddProviderCredentials("")}
          tables={dbsTables}
          showJoinedTables={false}
        />
      )}
      <Select
        data-command="LLMChatOptions.Model"
        size="small"
        btnProps={btnProps}
        title="Model"
        emptyLabel="Select model..."
        className={className}
        multiSelect={false}
        value={value}
        onChange={(id) => {
          const model = models?.find((m) => m.id === id);
          onChange(id, model!);
        }}
        endOfResultsContent={
          <FlexCol className="p-1">
            <div className="text-1">End of results.</div>
            <FlexRowWrap>
              <Btn
                title="Refresh models"
                iconPath={mdiRefresh}
                onClickPromise={async () => {
                  setRefreshing(true);
                  await dbsMethods
                    .refreshModels?.()
                    .finally(() => setRefreshing(false));
                }}
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
                methods={dbsMethodSchema}
                tables={dbsTables}
                sql={dbsSql}
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
        fullOptions={
          Array.from(sortedModelsMap.values()).map(
            ({
              id,
              name: rawName,
              provider_id,
              llm_credentials,
              llm_providers,
              pricing_info,
              context_length,
              max_completion_tokens,
              model_created,
            }) => {
              const name = rawName.split("/")[1] || rawName;
              const noCredentials = !llm_credentials.length;
              const iconUrl = llm_providers[0]?.logo_url as string | undefined;
              const isFree = Object.values(pricing_info ?? {}).every(
                (v) => v === 0,
              );
              return {
                key: id,
                label: name + (isFree ? " (free)" : ""),
                subLabel: [
                  model_created &&
                    new Date(model_created).toISOString().split("T")[0],
                  context_length ?
                    `${nFormatter(context_length, 0)} context`
                  : "",
                  `${pricing_info?.input ? [pricing_info.input, pricing_info.output].map((v) => "$" + v.toFixed(2)).join("/") : ""}`,
                  `${max_completion_tokens ? nFormatter(max_completion_tokens, 0) + " max completion" : ""}`,
                ]
                  .filter((v) => v)
                  .join("  "),
                leftContent:
                  !iconUrl ? undefined : (
                    <SvgIconFromURL
                      url={iconUrl}
                      className="text-0"
                      title={provider_id}
                      style={{
                        width: "24px",
                        height: "24px",
                      }}
                    />
                  ),
                contentTop:
                  !noCredentials ? undefined : (
                    (renderedItems, index) => {
                      const prevItem = renderedItems[index - 1];
                      const showHeader =
                        !prevItem ||
                        sortedModelsMap.get(prevItem.key as number)
                          ?.provider_id !== provider_id;
                      if (!showHeader) return null;
                      return (
                        <Btn
                          title="Add provider API Key"
                          onClick={() => {
                            setAddProviderCredentials(provider_id);
                          }}
                          color="action"
                          style={{
                            position: "sticky",
                            top: "10px",
                            left: "20px",
                            zIndex: 1,
                            background: "var(--bg-color-0)",
                          }}
                          data-command="LLMChatOptions.Model.AddCredentials"
                          iconPath={mdiAccountKey}
                        >
                          Add {provider_id} credentials
                        </Btn>
                      );
                    }
                  ),
                rightContent:
                  noCredentials ? null : (
                    <Btn
                      title="View info"
                      className="show-on-parent-hover"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setViewModelForm({ fieldName: "id", value: id });
                      }}
                      color="action"
                      iconPath={mdiPencil}
                    />
                  ),
                disabledInfo: noCredentials ? "No credentials" : undefined,
              } satisfies FullOption<number>;
            },
          )
          // .toSorted(
          //   (a, b) =>
          //     (a.disabledInfo?.length ?? 0) - (b.disabledInfo?.length ?? 0) ||
          //     a.label.localeCompare(b.label),
          // ) ?? []
        }
      />
    </>
  );
};
