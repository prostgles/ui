export type ProstglesInitState = ({
  isElectron: boolean;
  electronCredsProvided?: boolean;
  error?: any;
  ok: boolean;
  canTryStartProstgles: boolean;
  canDumpAndRestore: {
    psql: string;
    pg_dump: string;
    pg_restore: string;
  } | undefined;
}) 

export type ServerState = Omit<ProstglesInitState, "canTryStartProstgles">