/* eslint-disable no-useless-escape */
export const wsLib = `
declare module 'ws' {
  // Type definitions for ws 8.5
  // Project: https://github.com/websockets/ws
  // Definitions by: Paul Loyd <https://github.com/loyd>
  //                 Margus Lamp <https://github.com/mlamp>
  //                 Philippe D'Alva <https://github.com/TitaneBoy>
  //                 reduckted <https://github.com/reduckted>
  //                 teidesu <https://github.com/teidesu>
  //                 Bartosz Wojtkowiak <https://github.com/wojtkowiak>
  //                 Kyle Hensel <https://github.com/k-yle>
  //                 Samuel Skeen <https://github.com/cwadrupldijjit>
  // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

  /// <reference types="node" />

  import { EventEmitter } from "events";
  import {
      Agent,
      ClientRequest,
      ClientRequestArgs,
      IncomingMessage,
      OutgoingHttpHeaders,
      Server as HTTPServer,
  } from "http";
  import { Server as HTTPSServer } from "https";
  import { Duplex, DuplexOptions } from "stream";
  import { SecureContextOptions } from "tls";
  import { URL } from "url";
  import { ZlibOptions } from "zlib";

  // WebSocket socket.
  declare class WebSocket extends EventEmitter {
      /** The connection is not yet open. */
      static readonly CONNECTING: 0;
      /** The connection is open and ready to communicate. */
      static readonly OPEN: 1;
      /** The connection is in the process of closing. */
      static readonly CLOSING: 2;
      /** The connection is closed. */
      static readonly CLOSED: 3;

      binaryType: "nodebuffer" | "arraybuffer" | "fragments";
      readonly bufferedAmount: number;
      readonly extensions: string;
      /** Indicates whether the websocket is paused */
      readonly isPaused: boolean;
      readonly protocol: string;
      /** The current state of the connection */
      readonly readyState:
          | typeof WebSocket.CONNECTING
          | typeof WebSocket.OPEN
          | typeof WebSocket.CLOSING
          | typeof WebSocket.CLOSED;
      readonly url: string;

      /** The connection is not yet open. */
      readonly CONNECTING: 0;
      /** The connection is open and ready to communicate. */
      readonly OPEN: 1;
      /** The connection is in the process of closing. */
      readonly CLOSING: 2;
      /** The connection is closed. */
      readonly CLOSED: 3;

      onopen: ((event: WebSocket.Event) => void) | null;
      onerror: ((event: WebSocket.ErrorEvent) => void) | null;
      onclose: ((event: WebSocket.CloseEvent) => void) | null;
      onmessage: ((event: WebSocket.MessageEvent) => void) | null;

      constructor(address: null);
      constructor(address: string | URL, options?: WebSocket.ClientOptions | ClientRequestArgs);
      constructor(
          address: string | URL,
          protocols?: string | string[],
          options?: WebSocket.ClientOptions | ClientRequestArgs,
      );

      close(code?: number, data?: string | Buffer): void;
      ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
      pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
      send(data: any, cb?: (err?: Error) => void): void;
      send(
          data: any,
          options: { mask?: boolean | undefined; binary?: boolean | undefined; compress?: boolean | undefined; fin?: boolean | undefined },
          cb?: (err?: Error) => void,
      ): void;
      terminate(): void;

      /**
       * Pause the websocket causing it to stop emitting events. Some events can still be
       * emitted after this is called, until all buffered data is consumed. This method 
       */
      pause(): void;
      /**
       * Make a paused socket resume emitting events. This method is a noop if the ready 
       */
      resume(): void;

      // HTML5 WebSocket events
      addEventListener(
          method: "message",
          cb: (event: WebSocket.MessageEvent) => void,
          options?: WebSocket.EventListenerOptions,
      ): void;
      addEventListener(
          method: "close",
          cb: (event: WebSocket.CloseEvent) => void,
          options?: WebSocket.EventListenerOptions,
      ): void;
      addEventListener(
          method: "error",
          cb: (event: WebSocket.ErrorEvent) => void,
          options?: WebSocket.EventListenerOptions,
      ): void;
      addEventListener(
          method: "open",
          cb: (event: WebSocket.Event) => void,
          options?: WebSocket.EventListenerOptions,
      ): void;

      removeEventListener(method: "message", cb: (event: WebSocket.MessageEvent) => void): void;
      removeEventListener(method: "close", cb: (event: WebSocket.CloseEvent) => void): void;
      removeEventListener(method: "error", cb: (event: WebSocket.ErrorEvent) => void): void;
      removeEventListener(method: "open", cb: (event: WebSocket.Event) => void): void;

      // Events
      on(event: "close", listener: (this: WebSocket, code: number, reason: Buffer) => void): this;
      on(event: "error", listener: (this: WebSocket, err: Error) => void): this;
      on(event: "upgrade", listener: (this: WebSocket, request: IncomingMessage) => void): this;
      on(event: "message", listener: (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) => void): this;
      on(event: "open", listener: (this: WebSocket) => void): this;
      on(event: "ping" | "pong", listener: (this: WebSocket, data: Buffer) => void): this;
      on(
          event: "unexpected-response",
          listener: (this: WebSocket, request: ClientRequest, response: IncomingMessage) => void,
      ): this;
      on(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void): this;

      once(event: "close", listener: (this: WebSocket, code: number, reason: Buffer) => void): this;
      once(event: "error", listener: (this: WebSocket, err: Error) => void): this;
      once(event: "upgrade", listener: (this: WebSocket, request: IncomingMessage) => void): this;
      once(event: "message", listener: (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) => void): this;
      once(event: "open", listener: (this: WebSocket) => void): this;
      once(event: "ping" | "pong", listener: (this: WebSocket, data: Buffer) => void): this;
      once(
          event: "unexpected-response",
          listener: (this: WebSocket, request: ClientRequest, response: IncomingMessage) => void,
      ): this;
      once(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void): this;

      off(event: "close", listener: (this: WebSocket, code: number, reason: Buffer) => void): this;
      off(event: "error", listener: (this: WebSocket, err: Error) => void): this;
      off(event: "upgrade", listener: (this: WebSocket, request: IncomingMessage) => void): this;
      off(event: "message", listener: (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) => void): this;
      off(event: "open", listener: (this: WebSocket) => void): this;
      off(event: "ping" | "pong", listener: (this: WebSocket, data: Buffer) => void): this;
      off(
          event: "unexpected-response",
          listener: (this: WebSocket, request: ClientRequest, response: IncomingMessage) => void,
      ): this;
      off(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void): this;

      addListener(event: "close", listener: (code: number, reason: Buffer) => void): this;
      addListener(event: "error", listener: (err: Error) => void): this;
      addListener(event: "upgrade", listener: (request: IncomingMessage) => void): this;
      addListener(event: "message", listener: (data: WebSocket.RawData, isBinary: boolean) => void): this;
      addListener(event: "open", listener: () => void): this;
      addListener(event: "ping" | "pong", listener: (data: Buffer) => void): this;
      addListener(
          event: "unexpected-response",
          listener: (request: ClientRequest, response: IncomingMessage) => void,
      ): this;
      addListener(event: string | symbol, listener: (...args: any[]) => void): this;

      removeListener(event: "close", listener: (code: number, reason: Buffer) => void): this;
      removeListener(event: "error", listener: (err: Error) => void): this;
      removeListener(event: "upgrade", listener: (request: IncomingMessage) => void): this;
      removeListener(event: "message", listener: (data: WebSocket.RawData, isBinary: boolean) => void): this;
      removeListener(event: "open", listener: () => void): this;
      removeListener(event: "ping" | "pong", listener: (data: Buffer) => void): this;
      removeListener(
          event: "unexpected-response",
          listener: (request: ClientRequest, response: IncomingMessage) => void,
      ): this;
      removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  declare const WebSocketAlias: typeof WebSocket;
  interface WebSocketAlias extends WebSocket {} // tslint:disable-line no-empty-interface

  declare namespace WebSocket {
      /**
       * Data represents the raw message payload received over the WebSocket.
       */
      type RawData = Buffer | ArrayBuffer | Buffer[];

      /**
       * Data represents the message payload received over the WebSocket.
       */
      type Data = string | Buffer | ArrayBuffer | Buffer[];

      /**
       * CertMeta represents the accepted types for certificate & key data.
       */
      type CertMeta = string | string[] | Buffer | Buffer[];

      /**
       * VerifyClientCallbackSync is a synchronous callback used to inspect the
       * incoming message. The return value (boolean) of the function determines
       * whether or not to accept the handshake.
       */
      type VerifyClientCallbackSync = (info: { origin: string; secure: boolean; req: IncomingMessage }) => boolean;

      /**
       * VerifyClientCallbackAsync is an asynchronous callback used to inspect the
       * incoming message. The return value (boolean) of the function determines
       * whether or not to accept the handshake.
       */
      type VerifyClientCallbackAsync = (
          info: { origin: string; secure: boolean; req: IncomingMessage },
          callback: (res: boolean, code?: number, message?: string, headers?: OutgoingHttpHeaders) => void,
      ) => void;

      interface ClientOptions extends SecureContextOptions {
          protocol?: string | undefined;
          followRedirects?: boolean | undefined;
          generateMask?(mask: Buffer): void;
          handshakeTimeout?: number | undefined;
          maxRedirects?: number | undefined;
          perMessageDeflate?: boolean | PerMessageDeflateOptions | undefined;
          localAddress?: string | undefined;
          protocolVersion?: number | undefined;
          headers?: { [key: string]: string } | undefined;
          origin?: string | undefined;
          agent?: Agent | undefined;
          host?: string | undefined;
          family?: number | undefined;
          checkServerIdentity?(servername: string, cert: CertMeta): boolean;
          rejectUnauthorized?: boolean | undefined;
          maxPayload?: number | undefined;
          skipUTF8Validation?: boolean | undefined;
      }

      interface PerMessageDeflateOptions {
          serverNoContextTakeover?: boolean | undefined;
          clientNoContextTakeover?: boolean | undefined;
          serverMaxWindowBits?: number | undefined;
          clientMaxWindowBits?: number | undefined;
          zlibDeflateOptions?: {
              flush?: number | undefined;
              finishFlush?: number | undefined;
              chunkSize?: number | undefined;
              windowBits?: number | undefined;
              level?: number | undefined;
              memLevel?: number | undefined;
              strategy?: number | undefined;
              dictionary?: Buffer | Buffer[] | DataView | undefined;
              info?: boolean | undefined;
          } | undefined;
          zlibInflateOptions?: ZlibOptions | undefined;
          threshold?: number | undefined;
          concurrencyLimit?: number | undefined;
      }

      interface Event {
          type: string;
          target: WebSocket;
      }

      interface ErrorEvent {
          error: any;
          message: string;
          type: string;
          target: WebSocket;
      }

      interface CloseEvent {
          wasClean: boolean;
          code: number;
          reason: string;
          type: string;
          target: WebSocket;
      }

      interface MessageEvent {
          data: Data;
          type: string;
          target: WebSocket;
      }

      interface EventListenerOptions {
          once?: boolean | undefined;
      }

      interface ServerOptions {
          host?: string | undefined;
          port?: number | undefined;
          backlog?: number | undefined;
          server?: HTTPServer | HTTPSServer | undefined;
          verifyClient?: VerifyClientCallbackAsync | VerifyClientCallbackSync | undefined;
          handleProtocols?: (protocols: Set<string>, request: IncomingMessage) => string | false;
          path?: string | undefined;
          noServer?: boolean | undefined;
          clientTracking?: boolean | undefined;
          perMessageDeflate?: boolean | PerMessageDeflateOptions | undefined;
          maxPayload?: number | undefined;
          skipUTF8Validation?: boolean | undefined;
          WebSocket?: typeof WebSocket.WebSocket | undefined;
      }

      interface AddressInfo {
          address: string;
          family: string;
          port: number;
      }

      // WebSocket Server
      class Server<T extends WebSocket = WebSocket> extends EventEmitter {
          options: ServerOptions;
          path: string;
          clients: Set<T>;

          constructor(options?: ServerOptions, callback?: () => void);

          address(): AddressInfo | string;
          close(cb?: (err?: Error) => void): void;
          handleUpgrade(
              request: IncomingMessage,
              socket: Duplex,
              upgradeHead: Buffer,
              callback: (client: T, request: IncomingMessage) => void,
          ): void;
          shouldHandle(request: IncomingMessage): boolean | Promise<boolean>;

          // Events
          on(event: "connection", cb: (this: Server<T>, socket: T, request: IncomingMessage) => void): this;
          on(event: "error", cb: (this: Server<T>, error: Error) => void): this;
          on(event: "headers", cb: (this: Server<T>, headers: string[], request: IncomingMessage) => void): this;
          on(event: "close" | "listening", cb: (this: Server<T>) => void): this;
          on(event: string | symbol, listener: (this: Server<T>, ...args: any[]) => void): this;

          once(event: "connection", cb: (this: Server<T>, socket: T, request: IncomingMessage) => void): this;
          once(event: "error", cb: (this: Server<T>, error: Error) => void): this;
          once(event: "headers", cb: (this: Server<T>, headers: string[], request: IncomingMessage) => void): this;
          once(event: "close" | "listening", cb: (this: Server<T>) => void): this;
          once(event: string | symbol, listener: (this: Server<T>, ...args: any[]) => void): this;

          off(event: "connection", cb: (this: Server<T>, socket: T, request: IncomingMessage) => void): this;
          off(event: "error", cb: (this: Server<T>, error: Error) => void): this;
          off(event: "headers", cb: (this: Server<T>, headers: string[], request: IncomingMessage) => void): this;
          off(event: "close" | "listening", cb: (this: Server<T>) => void): this;
          off(event: string | symbol, listener: (this: Server<T>, ...args: any[]) => void): this;

          addListener(event: "connection", cb: (client: T, request: IncomingMessage) => void): this;
          addListener(event: "error", cb: (err: Error) => void): this;
          addListener(event: "headers", cb: (headers: string[], request: IncomingMessage) => void): this;
          addListener(event: "close" | "listening", cb: () => void): this;
          addListener(event: string | symbol, listener: (...args: any[]) => void): this;

          removeListener(event: "connection", cb: (client: T) => void): this;
          removeListener(event: "error", cb: (err: Error) => void): this;
          removeListener(event: "headers", cb: (headers: string[], request: IncomingMessage) => void): this;
          removeListener(event: "close" | "listening", cb: () => void): this;
          removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
      }

      const WebSocketServer: typeof Server;
      interface WebSocketServer extends Server {} // tslint:disable-line no-empty-interface
      const WebSocket: typeof WebSocketAlias;
      interface WebSocket extends WebSocketAlias {} // tslint:disable-line no-empty-interface

      // WebSocket stream
      function createWebSocketStream(websocket: WebSocket, options?: DuplexOptions): Duplex;
  }

  export = WebSocket;
}
`;

