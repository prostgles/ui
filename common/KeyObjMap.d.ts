type AnyRecord = Record<string, unknown>;
export declare class KeyObjMap<K extends AnyRecord, V> {
    private readonly root;
    private get keyOrder();
    _keys?: (keyof K)[];
    constructor();
    set(keyObj: K, value: V): this;
    get(keyObj: K): V | undefined;
    has(keyObj: K): boolean;
    delete(keyObj: K): boolean;
    clear(): void;
    private walkToParent;
}
export {};
//# sourceMappingURL=KeyObjMap.d.ts.map