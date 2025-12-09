import type { JSONB } from "prostgles-types";
import { speechToTextService } from "./services/speechToText/speechToText.service";
import type {
  ExecutionResult,
  ProcessLog,
} from "@src/DockerManager/executeDockerCommand";

export type ProstglesService = {
  icon: string;
  description: string;
  port: number;
  env?: Record<string, string>;
  healthCheckEndpoint: string;
  endpoints: Record<
    string,
    {
      method: "GET" | "POST";
      description: string;
      inputSchema: JSONB.JSONBSchema | undefined;
      outputSchema: JSONB.JSONBSchema | undefined;
    }
  >;
};

export const prostglesServices = {
  speechToText: speechToTextService,
};

export type ServiceInstance =
  | {
      status: "building";
      building: Promise<ExecutionResult>;
      stop: () => void;
    }
  | {
      status: "building-done";
    }
  | {
      status: "build-error";
      error: unknown;
    }
  | {
      status: "starting";
      getLogs: () => ProcessLog[];
      stop: () => void;
    }
  | {
      status: "running";
      getLogs: () => ProcessLog[];
      stop: () => void;
    }
  | {
      status: "error";
      error: unknown;
    };

export type OnServiceLogs = (logs: ProcessLog[]) => void;
