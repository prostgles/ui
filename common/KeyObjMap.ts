type AnyRecord = Record<string, unknown>;

export class KeyObjMap<K extends AnyRecord, V> {
  private readonly root = new Map<unknown, unknown>();
  private keyOrder: readonly (keyof K)[] = [];

  constructor() {}

  set(keyObj: K, value: V): this {
    if (!this.keyOrder.length) {
      this.keyOrder = Object.keys(keyObj).toSorted() as (keyof K)[];
    }
    let node: Map<unknown, unknown> = this.root;

    for (const key of this.keyOrder) {
      const part = keyObj[key];

      let next = node.get(part);
      if (!(next instanceof Map)) {
        next = new Map<unknown, unknown>();
        node.set(part, next);
      }

      node = next as Map<unknown, unknown>;
    }

    const lastKey = this.keyOrder.at(-1)!;
    node.set(keyObj[lastKey], value);
    return this;
  }

  get(keyObj: K): V | undefined {
    const { node, lastPart } = this.walkToParent(keyObj);
    if (!node) return undefined;
    return node.get(lastPart) as V | undefined;
  }

  has(keyObj: K): boolean {
    const { node, lastPart } = this.walkToParent(keyObj);
    return !!node && node.has(lastPart);
  }

  delete(keyObj: K): boolean {
    const path: Array<{ map: Map<unknown, unknown>; part: unknown }> = [];
    let node: Map<unknown, unknown> = this.root;

    for (const key of this.keyOrder) {
      const part = keyObj[key];
      path.push({ map: node, part });

      const next = node.get(part);
      if (!(next instanceof Map)) return false;
      node = next;
    }

    const lastPart = keyObj[this.keyOrder.at(-1)!];
    const removed = node.delete(lastPart);
    if (!removed) return false;

    // Optional pruning of empty nested maps
    for (const { map, part } of [...path].toReversed()) {
      const child = map.get(part);
      if (child instanceof Map && child.size === 0) {
        map.delete(part);
      } else {
        break;
      }
    }

    return true;
  }

  clear(): void {
    this.root.clear();
  }

  private walkToParent(keyObj: K): {
    node: Map<unknown, unknown> | null;
    lastPart: unknown;
  } {
    let node: Map<unknown, unknown> = this.root;

    for (const key of this.keyOrder) {
      const part = keyObj[key];
      const next = node.get(part);
      if (!(next instanceof Map)) {
        return {
          node: null,
          lastPart: keyObj[this.keyOrder.at(-1)!],
        };
      }
      node = next;
    }

    return {
      node,
      lastPart: keyObj[this.keyOrder.at(-1)!],
    };
  }
}
