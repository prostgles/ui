import type { JSONB } from "prostgles-types";
import { speechToTextService } from "./services/speechToText/speechToText.service";
import type {
  ExecutionResult,
  ProcessLog,
} from "@src/DockerManager/executeDockerCommand";
import type { JSONBTypeIfDefined } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers";

export type ProstglesService = {
  icon: string;
  label: string;
  description: string;
  port: number;
  env?: Record<string, string>;
  healthCheckEndpoint: string;
  volumes?: Record<string, string>;
  endpoints: Record<
    string,
    {
      method: "GET" | "POST";
      description: string;
      inputSchema: JSONB.FieldType | undefined;
      outputSchema: JSONB.FieldType | undefined;
    }
  >;
};

export const prostglesServices = {
  speechToText: speechToTextService,
};

export type RunningServiceInstance<
  Service extends ProstglesService = ProstglesService,
> = {
  status: "running";
  getLogs: () => ProcessLog[];
  stop: () => void;
  endpoints: {
    [endpoint in keyof Service["endpoints"]]: (
      args: JSONBTypeIfDefined<Service["endpoints"][endpoint]["inputSchema"]>,
    ) => Promise<
      JSONBTypeIfDefined<Service["endpoints"][endpoint]["outputSchema"]>
    >;
  };
};

export type ServiceInstance<
  Service extends ProstglesService = ProstglesService,
> =
  | {
      status: "building";
      building: Promise<ExecutionResult>;
      stop: () => void;
    }
  | {
      status: "building-done";
      buildHash: string;
      labels: Record<string, string>;
      labelArgs: string[];
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
  | RunningServiceInstance<Service>
  | {
      status: "error";
      error: unknown;
    };

export type OnServiceLogs = (logs: ProcessLog[]) => void;
