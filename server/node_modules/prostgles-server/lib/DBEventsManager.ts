import { PostgresNotifListenManager, PrglNotifListener } from "./PostgresNotifListenManager";
import { DB, PGP } from "./Prostgles";
import { getKeys, CHANNELS } from "prostgles-types";
import { PRGLIOSocket } from "./DboBuilder";

export class DBEventsManager {

  notifies: { 
    [key: string]: {
      socketChannel: string;
      sockets: any[]; 
      localFuncs: ((payload: string) => void)[];
      notifMgr: PostgresNotifListenManager;
    } 
  } = {};

  notice: {
    socketChannel: string;
    socketUnsubChannel: string;
    sockets: any[];
  } = {
    socketChannel: CHANNELS.NOTICE_EV,
    socketUnsubChannel: CHANNELS.NOTICE_EV + "unsubscribe",
    sockets: []
  };

  notifManager?: PostgresNotifListenManager;

  db_pg: DB;
  pgp: PGP
  constructor(db_pg: DB, pgp: PGP){
    this.db_pg = db_pg;
    this.pgp = pgp;
  }

  private onNotif: PrglNotifListener = ({ channel, payload }) => {

    // console.log(36, { channel, payload },  Object.keys(this.notifies));

    Object.keys(this.notifies)
      .filter(ch => ch === channel)
      .map(ch => {
        const sub = this.notifies[ch];
        
        sub.sockets.map(s => {
          s.emit(sub.socketChannel, payload)
        });
        sub.localFuncs.map(lf => {
          lf(payload);
        })
      });
  }

  onNotice = (notice: any) => {
    if(this.notice && this.notice.sockets.length){
      this.notice.sockets.map(s => {
        s.emit(this.notice.socketChannel, notice);
      })
    }
  }

  getNotifChannelName = async (channel: string) => {
    const c = await this.db_pg.one("SELECT quote_ident($1) as c", channel);
    return c.c;
  }

  async addNotify(query: string, socket?: PRGLIOSocket, func?: any): Promise<{
    socketChannel: string;
    socketUnsubChannel: string;
    notifChannel: string;
    unsubscribe?: () => void;
  }> {
    if(typeof query !== "string" || (!socket && !func)){
      throw "Expecting (query: string, socket?, localFunc?) But received: " + JSON.stringify({ query, socket, func });
    }

    /* Remove comments */
    let q = query.trim()
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'\n')
      .split("\n").map(v => v.trim()).filter(v => v && !v.startsWith("--"))
      .join("\n");

    /* Find the notify channel name */
    if(!q.toLowerCase().startsWith("listen")){
      throw "Expecting a LISTEN query but got: " + query;
    }
    q = q.slice(7).trim(); // Remove listen
    if(q.endsWith(";")) q = q.slice(0, -1);

    if(q.startsWith('"') && q.endsWith('"')) {
      q = q.slice(1, -1);
    } else {
      /* Replicate PG by lowercasing identifier if not quoted */
      q = q.toLowerCase();
    }
    q = q.replace(/""/g, `"`);

    let channel = q;    
    let notifChannel = await this.getNotifChannelName(channel)

    notifChannel = notifChannel.replace(/""/g, `"`);
    if(notifChannel.startsWith('"')) notifChannel = notifChannel.slice(1, -1);

    const socketChannel = CHANNELS.LISTEN_EV + notifChannel,
      socketUnsubChannel = socketChannel + "unsubscribe";

    if(!this.notifies[notifChannel]){
      this.notifies[notifChannel] = {
        socketChannel,
        sockets: socket? [socket] : [],
        localFuncs: func? [func] : [],
        notifMgr: await PostgresNotifListenManager.create(this.db_pg, this.onNotif, channel)
      }

    } else {
      if(socket && !this.notifies[notifChannel].sockets.find(s => s.id === socket.id)) {
        this.notifies[notifChannel].sockets.push(socket);

      } else if(func) {
        this.notifies[notifChannel].localFuncs.push(func);
      }
    }

    if(socket){
      socket.removeAllListeners(socketUnsubChannel);
      socket.on(socketUnsubChannel, ()=>{
        this.removeNotify(notifChannel, socket);
      });
    }

    return {
      // unsubscribe: () => this.removeNotify(notifChannel, socket, func),
      socketChannel,
      socketUnsubChannel,
      notifChannel,
    }
  }

  removeNotify(channel?: string, socket?: PRGLIOSocket, func?: any){
    if(channel && this.notifies[channel]){
      if(socket){
        this.notifies[channel].sockets = this.notifies[channel].sockets.filter(s => s.id !== socket.id);
      } else if(func){
        this.notifies[channel].localFuncs = this.notifies[channel].localFuncs.filter(f => f !== func);
      }

      /* UNLISTEN if no listeners ?? */
    }

    if(socket){
      getKeys(this.notifies).forEach(channel => {
        this.notifies[channel].sockets = this.notifies[channel].sockets.filter(s => s.id !== socket.id);
      })
    }
  }

  addNotice(socket: PRGLIOSocket){
    if(!socket || !socket.id) throw "Expecting a socket obj with id";

    if(!this.notice.sockets.find(s => s.id === socket.id)){
      this.notice.sockets.push(socket);
    }

    const { socketChannel, socketUnsubChannel } = this.notice;

    socket.removeAllListeners(socketUnsubChannel);
    socket.on(socketUnsubChannel, () => {
      this.removeNotice(socket);
    });

    return { socketChannel, socketUnsubChannel, }
  }

  removeNotice(socket: PRGLIOSocket){
    if(!socket || !socket.id) throw "Expecting a socket obj with id";
    this.notice.sockets = this.notice.sockets.filter(s => s.id !== socket.id)
  }
}