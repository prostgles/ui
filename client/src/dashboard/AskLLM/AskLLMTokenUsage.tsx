import React from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import Chip from "../../components/Chip";
import {
  AnthropicModels,
  GoogleModels,
  OpenAIModels,
} from "./AddLLMCredentialForm";

export const AskLLMTokenUsage = ({
  user_id,
  meta: rawMeta,
}: Pick<DBSSchema["llm_messages"], "meta" | "user_id">) => {
  const meta = getMeta(rawMeta);
  if (user_id || !meta) return null;
  const cost = getCost(meta);

  return (
    <Chip title={JSON.stringify({ cost, ...meta }, null, 2)}>
      {cost ? `$${cost.toFixed(2)}` : ""}
    </Chip>
  );
};

type OpenAIMeta = {
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details: {
      cached_tokens: number;
    };
    completion_tokens_details: {
      reasoning_tokens: number;
      accepted_prediction_tokens: number;
      rejected_prediction_tokens: number;
    };
  };
};

type AnthropicMeta = {
  model: string;
  usage: {
    input_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    output_tokens: number;
  };
};

type GeminiMeta = {
  modelVersion: string;
  usageMetadata: {
    totalTokenCount: number;
    promptTokenCount: number;
    promptTokensDetails: [{ modality: "TEXT"; tokenCount: number }];
    candidatesTokenCount: number;
    candidatesTokensDetails: [{ modality: "TEXT"; tokenCount: number }];
  };
};

const getMeta = (rawMeta: any) => {
  if (!rawMeta) return null;
  if (rawMeta.usage?.prompt_tokens) {
    const meta = rawMeta as OpenAIMeta;
    return { type: "openai", meta } as const;
  }
  if (rawMeta.usage?.input_tokens) {
    const meta = rawMeta as AnthropicMeta;
    return { type: "anthropic", meta } as const;
  }
  if (rawMeta.usageMetadata?.promptTokenCount) {
    const meta = rawMeta as GeminiMeta;
    return { type: "gemini", meta } as const;
  }
  return null;
};

const getCost = (meta: ReturnType<typeof getMeta>) => {
  if (!meta) return null;

  const modelName =
    meta.type === "gemini" ? meta.meta.modelVersion : meta.meta.model;
  const pricing = (
    meta.type === "anthropic" ? AnthropicModels
    : meta.type === "gemini" ? GoogleModels
    : OpenAIModels).find((m) => m.id === modelName);
  if (!pricing) return null;
  const { inputPrice, outputPrice } = pricing;
  const inputCount =
    meta.type === "gemini" ? meta.meta.usageMetadata.promptTokenCount
    : meta.type === "openai" ? meta.meta.usage.prompt_tokens
    : meta.meta.usage.input_tokens;
  const outputCount =
    meta.type === "gemini" ? meta.meta.usageMetadata.candidatesTokenCount
    : meta.type === "openai" ? meta.meta.usage.completion_tokens
    : meta.meta.usage.output_tokens;
  return (inputPrice / 1e6) * inputCount + (outputPrice / 1e6) * outputCount;
};
