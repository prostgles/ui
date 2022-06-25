import { AnyObject, TS_COLUMN_DATA_TYPES } from ".";
import { md5 } from "./md5";

export function asName(str: string) {
  if (str === null || str === undefined || !str.toString || !str.toString()) throw "Expecting a non empty string";

  return `"${str.toString().replace(/"/g, `""`)}"`;
}

export function stableStringify(data: AnyObject, opts: any) {
  if (!opts) opts = {};
  if (typeof opts === 'function') opts = { cmp: opts };
  var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;

  var cmp = opts.cmp && (function (f) {
    return function (node: any) {
      return function (a: any, b: any) {
        var aobj = { key: a, value: node[a] };
        var bobj = { key: b, value: node[b] };
        return f(aobj, bobj);
      };
    };
  })(opts.cmp);

  var seen: any[] = [];
  return (function stringify(node) {
    if (node && node.toJSON && typeof node.toJSON === 'function') {
      node = node.toJSON();
    }

    if (node === undefined) return;
    if (typeof node == 'number') return isFinite(node) ? '' + node : 'null';
    if (typeof node !== 'object') return JSON.stringify(node);

    var i, out;
    if (Array.isArray(node)) {
      out = '[';
      for (i = 0; i < node.length; i++) {
        if (i) out += ',';
        out += stringify(node[i]) || 'null';
      }
      return out + ']';
    }

    if (node === null) return 'null';

    if (seen.indexOf(node) !== -1) {
      if (cycles) return JSON.stringify('__cycle__');
      throw new TypeError('Converting circular structure to JSON');
    }

    var seenIndex = seen.push(node) - 1;
    var keys = Object.keys(node).sort(cmp && cmp(node));
    out = '';
    for (i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = stringify(node[key]);

      if (!value) continue;
      if (out) out += ',';
      out += JSON.stringify(key) + ':' + value;
    }
    seen.splice(seenIndex, 1);
    return '{' + out + '}';
  })(data);
};


export type TextPatch = {
  from: number;
  to: number;
  text: string;
  md5: string;
}

export function getTextPatch(oldStr: string, newStr: string): TextPatch | string {

  /* Big change, no point getting diff */
  if (!oldStr || !newStr || !oldStr.trim().length || !newStr.trim().length) return newStr;

  /* Return no change if matching */
  if (oldStr === newStr) return {
    from: 0,
    to: 0,
    text: "",
    md5: md5(newStr)
  }

  function findLastIdx(direction = 1) {

    let idx = direction < 1 ? -1 : 0, found = false;
    while (!found && Math.abs(idx) <= newStr.length) {
      const args = direction < 1 ? [idx] : [0, idx];

      let os = oldStr.slice(...args),
        ns = newStr.slice(...args);

      if (os !== ns) found = true;
      else idx += Math.sign(direction) * 1;
    }

    return idx;
  }

  let from = findLastIdx() - 1,
    to = oldStr.length + findLastIdx(-1) + 1,
    toNew = newStr.length + findLastIdx(-1) + 1;
  return {
    from,
    to,
    text: newStr.slice(from, toNew),
    md5: md5(newStr)
  }
}


export function unpatchText(original: string, patch: TextPatch): string {
  if (!patch || typeof patch === "string") return (patch as unknown as string);
  const { from, to, text, md5: md5Hash } = patch;
  if (text === null || original === null) return text;
  let res = original.slice(0, from) + text + original.slice(to);
  if (md5Hash && md5(res) !== md5Hash) throw "Patch text error: Could not match md5 hash: (original/result) \n" + original + "\n" + res;
  return res;
}


/* Replication */
export type SyncTableInfo = {
  id_fields: string[];
  synced_field: string;
  throttle: number;
  batch_size: number;
};

export type BasicOrderBy = {
  fieldName: string;
  /**
   * Used to ensure numbers are not left as strings in some cases
   */
  tsDataType: TS_COLUMN_DATA_TYPES;
  asc: boolean;
}[];

