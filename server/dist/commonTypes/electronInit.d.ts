export declare type ProstglesInitState = ({
    isElectron: boolean;
    electronCredsProvided?: boolean;
    initError?: any;
    connectionError?: any;
    ok: boolean;
    canTryStartProstgles: boolean;
    canDumpAndRestore: {
        psql: string;
        pg_dump: string;
        pg_restore: string;
    } | undefined;
});
export declare type ServerState = Omit<ProstglesInitState, "canTryStartProstgles">;
//# sourceMappingURL=electronInit.d.ts.map