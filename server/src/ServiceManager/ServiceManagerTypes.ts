import type { JSONB } from "prostgles-types";
import { speechToTextService } from "./services/speechToText/speechToText.service";
import type { JSONBTypeIfDefined } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { webSearchSearxngService } from "./services/webSearchSearxng/webSearchSearxng.service";
import type {
  ExecutionResult,
  ProcessLog,
} from "@src/McpHub/DockerSandbox/executeDockerCommand";

export type DockerGPUS = "none" | "all" | number | number[];

export type ProstglesService = {
  icon: string;
  label: string;
  description: string;
  port: number;
  /**
   * Defaults to port.
   * If the port is already in use on the host, a different port will be chosen.
   */
  hostPort?: number;
  env?: Record<string, string>;
  configs?: Record<
    string,
    {
      label: string;
      description: string;
      defaultOption: string;
      options: Record<
        string,
        {
          env: Record<string, string>;
          buildArgs?: Record<string, string>;
          gpus?: DockerGPUS;
        }
      >;
    }
  >;
  gpus?: DockerGPUS;
  healthCheck: { endpoint: string; method?: "GET" | "POST" };
  volumes?: Record<string, string>;
  bind?: Record<
    /**
     * source, src
     * The location of the file or directory on the host. This can be an absolute or relative path.
     */
    string,
    {
      /**
       * destination, dst, target
       * The path where the file or directory is mounted in the container. Must be an absolute path.
       */
      containerPath: string;
      /**
       * readonly, ro
       * Whether to mount the bind as read-only.
       */
      readOnly?: boolean;
    }
  >;
  endpoints: Record<
    string,
    {
      method: "GET" | "POST";
      description: string;
      /* Defaults to 'body' for POST and 'query' for GET */
      inputType?: "body" | "query";
      inputSchema: JSONB.FieldType | undefined;
      outputSchema: JSONB.FieldType | undefined;
    }
  >;
};

export const prostglesServices = {
  speechToText: speechToTextService,
  webSearchSearxng: webSearchSearxngService,
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
      fetchOptions?: Omit<RequestInit, "method" | "body">,
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
  | {
      status: "error";
      error: unknown;
    }
  | {
      status: "stopped";
    }
  | RunningServiceInstance<Service>;

export type OnServiceLogs = (logs: ProcessLog[]) => void;
