import { PostgresNotifListenManager } from "./PostgresNotifListenManager";
import { DB, PGP } from "./Prostgles";
import { PRGLIOSocket } from "./DboBuilder";
export declare class DBEventsManager {
    notifies: {
        [key: string]: {
            socketChannel: string;
            sockets: any[];
            localFuncs: ((payload: string) => void)[];
            notifMgr: PostgresNotifListenManager;
        };
    };
    notice: {
        socketChannel: string;
        socketUnsubChannel: string;
        sockets: any[];
    };
    notifManager?: PostgresNotifListenManager;
    db_pg: DB;
    pgp: PGP;
    constructor(db_pg: DB, pgp: PGP);
    private onNotif;
    onNotice: (notice: any) => void;
    getNotifChannelName: (channel: string) => Promise<any>;
    addNotify(query: string, socket?: PRGLIOSocket, func?: any): Promise<{
        socketChannel: string;
        socketUnsubChannel: string;
        notifChannel: string;
        unsubscribe?: () => void;
    }>;
    removeNotify(channel?: string, socket?: PRGLIOSocket, func?: any): void;
    addNotice(socket: PRGLIOSocket): {
        socketChannel: string;
        socketUnsubChannel: string;
    };
    removeNotice(socket: PRGLIOSocket): void;
}
//# sourceMappingURL=DBEventsManager.d.ts.map