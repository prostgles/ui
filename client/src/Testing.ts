import type { Command } from "../../common/Testing";
export * from "../../common/Testing";

//@ts-ignore
declare module "react" {
  interface HTMLAttributes<T> {
    "data-command"?: Command;
  }
}
