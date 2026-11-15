import type { FullFilter, MaybePromise } from "prostgles-types";
import type {
  DBHandlerServer,
  DBHandlerServerRestricted,
} from "prostgles-server";
import type { AlertQueryDefinition } from "./alertQuerySchema";

export type AlertMessage = { title: string; body: string };
export type AlertContext<S = void> = {
  clientDb: DBHandlerServerRestricted<S>;
  recipientId: string;
  localDate: string;
  signal: AbortSignal;
};
export type AlertChannel = {
  /** At-least-once delivery: use idempotencyKey when supported. Re-resolve the destination and honour signal. */
  send: (context: {
    dbo: DBHandlerServer;
    jobId: string;
    recipientId: string;
    message: AlertMessage;
    idempotencyKey: string;
    signal: AbortSignal;
  }) => MaybePromise<{ providerId: string | null }>;
};

export type AlertsOptions<S = void> = {
  /** Defaults to alerts; also manages <tableName>_channels and <tableName>_deliveries. */
  tableName?: string;
  /** Stable keys create one shared alert each. Existing alerts retain UI edits. */
  rules?: Record<string, AlertRule<S>>;
  channels: Record<string, AlertChannel>;
};

export type AlertRule<S = void> = {
  name: string;
  enabled: boolean;
  schedule: { cron: string; timezone: string };
  /** Matching active users are resolved when the alert runs. */
  userFilter: FullFilter<{ id: string; username: string; type: string }, void>;
  channels: string[];
} & (
  | AlertQueryDefinition
  | {
      prepare: (context: AlertContext<S>) => Promise<AlertMessage | null>;
      deduplicate?: never;
    }
);
