export const debugObjectChanges = <T extends object>(
  obj: T,
  deep = false,
): T => {
  return observeObjectChanges(
    obj,
    () => {
      // eslint-disable-next-line no-debugger
      debugger;
    },
    deep ? new WeakSet<WeakKey>() : undefined,
  );
};

function observeObjectChanges<T extends object>(
  obj: T,
  onChange: () => void,
  seen: WeakSet<WeakKey> | undefined,
): T {
  console.error("watchDeep started");
  if (seen) {
    if (obj !== Object(obj) || seen.has(obj)) {
      return obj;
    }
    seen.add(obj);
  }

  if (Array.isArray(obj)) {
    const trackedArray = observeArray(obj, onChange);
    trackedArray.forEach((item) => {
      return observeObjectChanges(item, onChange, seen);
    });
    return trackedArray;
  }
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (seen && typeof value === "object" && value !== null) {
        return observeObjectChanges(value, onChange, seen);
      }
      return value;
    },

    set(target, prop, value, receiver) {
      const oldValue = target[prop];
      const result = Reflect.set(target, prop, value, receiver);

      if (oldValue !== value) {
        onChange();
      }
      return result;
    },

    deleteProperty(target, prop) {
      const result = Reflect.deleteProperty(target, prop);

      onChange();

      return result;
    },
  });
}

const observeArray = <T extends any[]>(arr: T, onChange: VoidFunction): T => {
  const arrayMethods = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
  ];
  arrayMethods.forEach((method) => {
    arr[method] = function (...args) {
      onChange();
      const result = Array.prototype[method].apply(this, args);
      return result;
    };
  });
  return arr;
};

const internalFunctions = new Set([
  "Generator.next",
  "asyncGeneratorStep",
  "_next",
  "Promise.then",
  "new Promise",
  "Object.<anonymous>",
  "Module._compile",
  "Module.load",
]);

export function stackTrace(arg, check?: (chain: string) => void): void {
  const stack = new Error().stack?.split("\n").slice(2) ?? [];

  const chain = stack
    .map((line) => {
      const [content, filePath] = line.slice("    at ".length).split(" (");
      if (!content) return;
      if (filePath?.includes("vendors-node_modules")) return;
      if (content.startsWith("http")) return;
      if (internalFunctions.has(content)) return;
      return content;
    })
    .filter(Boolean)
    .join(" -> ");
  check?.(chain);
  console.error(chain, arg);
}