export const dboLib =
  `

type AnyObject = Record<string, any>;

export type Explode<T> = keyof T extends infer K
  ? K extends unknown
  ? { [I in keyof T]: I extends K ? T[I] : never }
  : never
  : never;
export type AtMostOne<T> = Explode<Partial<T>>;
export type AtLeastOne<T, U = {[K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]
export type ExactlyOne<T> = AtMostOne<T> & AtLeastOne<T>;
export type DBTableSchema = {
	is_view?: boolean;
	select?: boolean;
	insert?: boolean;
	update?: boolean;
	delete?: boolean;
	/**
	 * Used in update, insertm select and filters
	 * fields that are nullable or with a default value are be optional 
	 */
	columns: AnyObject;
  }
export type DBSchema = { 
	[tov_name: string]: DBTableSchema
}

export type AllowedTSType = string | number | boolean | Date | any;
export type AllowedTSTypes = AllowedTSType[];

export const CompareFilterKeys = ["=", "$eq","<>",">","<",">=","<=","$eq","$ne","$gt","$gte","$lte"] as const;
export const CompareInFilterKeys = ["$in", "$nin"] as const;

export const JsonbOperands = {
  "@>": {
    "Operator": "@>",
    "Right Operand Type": "jsonb",
    "Description": "Does the left JSON value contain the right JSON path/value entries at the top level?",
    "Example": \`'{"a":1, "b":2}'::jsonb @> '{\"b\":2}'::jsonb\`
  },
  "<@": {
    "Operator": "<@",
    "Right Operand Type": "jsonb",
    "Description": "Are the left JSON path/value entries contained at the top level within the right JSON value?",
    "Example": \`'{\"b\":2}'::jsonb <@ '{\"a\":1, \"b\":2}'::jsonb\`
  },
  "?": {
    "Operator": "?",
    "Right Operand Type": "text",
    "Description": "Does the string exist as a top-level key within the JSON value?",
    "Example": \`'{\"a\":1, \"b\":2}'::jsonb ? 'b'\`
  },
  "?|": {
    "Operator": "?|",
    "Right Operand Type": "text[]",
    "Description": "Do any of these array strings exist as top-level keys?",
    "Example": \`'{\"a\":1, \"b\":2, \"c\":3}'::jsonb ?| array['b', 'c']\`
  },
  "?&": {
    "Operator": "?&",
    "Right Operand Type": "text[]",
    "Description": "Do all of these array strings exist as top-level keys?",
    "Example": \`'[\"a\", \"b\"]'::jsonb ?& array['a', 'b']\`
  },
  "||": {
    "Operator": "||",
    "Right Operand Type": "jsonb",
    "Description": "Concatenate two jsonb values into a new jsonb value",
    "Example": \`'[\"a\", \"b\"]'::jsonb || '[\"c\", \"d\"]'::jsonb\`
  },
  "-": {
    "Operator": "-",
    "Right Operand Type": "integer",
    "Description": "Delete the array element with specified index (Negative integers count from the end). Throws an error if top level container is not an array.",
    "Example": \`'[\"a\", \"b\"]'::jsonb - 1\`
  },
  "#-": {
    "Operator": "#-",
    "Right Operand Type": "text[]",
    "Description": "Delete the field or element with specified path (for JSON arrays, negative integers count from the end)",
    "Example": \`'[\"a\", {\"b\":1}]'::jsonb #- '{1,b}'\`
  },
  "@?": {
    "Operator": "@?",
    "Right Operand Type": "jsonpath",
    "Description": "Does JSON path return any item for the specified JSON value?",
    "Example": \`'{\"a\":[1,2,3,4,5]}'::jsonb @? '$.a[*] ? (@ > 2)'\`
  },
  "@@": {
    "Operator": "@@",
    "Right Operand Type": "jsonpath",
    "Description": "Returns the result of JSON path predicate check for the specified JSON value. Only the first item of the result is taken into account. If the result is not Boolean, then null is returned.",
    "Example": \`'{\"a\":[1,2,3,4,5]}'::jsonb @@ '$.a[*] > 2'\`
  }
} as const; 

/**
 * Example: col_name: { $gt: 2 }
 */
 export type CompareFilter<T extends AllowedTSType = string> =
 /**
  * column value equals provided value
  */
 | T 
 | ExactlyOne<Record<typeof CompareFilterKeys[number], T>>

 | ExactlyOne<Record<typeof CompareInFilterKeys[number], T[]>>
 | { "$between": [T, T] }
;
export const TextFilterKeys = ["$ilike", "$like", "$nilike", "$nlike"] as const;

export const TextFilterFTSKeys = ["@@", "@>", "<@", "$contains", "$containedBy"] as const;

export const TextFilter_FullTextSearchFilterKeys = ["to_tsquery","plainto_tsquery","phraseto_tsquery","websearch_to_tsquery"] as const;
export type FullTextSearchFilter = 
 | ExactlyOne<Record<typeof TextFilter_FullTextSearchFilterKeys[number], string[]>>
;

export type TextFilter = 
 | CompareFilter<string>
 | ExactlyOne<Record<typeof TextFilterKeys[number], string>>

 | ExactlyOne<Record<typeof TextFilterFTSKeys[number], FullTextSearchFilter>>
;

export const ArrayFilterOperands = ["@>", "<@", "=", "$eq", "$contains", "$containedBy", "&&", "$overlaps"] as const;
export type ArrayFilter<T extends AllowedTSType[]> = 
 | Record<typeof ArrayFilterOperands[number], T>
 | ExactlyOne<Record<typeof ArrayFilterOperands[number], T>>
;

/* POSTGIS */

/**
* Makes bounding box from NW and SE points
* float xmin, float ymin, float xmax, float ymax, integer srid=unknown
* https://postgis.net/docs/ST_MakeEnvelope.html
*/
export type GeoBBox = { ST_MakeEnvelope: number[] }


/**
* Returns TRUE if A's 2D bounding box intersects B's 2D bounding box.
* https://postgis.net/docs/reference.html#Operators
*/
export type GeomFilter = 

 /**
  * A's 2D bounding box intersects B's 2D bounding box.
  */
 | { "&&": GeoBBox }
//  | { "&&&": GeoBBox }
//  | { "&<": GeoBBox }
//  | { "&<|": GeoBBox }
//  | { "&>": GeoBBox }
//  | { "<<": GeoBBox }
//  | { "<<|": GeoBBox }
//  | { ">>": GeoBBox }

//  | { "=": GeoBBox }

 /**
  * A's bounding box is contained by B's
  */
 | { "@": GeoBBox }
//  | { "|&>": GeoBBox }
//  | { "|>>": GeoBBox }

 /**
  * A's bounding box contains B's.
  */
//  | { "~": GeoBBox }
//  | { "~=": GeoBBox }
;
export const GeomFilterKeys = ["~","~=","@","|&>","|>>", ">>", "=", "<<|", "<<", "&>", "&<|", "&<", "&&&", "&&"] as const;
export const GeomFilter_Funcs =  [
  "ST_MakeEnvelope", 
  "st_makeenvelope", 
  "ST_MakePolygon",
  "st_makepolygon",
] as const;
 

// PG will try to cast strings to appropriate type
export type CastFromTSToPG<T extends AllowedTSType> = 
  T extends number ? (T | string) 
: T extends string ? (T | Date) 
: T extends boolean ? (T | string)
: T extends Date ? (T | string)
: T

export type FilterDataType<T extends AllowedTSType> = 
  T extends string ? TextFilter
: T extends number ? CompareFilter<CastFromTSToPG<T>>
: T extends boolean ? CompareFilter<CastFromTSToPG<T>>
: T extends Date ? CompareFilter<CastFromTSToPG<T>>
: T extends any[] ? ArrayFilter<T>
: (CompareFilter<T> | TextFilter | GeomFilter)
;

export const EXISTS_KEYS = ["$exists", "$notExists", "$existsJoined", "$notExistsJoined"] as const;
export type EXISTS_KEY = typeof EXISTS_KEYS[number];

/**
 * { 
 *    $filter: [
 *      { $funcName: [...args] },
 *      operand,
 *      value | funcFilter
 *    ] 
 * }
 */
export const COMPLEX_FILTER_KEY = "$filter" as const;
export type ComplexFilter = Record<typeof COMPLEX_FILTER_KEY, [
  { [funcName: string]: any[] },
  typeof CompareFilterKeys[number]?,
  any?
]>; 

/**
 * Shortened filter operands
 */
 type BasicFilter<Field extends string, DataType extends any> = Partial<{
  [K in Extract<typeof CompareFilterKeys[number], string> as ` +
  "`${Field}.${K}`" +
  `]: CastFromTSToPG<DataType>
}> | Partial<{
  [K in Extract<typeof CompareInFilterKeys[number], string> as ` +
  "`${Field}.${K}`" +
  `]: CastFromTSToPG<DataType>[]
}>;
type StringFilter<Field extends string, DataType extends any> = BasicFilter<Field, DataType> & (Partial<{
  [K in Extract<typeof TextFilterKeys[number], string> as ` +
  "`${Field}.${K}`" +
  `]: DataType
}> | Partial<{
  [K in Extract<typeof TextFilterFTSKeys[number], string> as ` +
  "`${Field}.${K}`" +
  `]: any
}>);
export type ValueOf<T> = T[keyof T];

type ShorthandFilter<Obj extends Record<string, any>> = ValueOf<{
  [K in keyof Obj]: Obj[K] extends string? StringFilter<K, Required<Obj>[K]> : BasicFilter<K, Required<Obj>[K]>;
}>

/* Traverses object keys to make filter */
export type FilterForObject<T extends AnyObject = AnyObject> = 
  /* { col: { $func: ["value"] } } */
  | {
    [K in keyof Partial<T>]: FilterDataType<T[K]>
  } & Partial<ComplexFilter>
  /**
   * Filters with shorthand notation
   * @example: { "name.$ilike": 'abc' }
   */
  | ShorthandFilter<T>
;

export type ExistsFilter<S = void> = Partial<{ 
  [key in EXISTS_KEY]: S extends DBSchema? 
    ExactlyOne<{ 
      [tname in keyof S]: 
       | FullFilter<S[tname]["columns"], S> 
       | {
          path: RawJoinPath[];
          filter: FullFilter<S[tname]["columns"], S> 
        }
    }> : any
    /** ExactlyOne does not for any type. This produces error */
    // ExactlyOne<{ 
    //   [key: string]: FullFilter<AnyObject,S> 
    // }>
}>; 

 
/**
 * Filter that relates to a single column { col: 2 } or
 * an exists filter: { $exists: {  } }
 */
export type FilterItem<T extends AnyObject = AnyObject> = 
  | FilterForObject<T> 


export type AnyObjIfVoid<T extends AnyObject | void> = T extends AnyObject? T : AnyObject;
/**
 * Full filter
 * @example { $or: [ { id: 1 }, { status: 'live' } ] }
 */
export type FullFilter<T extends AnyObject | void, S extends DBSchema | void> = 
 | { $and: FullFilter<T, S>[] } 
 | { $or: FullFilter<T, S>[] } 
 | FilterItem<AnyObjIfVoid<T>> 
 | ExistsFilter<S>
 | ComplexFilter

 /** Not implemented yet */
//  | { $not: FilterItem<T>  }
;

/**
 * Simpler FullFilter to reduce load on compilation
 */
export type FullFilterBasic<T = { [key: string]: any }> = {
  [key in keyof Partial<T & { [key: string]: any }>]: any
}
 

export const _PG_strings = [
  'bpchar','char','varchar','text','citext','uuid','bytea', 'time','timetz','interval','name', 
  'cidr', 'inet', 'macaddr', 'macaddr8', "int4range", "int8range", "numrange",
  'tsvector'
] as const;
export const _PG_numbers = ['int2','int4','int8','float4','float8','numeric','money','oid'] as const;
export const _PG_json = ['json', 'jsonb'] as const;
export const _PG_bool = ['bool'] as const;
export const _PG_date = ['date', 'timestamp', 'timestamptz'] as const;
export const _PG_interval = ['interval'] as const;
export const _PG_postgis = ['geometry', 'geography'] as const;
export const _PG_geometric = [
  "point", 
  "line", 
  "lseg", 
  "box", 
  "path",  
  "polygon", 
  "circle",
] as const;

export type PG_COLUMN_UDT_DATA_TYPE = 
    | typeof _PG_strings[number] 
    | typeof _PG_numbers[number] 
    | typeof _PG_geometric[number] 
    | typeof _PG_json[number] 
    | typeof _PG_bool[number] 
    | typeof _PG_date[number] 
    | typeof _PG_interval[number]
    | typeof _PG_postgis[number];
    
const TS_PG_PRIMITIVES = {
  "string": [ ..._PG_strings, ..._PG_date, ..._PG_geometric, ..._PG_postgis, "lseg"],
  "number": _PG_numbers,
  "boolean": _PG_bool,
  "any": [..._PG_json, ..._PG_interval], // consider as any

  /** Timestamps are kept in original string format to avoid filters failing 
   * TODO: cast to dates if udt_name date/timestamp(0 - 3)
  */
  // "Date": _PG_date,
} as const;

export const TS_PG_Types = {
  ...TS_PG_PRIMITIVES,
  "number[]": TS_PG_PRIMITIVES.number.map(s => \`_\${s}\` as const),
  "boolean[]": TS_PG_PRIMITIVES.boolean.map(s => \`_\${s}\` as const),
  "string[]": TS_PG_PRIMITIVES.string.map(s => \`_\${s}\` as const),
  "any[]": TS_PG_PRIMITIVES.any.map(s => \`_\${s}\` as const),
  // "Date[]": _PG_date.map(s => \`_\${s}\` as const),
    // "any": [],
} as const;
export type TS_COLUMN_DATA_TYPES = keyof typeof TS_PG_Types;
 
export type ColumnInfo = {
  name: string;

  /**
   * Column display name. Will be first non empty value from i18n data, comment, name 
   */
  label: string;

  /**
   * Column description (if provided)
   */
  comment: string;

  /**
   * Ordinal position of the column within the table (count starts at 1)
   */
  ordinal_position: number;

  /**
   * True if column is nullable. A not-null constraint is one way a column can be known not nullable, but there may be others.
   */
  is_nullable: boolean;

  is_updatable: boolean;

  /**
   * Simplified data type
   */
  data_type: string;

  /**
   * Postgres raw data types. values starting with underscore means it's an array of that data type
   */
  udt_name: PG_COLUMN_UDT_DATA_TYPE;

  /**
   * Element data type
   */
  element_type: string;

  /**
   * Element raw data type
   */
  element_udt_name: string;

  /**
   * PRIMARY KEY constraint on column. A table can have more then one PK
   */
  is_pkey: boolean;

  /**
   * Foreign key constraint 
   * A column can reference multiple tables
   */
  references?: {
    ftable: string;
    fcols: string[];
    cols: string[];
  }[];

  /**
   * true if column has a default value
   * Used for excluding pkey from insert
   */
  has_default: boolean;

  /**
   * Column default value
   */
  column_default?: any;

  /**
   * Extracted from tableConfig
   * Used in SmartForm
   */
  min?: string | number;
  max?: string | number;
  hint?: string;

  jsonbSchema?: any;

  /**
   * If degined then this column is referencing the file table
   * Extracted from FileTable config
   * Used in SmartForm
   */
  file?: any;

}


export type ValidatedColumnInfo = ColumnInfo & {

  /**
   * TypeScript data type
   */
  tsDataType: TS_COLUMN_DATA_TYPES;

  /**
   * Can be viewed/selected
   */
  select: boolean;

  /**
   * Can be ordered by
   */
  orderBy: boolean;

  /**
   * Can be filtered by
   */
  filter: boolean;

  /**
   * Can be inserted
   */
  insert: boolean;

  /**
   * Can be updated
   */
  update: boolean;

  /**
   * Can be used in the delete filter
   */
  delete: boolean;
}


export type DBSchemaTable = {
  name: string;
  info: TableInfo;
  columns: ValidatedColumnInfo[];
};

/**
 * List of fields to include or exclude
 */
export type FieldFilter<T extends AnyObject = AnyObject> = SelectTyped<T>

export type AscOrDesc = 1 | -1 | boolean;

/**
 * @example
 * { product_name: -1 } -> SORT BY product_name DESC
 * [{ field_name: (1 | -1 | boolean) }]
 * true | 1 -> ascending
 * false | -1 -> descending
 * Array order is maintained
 * if nullEmpty is true then empty text will be replaced to null (so nulls sorting takes effect on it)
 */
export type _OrderBy<T extends AnyObject> = 
  | { [K in keyof Partial<T>]: AscOrDesc }
  | { [K in keyof Partial<T>]: AscOrDesc }[]
  | { key: keyof T, asc?: AscOrDesc, nulls?: "last" | "first", nullEmpty?: boolean }[] 
  | Array<keyof T>
  | keyof T
  ;
  
export type OrderBy<T extends AnyObject | void = void> = T extends AnyObject? _OrderBy<T> :  _OrderBy<AnyObject>;

type CommonSelect =  
| "*"
| ""
| { "*" : 1 }

export type SelectTyped<T extends AnyObject> = 
  | { [K in keyof Partial<T>]: 1 | true } 
  | { [K in keyof Partial<T>]: 0 | false } 
  | (keyof T)[]
  | CommonSelect
;


export const JOIN_KEYS = ["$innerJoin", "$leftJoin"] as const; 
export const JOIN_PARAMS = ["select", "filter", "$path", "$condition", "offset", "limit", "orderBy"] as const;

export type JoinCondition = {
  column: string;
  rootColumn: string;
} | ComplexFilter;

export type JoinPath = {
  table: string;
  /**
   * {
   *    leftColumn: "rightColumn"
   * }
   */
  on?: Record<string, string>[];
};
export type RawJoinPath = string | (JoinPath | string)[]

export type DetailedJoinSelect = Partial<Record<typeof JOIN_KEYS[number], RawJoinPath>> & {
  select: Select;
  filter?: FullFilter<void, void>;
  offset?: number;
  limit?: number;
  orderBy?: OrderBy;
} & (
  { 
    $condition?: undefined;
  } | {
    /**
     * If present then will overwrite $path and any inferred joins
     */
    $condition?: JoinCondition[];

  }
);

export type SimpleJoinSelect = 
| "*"
/** Aliased Shorthand join: table_name: { ...select } */
| Record<string, 1 | "*" | true | FunctionSelect> 
| Record<string, 0 | false> 

export type JoinSelect = 
| SimpleJoinSelect
| DetailedJoinSelect;

type FunctionShorthand = string;
type FunctionFull = Record<string, any[] | readonly any[] | FunctionShorthand>;
type FunctionSelect = FunctionShorthand | FunctionFull;
/**
 * { computed_field: { funcName: [args] } }
 */
type FunctionAliasedSelect = Record<string, FunctionFull>;

type InclusiveSelect = true | 1 | FunctionSelect | JoinSelect;

type SelectFuncs<T extends AnyObject = AnyObject, IsTyped = false> = (
  | ({ [K in keyof Partial<T>]: InclusiveSelect } & Record<string, IsTyped extends true? FunctionFull : InclusiveSelect>) 
  | FunctionAliasedSelect
  | { [K in keyof Partial<T>]: true | 1 | string }
  | { [K in keyof Partial<T>]: 0 | false }
  | CommonSelect
  | (keyof Partial<T>)[]
);

/** S param is needed to ensure the non typed select works fine */
export type Select<T extends AnyObject | void = void, S extends DBSchema | void = void> = { t: T, s: S } extends { t: AnyObject, s: DBSchema } ? SelectFuncs<T & { $rowhash: string }, true> : SelectFuncs<AnyObject & { $rowhash: string }, false>;
 

export type SelectBasic = 
  | { [key: string]: any } 
  | {} 
  | undefined 
  | "" 
  | "*" 
  ;

/* Simpler types */
type CommonSelectParams = {

  /**
   * If null then maxLimit if present will be applied
   * If undefined then 1000 will be applied as the default
   */
  limit?: number | null;
  offset?: number;

  /**
   * Will group by all non aggregated fields specified in select (or all fields by default)
   */
  groupBy?: boolean;

  returnType?: 

  /**
   * Will return the first row as an object. Will throw an error if more than a row is returned. Use limit: 1 to avoid error.
   */
  | "row"

  /**
    * Will return the first value from the selected field
    */
  | "value"

  /**
    * Will return an array of values from the selected field. Similar to array_agg(field).
    */
  | "values"

  /**
    * Will return the sql statement. Requires publishRawSQL privileges if called by client
    */
  | "statement"

  /**
    * Will return the sql statement excluding the user header. Requires publishRawSQL privileges if called by client
    */
  | "statement-no-rls"

  /**
    * Will return the sql statement where condition. Requires publishRawSQL privileges if called by client
    */
  | "statement-where"

} 

export type SelectParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = CommonSelectParams & {
  select?: Select<T, S>;
  orderBy?: OrderBy<S extends DBSchema? T : void>;
}
export type SubscribeParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = SelectParams<T, S> & {
  throttle?: number;
  throttleOpts?: {
    /** 
     * False by default. 
     * If true then the first value will be emitted at the end of the interval. Instant otherwise 
     * */
    skipFirst?: boolean;
  };
};

export type UpdateParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = {
  returning?: Select<T, S>;
  onConflict?: "DoUpdate" | "DoNothing";
  removeDisallowedFields?: boolean;

  /* true by default. If false the update will fail if affecting more than one row */
  multi?: boolean;
} & Pick<CommonSelectParams, "returnType">;

export type InsertParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = {
  returning?: Select<T, S>;
  onConflict?: "DoUpdate" | "DoNothing";
  removeDisallowedFields?: boolean;
} & Pick<CommonSelectParams, "returnType">;

export type DeleteParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = {
  returning?: Select<T, S>;
} & Pick<CommonSelectParams, "returnType">;

export type PartialLax<T = AnyObject> = Partial<T>;

export type TableInfo = {
  /**
   * OID from the postgres database
   */
  oid: number;
  /**
   * Comment from the postgres database
   */
  comment?: string;
  /**
   * Defined if this is the fileTable
   */
  isFileTable?: {
    /** 
     * Defined if direct inserts are disabled. 
     * Only nested inserts through the specified tables/columns are allowed
     * */
    allowedNestedInserts?: {
      table: string;
      column: string;
    }[] | undefined;
  };

  /**
   * True if fileTable is enabled and this table references the fileTable
   */
  hasFiles?: boolean;

  isView?: boolean;

  /**
   * Name of the fileTable (if enabled)
   */
  fileTableName?: string;

  /**
   * Used for getColumns in cases where the columns are dynamic based on the request.
   * See dynamicFields from Update rules
   */
  dynamicRules?: {
    update?: boolean;
  }

  /**
   * Additional table info provided through TableConfig
   */
  info?: {
    label?: string;
  }
}

export type OnError = (err: any) => void;

type JoinedSelect = Record<string, Select>;

type ParseSelect<Select extends SelectParams<TD>["select"], TD extends AnyObject> = 
(Select extends { "*": 1 }? Required<TD> : {})
& {
  [Key in keyof Omit<Select, "*">]: Select[Key] extends 1? Required<TD>[Key] : 
    Select[Key] extends Record<string, any[]>? any : //Function select
    Select[Key] extends JoinedSelect? any[] : 
    any;
}

type GetSelectDataType<S extends DBSchema | void, O extends SelectParams<TD, S>, TD extends AnyObject> = 
  O extends { returnType: "value" }? any : 
  O extends { returnType: "values"; select: Record<string, 1> }? ValueOf<Pick<Required<TD>, keyof O["select"]>> : 
  O extends { returnType: "values" }? any : 
  O extends { select: "*" }? Required<TD> : 
  O extends { select: "" }? Record<string, never> : 
  O extends { select: Record<string, 0> }? Omit<Required<TD>, keyof O["select"]> : 
  O extends { select: Record<string, any> }? ParseSelect<O["select"], Required<TD>> : 
  Required<TD>;

export type GetSelectReturnType<S extends DBSchema | void, O extends SelectParams<TD, S>, TD extends AnyObject, isMulti extends boolean> = 
  O extends { returnType: "statement" }? string : 
  isMulti extends true? GetSelectDataType<S, O, TD>[] :
  GetSelectDataType<S, O, TD>;

type GetReturningReturnType<O extends UpdateParams<TD, S>, TD extends AnyObject, S extends DBSchema | void = void> = 
  O extends { returning: "*" }? Required<TD> : 
  O extends { returning: "" }? Record<string, never> : 
  O extends { returning: Record<string, 1> }? Pick<Required<TD>, keyof O["returning"]> : 
  O extends { returning: Record<string, 0> }? Omit<Required<TD>, keyof O["returning"]> : 
  void;

type GetUpdateReturnType<O extends UpdateParams<TD, S>, TD extends AnyObject, S extends DBSchema | void = void> = 
  O extends { multi: false }? 
    GetReturningReturnType<O, TD, S> : 
    GetReturningReturnType<O, TD, S>[];

type GetInsertReturnType<Data extends AnyObject | AnyObject[], O extends UpdateParams<TD, S>, TD extends AnyObject, S extends DBSchema | void = void> = 
  Data extends any[]? 
    GetReturningReturnType<O, TD, S>[] :
    GetReturningReturnType<O, TD, S>;

export type SubscriptionHandler = {
  unsubscribe: () => Promise<any>;
  filter: FullFilter<void, void> | {};
}

type GetColumns = (lang?: string, params?: { rule: "update", data: AnyObject, filter: AnyObject }) => Promise<ValidatedColumnInfo[]>;

export type ViewHandler<TD extends AnyObject = AnyObject, S extends DBSchema | void = void> = {
  getInfo?: (lang?: string) => Promise<TableInfo>;
  getColumns?: GetColumns
  find: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<GetSelectReturnType<S, P, TD, true>>;
  findOne: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<undefined | GetSelectReturnType<S, P, TD, false>>;
  subscribe: <P extends SubscribeParams<TD, S>>(
    filter: FullFilter<TD, S>, 
    params: P, 
    onData: (items: GetSelectReturnType<S, P, TD, true>) => any,
    onError?: OnError
  ) => Promise<SubscriptionHandler>;
  subscribeOne: <P extends SubscribeParams<TD, S>>(
    filter: FullFilter<TD, S>, 
    params: P, 
    onData: (item: GetSelectReturnType<S, P, TD, false> | undefined) => any, 
    onError?: OnError
  ) => Promise<SubscriptionHandler>;
  count: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<number>;
  /**
   * Returns result size in bits
   */
  size: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<string>;
}

export type UpsertDataToPGCast<TD extends AnyObject = AnyObject> = {
  [K in keyof TD]: CastFromTSToPG<TD[K]>
};

type UpsertDataToPGCastLax<T extends AnyObject> = PartialLax<UpsertDataToPGCast<T>>;
type InsertData<T extends AnyObject> = UpsertDataToPGCast<T> | UpsertDataToPGCast<T>[]

export type TableHandler<TD extends AnyObject = AnyObject, S extends DBSchema | void = void> = ViewHandler<TD, S> & {
  update: <P extends UpdateParams<TD, S>>(filter: FullFilter<TD, S>, newData: UpsertDataToPGCastLax<TD>, params?: P) => Promise<GetUpdateReturnType<P ,TD, S> | undefined>;
  updateBatch: <P extends UpdateParams<TD, S>>(data: [FullFilter<TD, S>, UpsertDataToPGCastLax<TD>][], params?: P) => Promise<GetUpdateReturnType<P ,TD, S> | void>;
  upsert: <P extends UpdateParams<TD, S>>(filter: FullFilter<TD, S>, newData: UpsertDataToPGCastLax<TD>, params?: P) => Promise<GetUpdateReturnType<P ,TD, S>>; 
  insert: <P extends InsertParams<TD, S>, D extends InsertData<TD>>(data: D, params?: P ) => Promise<GetInsertReturnType<D, P ,TD, S>>;
  delete: <P extends DeleteParams<TD, S>>(filter?: FullFilter<TD, S>, params?: P) => Promise<GetUpdateReturnType<P ,TD, S> | undefined>;
} 

export type JoinMakerOptions<TT extends AnyObject = AnyObject> = SelectParams<TT> & { path?: RawJoinPath };
export type JoinMaker<TT extends AnyObject = AnyObject, S extends DBSchema | void = void> = (filter?: FullFilter<TT, S>, select?: Select<TT>, options?: JoinMakerOptions<TT> ) => any;
export type JoinMakerBasic = (filter?: FullFilterBasic, select?: SelectBasic, options?: SelectParams & { path?: RawJoinPath }) => any;

export type TableJoin = {
  [key: string]: JoinMaker;
}
export type TableJoinBasic = {
  [key: string]: JoinMakerBasic;
}

export type DbJoinMaker = {
  innerJoin: TableJoin;
  leftJoin: TableJoin;
  innerJoinOne: TableJoin;
  leftJoinOne: TableJoin;
} 

export type TableHandlers = {
	[key: string]: Partial<TableHandler> | TableHandler;
};


export type SocketSQLStreamPacket = {
	type: "data";
	fields?: any[];
	rows: any[];
	ended?: boolean;
	info?: SQLResultInfo;
	processId: number;
  } | {
	type: "error";
	error: any;
  };
  export type SocketSQLStreamServer = {
	channel: string;
	unsubChannel: string;
  };
  export type SocketSQLStreamHandlers = {
	run: (query: string, params?: any | any[]) => Promise<void>;
	stop: (terminate?: boolean) => Promise<void>;
  };
  export type SocketSQLStreamClient = SocketSQLStreamServer & {
	start: (listener: (packet: SocketSQLStreamPacket) => void) => Promise<SocketSQLStreamHandlers>
  };
  

export type DBNoticeConfig = {
	socketChannel: string;
	socketUnsubChannel: string;
  }
export type DBNotifConfig = DBNoticeConfig & {
	notifChannel: string;
  }
  
  
  export type SQLOptions = {
	/**
	 * Return type of the query
	 */
	returnType?: Required<SelectParams>["returnType"] | "statement" | "rows" | "noticeSubscription" | "arrayMode" | "stream";
	
	/**
	 * If allowListen not specified and a LISTEN query is issued then expect error
	 */
	allowListen?: boolean;
  
	/**
	 * Positive integer that works only with returnType="stream". 
	 * If provided then the query will be cancelled when the specified number of rows have been streamed 
	 */
	streamLimit?: number;
	
	/**
	 * If true then the connection will be persisted and used for subsequent queries
	 */
	persistStreamConnection?: boolean;
  
	/**
	 * connectionId of the stream connection to use
	 * Acquired from the first query with persistStreamConnection=true
	 */
	streamConnectionId?: string;
  
	/**
	 * If false then the query will not be checked for params. Used to ignore queries with param like text 
	 * Defaults to true
	 */
	hasParams?: boolean;
  };
  
  export type SQLRequest = {
	query: string;
	params?: any | any[];
	options?:  SQLOptions
  }
  
  export type NotifSubscription = {
	socketChannel: string;
	socketUnsubChannel: string;
	notifChannel: string;
  }
  
  export type NoticeSubscription = {
	socketChannel: string;
	socketUnsubChannel: string;
  }

export type DBEventHandles = {
	socketChannel: string;
	socketUnsubChannel: string;
	addListener: (listener: (event: any) => void) => { removeListener: () => void; } 
  };
  
  export type CheckForListen<T, O extends SQLOptions> = O["allowListen"] extends true? (DBEventHandles | T) : T;
  
export type SQLResultInfo = {
	command: "SELECT" | "UPDATE" | "DELETE" | "CREATE" | "ALTER" | "LISTEN" | "UNLISTEN" | "INSERT" | string;
	rowCount: number;
	duration: number;
  }
  export type SQLResult<T extends SQLOptions["returnType"]> = SQLResultInfo & {
	rows: (T extends "arrayMode"? any : AnyObject)[];
	fields: {
	  name: string;
	  dataType: string;
	  udt_name: PG_COLUMN_UDT_DATA_TYPE;
	  tsDataType: TS_COLUMN_DATA_TYPES;
	  tableID?: number;
	  tableName?: string; 
	  tableSchema?: string; 
	  columnID?: number;
	  columnName?: string;
	}[];
  }
  export type GetSQLReturnType<O extends SQLOptions> = CheckForListen<
	(
	  O["returnType"] extends "row"? AnyObject | null :
	  O["returnType"] extends "rows"? AnyObject[] :
	  O["returnType"] extends "value"? any | null :
	  O["returnType"] extends "values"? any[] :
	  O["returnType"] extends "statement"? string :
	  O["returnType"] extends "noticeSubscription"? DBEventHandles :
	  O["returnType"] extends "stream"? SocketSQLStreamClient :
	  SQLResult<O["returnType"]>
	)
  , O>;
  
  export type SQLHandler = 
  /**
   * 
   * @param query <string> query. e.g.: SELECT * FROM users;
   * @param params <any[] | object> query arguments to be escaped. e.g.: { name: 'dwadaw' }
   * @param options <object> { returnType: "statement" | "rows" | "noticeSubscription" }
   */
  <Opts extends SQLOptions>(
	query: string, 
	args?: AnyObject | any[], 
	options?: Opts,
	serverSideOptions?: {
	  socket: any
	} | { 
	  httpReq: any;
	}
  ) => Promise<GetSQLReturnType<Opts>>

  
export type DbTxTableHandlers = {
	[key: string]: Omit<Partial<TableHandler>, "dbTx"> | Omit<TableHandler, "dbTx">;
};
export type TxCB<TH = DbTxTableHandlers> = {
	(t: TH & Pick<DBHandlerServer, "sql">, _t: any): (any | void);
};
export type TX<TH = TableHandlers> = {
	(t: TxCB<TH>): Promise<(any | void)>;
};
export type DBHandlerServer<TH = TableHandlers> = TH & Partial<DbJoinMaker> & {
	sql?: SQLHandler;
} & {
	tx?: TX<TH>;
};
export type DBTableHandlersFromSchema<Schema = void> = Schema extends DBSchema ? {
	[tov_name in keyof Schema]: Schema[tov_name]["is_view"] extends true ? ViewHandler<Schema[tov_name]["columns"]> : TableHandler<Schema[tov_name]["columns"]>;
} : Record<string, TableHandler>;
export type DBOFullyTyped<Schema = void> = (DBTableHandlersFromSchema<Schema> & Pick<DBHandlerServer<DBTableHandlersFromSchema<Schema>>, "tx" | "sql">);
`;