export type WALConfig = SyncTableInfo & {
  /**
   * Fired when new data is added and there is no sending in progress
   */
  onSendStart?: () => any;
  /**
   * Fired on each data send batch
   */
  onSend: (items: any[], fullItems: WALItem[]) => Promise<any>;
  /**
   * Fired after all data was sent or when a batch error is thrown
   */
  onSendEnd?: (batch: any[], fullItems: WALItem[], error?: any) => any;

  /**
   * Order by which the items will be synced. Defaults to [synced_field, ...id_fields.sort()]
   */
  orderBy?: BasicOrderBy;

  /**
   * Defaults to 2 seconds
   */
  historyAgeSeconds?: number;

  DEBUG_MODE?: boolean;

  id?: string;
};
export type WALItem = {
  initial?: any;
  current: any;
};
export type WALItemsObj = { [key: string]: WALItem };

/**
 * Used to throttle and combine updates sent to server
 * This allows a high rate of optimistic updates on the client
 */
export class WAL {

  /**
   * Instantly merged records for prepared for update
   */
  private changed: WALItemsObj = {};

  /**
   * Batch of records (removed from this.changed) that are currently being sent 
   */
  private sending: WALItemsObj = {};

  /**
   * Historic data used to reduce data pushes from server to client
   */
  private sentHistory: Record<string, AnyObject> = {};

  private options: WALConfig;
  private callbacks: { cb: Function, idStrs: string[] }[] = [];

  constructor(args: WALConfig) {
    this.options = { ...args };
    if (!this.options.orderBy) {
      const { synced_field, id_fields } = args;
      this.options.orderBy = [synced_field, ...id_fields.sort()]
        .map(fieldName => ({
          fieldName,
          tsDataType: fieldName === synced_field ? "number" : "string",
          asc: true
        }));
    }
  }

  sort = (a?: AnyObject, b?: AnyObject): number => {
    const { orderBy } = this.options;
    if (!orderBy || !a || !b) return 0;

    return orderBy.map(ob => {
      /* TODO: add fullData to changed items + ensure orderBy is in select */
      if (!(ob.fieldName in a) || !(ob.fieldName in b)) {
        throw `Replication error: \n   some orderBy fields missing from data`;
      }
      let v1 = ob.asc ? a[ob.fieldName] : b[ob.fieldName],
        v2 = ob.asc ? b[ob.fieldName] : a[ob.fieldName];

      let vNum = +v1 - +v2,
        vStr = v1 < v2 ? -1 : v1 == v2 ? 0 : 1;
      return (ob.tsDataType === "number" && Number.isFinite(vNum)) ? vNum : vStr
    }).find(v => v) || 0;
  }

  isSending(): boolean {

    const result = this.isOnSending || !(isEmpty(this.sending) && isEmpty(this.changed));
    if (this.options.DEBUG_MODE) {
      console.log(this.options.id, " CHECKING isSending ->", result)
    }
    return result
  }

  /**
   * Used by server to avoid unnecessary data push to client.
   * This can happen due to the same data item having been previously pushed by the client
   * @param item data item
   * @returns boolean
   */
  isInHistory = (item: AnyObject): boolean => {
    if (!item) throw "Provide item";
    const itemSyncVal = item[this.options.synced_field]
    if (!Number.isFinite(+itemSyncVal)) throw "Provided item Synced field value is missing/invalid ";

    const existing = this.sentHistory[this.getIdStr(item)];
    const existingSyncVal = existing?.[this.options.synced_field];
    if (existing) {
      if (!Number.isFinite(+existingSyncVal)) throw "Provided historic item Synced field value is missing/invalid";
      if (+existingSyncVal === +itemSyncVal) {
        return true
      }
    }
    return false;
  }

  getIdStr(d: AnyObject): string {
    return this.options.id_fields.sort().map(key => `${d[key] || ""}`).join(".");
  }
  getIdObj(d: AnyObject): AnyObject {
    let res: AnyObject = {};
    this.options.id_fields.sort().map(key => {
      res[key] = d[key];
    });
    return res;
  }
  getDeltaObj(d: AnyObject): AnyObject {
    let res: AnyObject = {};
    Object.keys(d).map(key => {
      if (!this.options.id_fields.includes(key)) {
        res[key] = d[key];
      }
    });
    return res;
  }

  addData = (data: WALItem[]) => {
    if (isEmpty(this.changed) && this.options.onSendStart) this.options.onSendStart();

    data.map(d => {
      const { initial, current } = { ...d };
      if (!current) throw "Expecting { current: object, initial?: object }";
      const idStr = this.getIdStr(current);

      this.changed ??= {};
      this.changed[idStr] ??= { initial, current };
      this.changed[idStr].current = {
        ...this.changed[idStr].current,
        ...current
      };
    });
    this.sendItems();
  }

