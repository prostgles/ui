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
  return null;
  // const [apiKey, setAPIKey] = React.useState("");
  // const [providerName, setProviderName] =
  //   React.useState<(typeof providers)[number]["name"]>("OpenAI");
  // const [endPoint, setEndPoint] = useState<string>();
  // const [modelName, setModel] = useState("");
  // const [name, setName] = useState("");
  // useEffect(() => {
  //   setName(providerName);
  // }, [providerName]);
  // const { data: existingCreds } = dbs.llm_credentials.useSubscribe();
  // const nameClash = existingCreds?.find((c) => c.name === name);
  // const models: ModelInfo[] | undefined = usePromise(async () => {
  //   const provider = providers.find((p) => p.name === providerName);
  //   if (!provider) return [];
  //   return {
  //     OpenAI: OpenAIModels,
  //     Google: GoogleModels,
  //     Anthropic: AnthropicModels,
  //   }[providerName];
  //   // const models = await fetchOpenAIModels(apiKey);
  //   // const res = models.filter(
  //   //   (m) => m.id.startsWith("gpt-") || m.id.startsWith("o-"),
  //   // );
  // }, [providerName]);
  // const provider = providers.find((p) => p.name === providerName);
  // useEffectDeep(() => {
  //   const defaultModel =
  //     models?.find((m) => m.id === "gpt-4o-2024-08-06")?.id ?? models?.[0]?.id;
  //   setModel(defaultModel ?? "");
  // }, [models]);
  // if (!existingCreds) return null;
  // const disabledInfo =
  //   provider?.name === "Custom" ?
  //     !endPoint ? "Provide an endpoint"
  //     : undefined
  //   : !apiKey ? "Please provide an API key"
  //   : !modelName ? "Please select model"
  //   : !provider ? "Provider not specified"
  //   : undefined;
  // return (
  //   <PopupMenu
  //     title="Add LLM Provider"
  //     positioning="center"
  //     data-command="AddLLMCredentialForm"
  //     clickCatchStyle={{ opacity: 1 }}
  //     onClickClose={false}
  //     button={
  //       <Btn variant="filled" color="action" iconPath={mdiPlus}>
  //         Add new credential
  //       </Btn>
  //     }
  //     footerButtons={(pClose) => [
  //       {
  //         label: "Close",
  //         onClickClose: true,
  //       },
  //       {
  //         label: "Save",
  //         variant: "filled",
  //         color: "action",
  //         disabledInfo,
  //         "data-command": "AddLLMCredentialForm.Save",
  //         onClick: async (e) => {
  //           if (disabledInfo) return;
  //           await dbs.llm_credentials.insert({
  //             user_id: undefined as any,
  //             name,
  //             is_default: existingCreds.length === 0,
  //             config:
  //               providerName === "OpenAI" ?
  //                 {
  //                   Provider: providerName,
  //                   API_Key: apiKey,
  //                   model: modelName,
  //                 }
  //               : providerName === "Anthropic" ?
  //                 {
  //                   Provider: providerName,
  //                   API_Key: apiKey,
  //                   "anthropic-version": "2023-06-01",
  //                   max_tokens: 2048,
  //                   model: modelName,
  //                 }
  //               : {
  //                   Provider: providerName,
  //                 },
  //             endpoint: endPoint
  //               ?.replace("MODEL", modelName)
  //               .replace("KEY", apiKey),
  //           });
  //           pClose?.(e);
  //         },
  //       },
  //     ]}
  //   >
  //     <FlexCol>
  //       <FormField
  //         label={"Name"}
  //         value={name}
  //         onChange={setName}
  //         error={nameClash ? "Name already exists" : undefined}
  //       />
  //       <Select
  //         label={"Provider"}
  //         value={providerName}
  //         data-command="AddLLMCredentialForm.Provider"
  //         fullOptions={providers.map((p) => ({ key: p.name }))}
  //         onChange={setProviderName}
  //       />
  //       <FormField label={"API Key"} value={apiKey} onChange={setAPIKey} />
  //       <Select
  //         label={"Model"}
  //         value={modelName}
  //         fullOptions={
  //           models?.map(
  //             (m) =>
  //               ({
  //                 key: m.id,
  //                 subLabel: `$${m.inputPrice} M input/$${m.outputPrice} M output`,
  //               }) satisfies FullOption,
  //           ) ?? []
  //         }
  //         onChange={setModel}
  //       />
  //       <FormField
  //         id="endpoint"
  //         optional={true}
  //         label={"Endpoint"}
  //         value={endPoint ?? provider?.modelEndpoint}
  //         onChange={setEndPoint}
  //       />
  //     </FlexCol>
  //   </PopupMenu>
  // );
};
