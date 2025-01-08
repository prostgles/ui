import type { InitOptions } from "prostgles-client/dist/prostgles";
import { getKeys, isEmpty, isDefined } from "prostgles-types";
export { getKeys, isEmpty, isDefined };
import type { AnyObject } from "prostgles-types";
import { isObject } from "prostgles-types";
export const get = (nestedObj: any, pathArr: string | (string | number)[]) => {
  if (typeof pathArr === "string") pathArr = pathArr.split(".");
  return pathArr.reduce(
    (obj, key) => (obj && obj[key] !== "undefined" ? obj[key] : undefined),
    nestedObj,
  );
};

/* Get only the specified properties of an object */
export function filterObj<T extends AnyObject, K extends keyof T>(
  obj: T,
  keysToInclude: K[] = [],
  keysToExclude: readonly (keyof T)[] = [],
): Omit<T, (typeof keysToInclude)[number]> {
  if (!keysToInclude.length && !keysToExclude.length) {
    // console.warn("filterObj: returning empty object");
    return {} as T;
  }
  const keys = Object.keys(obj) as Array<keyof typeof obj>;
  if (keys.length) {
    const res: Partial<T> = {};
    keys.forEach((k) => {
      if (
        (keysToInclude.length && keysToInclude.includes(k as any)) ||
        (keysToExclude.length && !keysToExclude.includes(k))
      ) {
        res[k] = obj[k];
      }
    });
    return res as T;
  }

  return obj;
}

export function ifEmpty(v: any, replaceValue: any) {
  return isEmpty(v) ? replaceValue : v;
}

export function nFormatter(num, digits) {
  const si = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let i;
  for (i = si.length - 1; i > 0; i--) {
    if (num >= si[i]!.value) {
      break;
    }
  }
  return (num / si[i]!.value).toFixed(digits).replace(rx, "$1") + si[i]!.symbol;
}

type StrFormat = {
  idx: number;
  len: number;
  val: any;
  decimalPlaces: number;
  type: "c" | "n" | "s";
  // characted number symbol
};
export function getStringFormat(s: string | undefined): StrFormat[] {
  if (s && typeof s === "string") {
    const res: StrFormat[] = [];
    let curF: StrFormat | undefined;
    s.split("").map((c, idx) => {
      const mt =
        c.match(/[A-Za-z]/) ? "c"
        : c.match(/[0-9.]/) ? "n"
        : "s";
      const _cF: StrFormat = {
        idx,
        len: 1,
        val: c,
        type: mt,
        decimalPlaces: 0,
      };
      if (curF) {
        const differentFormat = curF.type !== mt;
        const numberWithEnoughDots =
          !differentFormat && c === "." && (curF.val as string).includes(".");
        if (differentFormat || numberWithEnoughDots) {
          res.push(curF);
          if (numberWithEnoughDots) {
            _cF.type === "s";
            res.push(_cF);
            curF = undefined;
          } else {
            curF = _cF;
          }
        } else {
          curF.len = idx - curF.idx + 1;
          curF.val += c;
        }
      } else {
        curF = _cF;
      }

      if (curF && idx === s.length - 1) {
        curF.len = idx - curF.idx + 1;
        res.push(curF);
      }
    });

    return res.map((r) => {
      if (r.type === "n" && r.val.includes(".")) {
        r.decimalPlaces = r.len - 1 - r.val.indexOf(".");
      }
      return r;
    });
  }
  return [];
}

export function quickClone<T>(obj: T): T {
  if (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    window !== undefined &&
    "structuredClone" in window &&
    typeof window.structuredClone === "function"
  ) {
    // @ts-ignore
    return window.structuredClone(obj);
  }
  if (isObject(obj)) {
    const result = {} as any;
    getKeys(obj).map((k) => {
      result[k] = quickClone(obj[k]);
    });
    return result;
  } else if (Array.isArray(obj)) {
    return obj.slice(0).map((v) => quickClone(v)) as any;
  }
  return obj;
}

const comparableTypes = ["number", "string", "boolean"] as const;
export const areEqual = <T extends AnyObject>(
  obj1: T,
  obj2: T,
  keys?: (keyof T)[],
): boolean => {
  if (typeof obj1 !== typeof obj2) return false;
  if ([obj1, obj2].some((v) => comparableTypes.includes(typeof v as any))) {
    return obj1 === obj2;
  }
  return !(keys ?? getKeys({ ...obj1, ...obj2 })).some(
    (k) =>
      typeof obj1[k] !== typeof obj2[k] ||
      JSON.stringify(obj1[k]) !== JSON.stringify(obj2[k]),
  );
};

export const playwrightTestLogs: InitOptions["onDebug"] = (ev) => {
  //@ts-ignore
  window.prostgles_logs ??= [];
  //@ts-ignore
  window.prostgles_logs.push({ ...ev, ts: new Date() });
  const trackedTableNames = [
    "global_settings",
    "llm_chats",
    "llm_messages",
    "llm_prompts",
    "llm_credentials",
  ];
  if (ev.type === "table" && trackedTableNames.includes(ev.tableName)) {
    // if(ev.command === "unsubscribe") debugger;
    console.log(Date.now(), "DBS client", ev);
  } else if (
    ev.type === "onReady" ||
    ev.type === "onReady.call" ||
    ev.type === "onReady.notMounted"
  ) {
    console.log(Date.now(), "DBS client", ev);
  }
};
