import { mdiPlus } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/prostgles";
import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";

type P = {
  dbs: Prgl["dbs"];
};

export const AddLLMCredentialForm = ({ dbs }: P) => {
  const [apiKey, setAPIKey] = React.useState("");
  const [providerName, setProviderName] =
    React.useState<(typeof providers)[number]["name"]>("OpenAI");
  const [endPoint, setEndPoint] = React.useState<string>();
  const [model, setModel] = React.useState("");
  const { data: existingCreds } = dbs.llm_credentials.useSubscribe();

  const models = usePromise(async () => {
    const provider = providers.find((p) => p.name === providerName);
    if (!provider || !apiKey) return [];
    if (providerName === "OpenAI") {
      const models = await fetchOpenAIModels(apiKey);
      const res = models.filter(
        (m) => m.id.startsWith("gpt-") || m.id.startsWith("o-"),
      );
      const defaultModel =
        res.find((m) => m.id === "gpt-4o-2024-11-20")?.id ?? res[0]?.id;
      if (defaultModel) {
        setModel(defaultModel);
      }
      return res;
    }

    return AnthropicModels;
  }, [providerName, apiKey]);

  const provider = providers.find((p) => p.name === providerName);

  if (!existingCreds) return null;

  const disabledInfo =
    provider?.name === "Custom" ?
      !endPoint ? "Provide an endpoint"
      : undefined
    : !apiKey ? "Please provide an API key"
    : !model ? "Please select model"
    : !provider ? "Provider not specified"
    : undefined;
  return (
    <PopupMenu
      title="Add AI Provider"
      positioning="center"
      data-command="AddLLMCredentialForm"
      clickCatchStyle={{ opacity: 1 }}
      onClickClose={false}
      button={
        <Btn variant="filled" color="action" iconPath={mdiPlus}>
          Add new credential
        </Btn>
      }
      footerButtons={(pClose) => [
        {
          label: "Close",
          onClickClose: true,
        },
        {
          label: "Save",
          variant: "filled",
          color: "action",
          disabledInfo,
          "data-command": "AddLLMCredentialForm.Save",
          onClick: async (e) => {
            if (disabledInfo) return;
            await dbs.llm_credentials.insert({
              user_id: undefined as any,
              name: providerName,
              is_default: existingCreds.length === 0,
              config:
                providerName === "OpenAI" ?
                  {
                    Provider: providerName,
                    API_Key: apiKey,
                    model,
                  }
                : providerName === "Anthropic" ?
                  {
                    Provider: providerName,
                    API_Key: apiKey,
                    "anthropic-version": "2023-06-01",
                    max_tokens: 2048,
                    model,
                  }
                : {
                    Provider: providerName,
                  },
              endpoint: endPoint,
            });
            pClose?.(e);
          },
        },
      ]}
    >
      <FlexCol>
        <Select
          label={"Provider"}
          value={providerName}
          data-command="AddLLMCredentialForm.Provider"
          fullOptions={providers.map((p) => ({ key: p.name }))}
          onChange={setProviderName}
        />
        <FormField label={"API Key"} value={apiKey} onChange={setAPIKey} />
        <Select
          label={"Model"}
          value={model}
          disabledInfo={!apiKey ? "Please provide an API key" : undefined}
          fullOptions={models?.map((m) => ({ key: m.id })) ?? []}
          onChange={setModel}
        />
        <FormField
          id="endpoint"
          optional={true}
          label={"Endpoint"}
          value={endPoint ?? provider?.modelEndpoint}
          onChange={setEndPoint}
        />
      </FlexCol>
    </PopupMenu>
  );
};

const providers = [
  {
    name: "OpenAI",
    modelEndpoint: "https://api.openai.com/v1/chat/completions",
  },
  {
    name: "Anthropic",
    modelEndpoint: "https://api.anthropic.com/v1/messages",
  },
  {
    name: "Custom",
    modelEndpoint: "",
  },
] as const;

const fetchOpenAIModels = async (bearerToken: string) => {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const models = data.data as OpenAIModel[];
    return models.sort((b, a) => +a.created - +b.created);
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    throw error;
  }
};

type OpenAIModel = {
  id: string;
  created: number;
  object: "model";
  owned_by: string;
};

const AnthropicModels = [
  { id: "claude-3-5-sonnet-20241022" },
  { id: "claude-3-5-haiku-20241022" },
  { id: "claude-3-opus-20240229" },
  { id: "claude-3-sonnet-20240229" },
  { id: "claude-3-haiku-20240307	" },
];