export const pgPromiseDb = `

declare namespace pgPromise {

  enum queryResult {
    one = 1,
    many = 2,
    none = 4,
    any = 6
  }
  interface IColumn {
    name: string
    oid: number
    dataTypeID: number

    // NOTE: properties below are not available within Native Bindings:

    tableID: number
    columnID: number
    dataTypeSize: number
    dataTypeModifier: number
    format: string
  }

  interface IResult<T = unknown> extends Iterable<T> {
    command: string
    rowCount: number
    rows: T[]
    fields: IColumn[]

    // properties below are not available within Native Bindings:
    rowAsArray: boolean

    _types: {
      _types: any,
      text: any,
      binary: any
    };
    _parsers: Array<Function>;
  }

  interface IResult<T = unknown> extends Iterable<T> {
    command: string
    rowCount: number
    rows: T[]
    fields: IColumn[]

    // properties below are not available within Native Bindings:
    rowAsArray: boolean

    _types: {
      _types: any,
      text: any,
      binary: any
    };
    _parsers: Array<Function>;
  }

  interface IResultExt<T = unknown> extends IResult<T> {
    // Property 'duration' exists only in the following context:
    //  - for single-query events 'receive'
    //  - for method Database.result
    duration?: number
  }

  // Event context extension for tasks + transactions;
  // See: https://vitaly-t.github.io/pg-promise/global.html#TaskContext
  interface ITaskContext {

    // these are set in the beginning of each task/transaction:
    readonly context: any
    readonly parent: ITaskContext | null
    readonly connected: boolean
    readonly inTransaction: boolean
    readonly level: number
    readonly useCount: number
    readonly isTX: boolean
    readonly start: Date
    readonly tag: any
    readonly dc: any

    // these are set at the end of each task/transaction:
    readonly finish?: Date
    readonly duration?: number
    readonly success?: boolean
    readonly result?: any

    // this exists only inside transactions (isTX = true):
    readonly txLevel?: number

    // Version of PostgreSQL Server to which we are connected;
    // This property is not available with Native Bindings!
    readonly serverVersion: string
  }

  // Additional methods available inside tasks + transactions;
  // API: https://vitaly-t.github.io/pg-promise/Task.html
  interface ITask {
    readonly ctx: ITaskContext
  }

  interface ITaskIfOptions<Ext = {}> {
    cnd?: boolean | ((t: ITask) => boolean)
    tag?: any
  }

  interface ITxIfOptions<Ext = {}> extends ITaskIfOptions<Ext> {
    mode?: any | null
    reusable?: boolean | ((t: ITask) => boolean)
  }

  // Base database protocol
  // API: https://vitaly-t.github.io/pg-promise/Database.html
  interface DB {

    // API: https://vitaly-t.github.io/pg-promise/Database.html#query
    query<T = any>(query: string, values?: any, qrm?: queryResult): Promise<T>

    // result-specific methods;

    // API: https://vitaly-t.github.io/pg-promise/Database.html#none
    none(query: string, values?: any): Promise<null>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#one
    one<T = any>(query: string, values?: any, cb?: (value: any) => T, thisArg?: any): Promise<T>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#oneOrNone
    oneOrNone<T = any>(query: string, values?: any, cb?: (value: any) => T, thisArg?: any): Promise<T | null>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#many
    many<T = any>(query: string, values?: any): Promise<T[]>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#manyOrNone
    manyOrNone<T = any>(query: string, values?: any): Promise<T[]>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#any
    any<T = any>(query: string, values?: any): Promise<T[]>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#result
    result<T, R = IResultExt<T>>(query: string, values?: any, cb?: (value: IResultExt<T>) => R, thisArg?: any): Promise<R>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#multiResult
    multiResult(query: string, values?: any): Promise<IResult[]>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#multi
    multi<T = any>(query: string, values?: any): Promise<Array<T[]>>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#stream
    stream(qs: NodeJS.ReadableStream, init: (stream: NodeJS.ReadableStream) => void): Promise<{
      processed: number,
      duration: number
    }>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#func
    func<T = any>(funcName: string, values?: any, qrm?: queryResult): Promise<T>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#proc
    proc<T = any>(procName: string, values?: any, cb?: (value: any) => T, thisArg?: any): Promise<T | null>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#map
    map<T = any>(query: string, values: any, cb: (row: any, index: number, data: any[]) => T, thisArg?: any): Promise<T[]>

    // API: https://vitaly-t.github.io/pg-promise/Database.html#each
    each<T = any>(query: string, values: any, cb: (row: any, index: number, data: any[]) => void, thisArg?: any): Promise<T[]>

    // Tasks;
    // API: https://vitaly-t.github.io/pg-promise/Database.html#task
    task<T>(cb: (t: ITask) => T | Promise<T>): Promise<T>

    task<T>(tag: string | number, cb: (t: ITask) => T | Promise<T>): Promise<T>

    task<T>(options: { tag?: any }, cb: (t: ITask) => T | Promise<T>): Promise<T>

    // Conditional Tasks;
    // API: https://vitaly-t.github.io/pg-promise/Database.html#taskIf
    taskIf<T>(cb: (t: ITask) => T | Promise<T>): Promise<T>

    taskIf<T>(tag: string | number, cb: (t: ITask) => T | Promise<T>): Promise<T>

    taskIf<T>(options: ITaskIfOptions, cb: (t: ITask) => T | Promise<T>): Promise<T>

    // Transactions;
    // API: https://vitaly-t.github.io/pg-promise/Database.html#tx
    tx<T>(cb: (t: ITask) => T | Promise<T>): Promise<T>

    tx<T>(tag: string | number, cb: (t: ITask) => T | Promise<T>): Promise<T>

    tx<T>(options: {
      tag?: any,
      mode?: any
    }, cb: (t: ITask) => T | Promise<T>): Promise<T>

    // Conditional Transactions;
    // API: https://vitaly-t.github.io/pg-promise/Database.html#txIf
    txIf<T>(cb: (t: ITask) => T | Promise<T>): Promise<T>

    txIf<T>(tag: string | number, cb: (t: ITask) => T | Promise<T>): Promise<T>

    txIf<T>(options: ITxIfOptions, cb: (t: ITask) => T | Promise<T>): Promise<T>
  }
}`;