  isOnSending = false;
  isSendingTimeout?: ReturnType<typeof setTimeout> = undefined;
  willDeleteHistory?: ReturnType<typeof setTimeout> = undefined;
  private sendItems = async () => {
    const { DEBUG_MODE, onSend, onSendEnd, batch_size, throttle, historyAgeSeconds = 2 } = this.options;

    // Sending data. stop here
    if (this.isSendingTimeout || this.sending && !isEmpty(this.sending)) return;

    // Nothing to send. stop here
    if (!this.changed || isEmpty(this.changed)) return;

    // Prepare batch to send
    let batchItems: AnyObject[] = [],
      walBatch: WALItem[] = [],
      batchObj: Record<string, AnyObject> = {};

    /**
     * Prepare and remove a batch from this.changed
     */
    Object.keys(this.changed)
      .sort((a, b) => this.sort(this.changed[a].current, this.changed[b].current))
      .slice(0, batch_size)
      .map(key => {
        let item = { ...this.changed[key] };
        this.sending[key] = { ...item };
        walBatch.push({ ...item });

        /* Used for history */
        batchObj[key] = { ...item.current };

        delete this.changed[key];
      });
    batchItems = walBatch.map(d => d.current);

    if (DEBUG_MODE) {
      console.log(this.options.id, " SENDING lr->", batchItems[batchItems.length - 1])
    }

    // Throttle next data send
    if (!this.isSendingTimeout) {
      this.isSendingTimeout = setTimeout(() => {
        this.isSendingTimeout = undefined;
        if (!isEmpty(this.changed)) {
          this.sendItems();
        }
      }, throttle);
    }


    let error: any;
    this.isOnSending = true;
    try {
      /* Deleted data should be sent normally through await db.table.delete(...) */
      await onSend(batchItems, walBatch);//, deletedData);

      /**
       * Keep history if required
       */
      if (historyAgeSeconds) {
        this.sentHistory = {
          ...this.sentHistory,
          ...batchObj,
        }
        /**
         * Delete history after some time
         */
        if (!this.willDeleteHistory) {
          this.willDeleteHistory = setTimeout(() => {
            this.willDeleteHistory = undefined;
            this.sentHistory = {};
          }, historyAgeSeconds * 1000);
        }
      }
    } catch (err) {
      error = err;
      console.error("WAL onSend failed:", err, batchItems, walBatch)
    }
    this.isOnSending = false;

    /* Fire any callbacks */
    if (this.callbacks.length) {
      const ids = Object.keys(this.sending);
      this.callbacks.forEach((c, i) => {
        c.idStrs = c.idStrs.filter(id => ids.includes(id));
        if (!c.idStrs.length) {
          c.cb(error);
        }
      });
      this.callbacks = this.callbacks.filter(cb => cb.idStrs.length)
    }

    this.sending = {};
    if (DEBUG_MODE) {
      console.log(this.options.id, " SENT lr->", batchItems[batchItems.length - 1])
    }
    if (!isEmpty(this.changed)) {
      this.sendItems();
    } else {
      if (onSendEnd) onSendEnd(batchItems, walBatch, error);
    }
  };
};

export function isEmpty(obj?: any): boolean {
  for (var v in obj) return false;
  return true;
}


/* Get nested property from an object */
export function get(obj: any, propertyPath: string | string[]): any {

  let p = propertyPath,
    o = obj;

  if (!obj) return obj;
  if (typeof p === "string") p = p.split(".");
  return p.reduce((xs, x) => {
    if (xs && xs[x]) {
      return xs[x]
    } else {
      return undefined;
    }
  }, o);
}


export function isObject(obj: any): obj is Record<string, any> {
  return Boolean(obj && typeof obj === "object" && !Array.isArray(obj));
}
export function isDefined<T>(v: T | undefined | void): v is T { return v !== undefined && v !== null }

export function getKeys<T>(o: T): Array<keyof T>{
  return Object.keys(o) as any
}

export type Explode<T> = keyof T extends infer K
  ? K extends unknown
  ? { [I in keyof T]: I extends K ? T[I] : never }
  : never
  : never;
export type AtMostOne<T> = Explode<Partial<T>>;
export type AtLeastOne<T, U = {[K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]
export type ExactlyOne<T> = AtMostOne<T> & AtLeastOne<T>