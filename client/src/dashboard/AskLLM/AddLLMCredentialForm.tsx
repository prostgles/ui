import { mdiPlus } from "@mdi/js";
import { useEffectDeep, usePromise } from "prostgles-client/dist/prostgles";
import React, { useEffect, useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import PopupMenu from "../../components/PopupMenu";
import Select, { type FullOption } from "../../components/Select/Select";

export const AddLLMCredentialForm = ({ dbs }: Pick<Prgl, "dbs">) => {
  const [apiKey, setAPIKey] = React.useState("");
  const [providerName, setProviderName] =
    React.useState<(typeof providers)[number]["name"]>("OpenAI");
  const [endPoint, setEndPoint] = useState<string>();
  const [modelName, setModel] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    setName(providerName);
  }, [providerName]);
  const { data: existingCreds } = dbs.llm_credentials.useSubscribe();
  const nameClash = existingCreds?.find((c) => c.name === name);

  const models: ModelInfo[] | undefined = usePromise(async () => {
    const provider = providers.find((p) => p.name === providerName);
    if (!provider) return [];
    return {
      OpenAI: OpenAIModels,
      Google: GoogleModels,
      Anthropic: AnthropicModels,
    }[providerName];

    // const models = await fetchOpenAIModels(apiKey);
    // const res = models.filter(
    //   (m) => m.id.startsWith("gpt-") || m.id.startsWith("o-"),
    // );
  }, [providerName]);

  const provider = providers.find((p) => p.name === providerName);
  useEffectDeep(() => {
    const defaultModel =
      models?.find((m) => m.id === "gpt-4o-2024-08-06")?.id ?? models?.[0]?.id;
    setModel(defaultModel ?? "");
  }, [models]);

  if (!existingCreds) return null;

  const disabledInfo =
    provider?.name === "Custom" ?
      !endPoint ? "Provide an endpoint"
      : undefined
    : !apiKey ? "Please provide an API key"
    : !modelName ? "Please select model"
    : !provider ? "Provider not specified"
    : undefined;
  return (
    <PopupMenu
      title="Add LLM Provider"
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
              name,
              is_default: existingCreds.length === 0,
              config:
                providerName === "OpenAI" ?
                  {
                    Provider: providerName,
                    API_Key: apiKey,
                    model: modelName,
                  }
                : providerName === "Anthropic" ?
                  {
                    Provider: providerName,
                    API_Key: apiKey,
                    "anthropic-version": "2023-06-01",
                    max_tokens: 2048,
                    model: modelName,
                  }
                : {
                    Provider: providerName,
                  },
              endpoint: endPoint
                ?.replace("MODEL", modelName)
                .replace("KEY", apiKey),
            });
            pClose?.(e);
          },
        },
      ]}
    >
      <FlexCol>
        <FormField
          label={"Name"}
          value={name}
          onChange={setName}
          error={nameClash ? "Name already exists" : undefined}
        />
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
          value={modelName}
          fullOptions={
            models?.map(
              (m) =>
                ({
                  key: m.id,
                  subLabel: `$${m.inputPrice} M input/$${m.outputPrice} M output`,
                }) satisfies FullOption,
            ) ?? []
          }
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
    name: "Google",
    modelEndpoint:
      "https://generativelanguage.googleapis.com/v1beta/models/MODEL:generateContent?key=KEY",
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

type ModelInfo = {
  id: string;
  /**
   * Prices are per 1M tokens
   */
  inputPrice: number;
  outputPrice: number;
  cachedInput?: number;
} & (
  | {
      maxInputPrice?: undefined;
      maxOutputPrice?: undefined;
      tokenLimit?: undefined;
    }
  | {
      maxInputPrice: number;
      maxOutputPrice: number;
      tokenLimit: number;
    }
);

/**
 * https://www.anthropic.com/pricing#anthropic-api
 */
export const AnthropicModels = [
  { id: "claude-3-7-sonnet-20250219", inputPrice: 3, outputPrice: 15 },
  { id: "claude-3-5-sonnet-20241022", inputPrice: 3, outputPrice: 15 },
  { id: "claude-3-5-sonnet-20240620", inputPrice: 3, outputPrice: 15 },
  { id: "claude-3-sonnet-20240229", inputPrice: 3, outputPrice: 15 },
  { id: "claude-3-5-haiku-20241022", inputPrice: 0.8, outputPrice: 4 },
  { id: "claude-3-opus-20240229", inputPrice: 15, outputPrice: 75 },
] as const satisfies ModelInfo[];

/**
 * https://ai.google.dev/gemini-api/docs/pricing
 */
export const GoogleModels = [
  { id: "gemini-2.0-flash", inputPrice: 0.1, outputPrice: 0.4 },
  {
    id: "gemini-1.5-flash",
    inputPrice: 0.075,
    outputPrice: 0.3,
    maxInputPrice: 0.15,
    maxOutputPrice: 0.6,
    tokenLimit: 128_000,
  },
  { id: "gemini-1.5-flash-8b", inputPrice: 0.0375, outputPrice: 0.15 },
  { id: "gemini-1.5-pro", inputPrice: 1.25, outputPrice: 5 },
] as const satisfies ModelInfo[];

/**
 * https://platform.openai.com/docs/pricing
 */
export const OpenAIModels = [
  {
    id: "o1",
    inputPrice: 15,
    cachedInput: 7.5,
    outputPrice: 60,
  },
  {
    id: "o1-mini-2024-09-12",
    inputPrice: 1.1,
    cachedInput: 0.55,
    outputPrice: 4.4,
  },
  {
    id: "o3-mini-2025-01-31",
    inputPrice: 1.1,
    cachedInput: 0.55,
    outputPrice: 4.4,
  },
  {
    id: "gpt-4.5-preview-2025-02-27",
    inputPrice: 75,
    cachedInput: 37.5,
    outputPrice: 150,
  },
  {
    id: "gpt-4o-2024-08-06",
    inputPrice: 2.5,
    cachedInput: 1.25,
    outputPrice: 10,
  },
  {
    id: "gpt-4o-mini-2024-07-18",
    inputPrice: 0.15,
    cachedInput: 0.075,
    outputPrice: 0.6,
  },
] as const satisfies ModelInfo[];
