import type { JSONB, MaybePromise } from "prostgles-types";
import type { DBHandlerServerRestricted } from "prostgles-server";
import type { PermissionScope } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";

export type AlertMessage = { title: string; body: string };
export type AlertType<
  S = void,
  P extends JSONB.ObjectType["type"] = JSONB.ObjectType["type"],
> = {
  params: P;
  permissionScope?: (recipientId: string) => PermissionScope;
  prepare: (context: {
    clientDb: DBHandlerServerRestricted<S>;
    params: JSONB.GetObjectType<P>;
    recipientId: string;
    localDate: string;
    signal: AbortSignal;
  }) => Promise<AlertMessage | null>;
};

/** Register reusable behaviour. Individual alerts and recipients live in managed tables. */
export const createAlertDefiner =
  <S = void>() =>
  <const P extends JSONB.ObjectType["type"]>(definition: AlertType<S, P>) =>
    definition;

export type AlertChannel = {
  /** At-least-once delivery: use idempotencyKey when supported. Re-resolve the destination and honour signal. */
  send: (context: {
    recipientId: string;
    message: AlertMessage;
    idempotencyKey: string;
    signal: AbortSignal;
  }) => MaybePromise<{ providerId: string | null }>;
};

export type AlertsOptions<S = void> = {
  /** Defaults to alerts; also manages <tableName>_recipients and <tableName>_deliveries. */
  tableName?: string;
  types: Record<string, AlertType<S, any>>;
  channels: Record<string, AlertChannel>;
};
