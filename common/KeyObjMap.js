export class KeyObjMap {
    constructor() {
        this.root = new Map();
        this.keyOrder = [];
    }
    set(keyObj, value) {
        if (!this.keyOrder.length) {
            this.keyOrder = Object.keys(keyObj).toSorted();
        }
        let node = this.root;
        for (const key of this.keyOrder) {
            const part = keyObj[key];
            let next = node.get(part);
            if (!(next instanceof Map)) {
                next = new Map();
                node.set(part, next);
            }
            node = next;
        }
        const lastKey = this.keyOrder.at(-1);
        node.set(keyObj[lastKey], value);
        return this;
    }
    get(keyObj) {
        const { node, lastPart } = this.walkToParent(keyObj);
        if (!node)
            return undefined;
        return node.get(lastPart);
    }
    has(keyObj) {
        const { node, lastPart } = this.walkToParent(keyObj);
        return !!node && node.has(lastPart);
    }
    delete(keyObj) {
        const path = [];
        let node = this.root;
        for (const key of this.keyOrder) {
            const part = keyObj[key];
            path.push({ map: node, part });
            const next = node.get(part);
            if (!(next instanceof Map))
                return false;
            node = next;
        }
        const lastPart = keyObj[this.keyOrder.at(-1)];
        const removed = node.delete(lastPart);
        if (!removed)
            return false;
        // Optional pruning of empty nested maps
        for (const { map, part } of [...path].toReversed()) {
            const child = map.get(part);
            if (child instanceof Map && child.size === 0) {
                map.delete(part);
            }
            else {
                break;
            }
        }
        return true;
    }
    clear() {
        this.root.clear();
    }
    walkToParent(keyObj) {
        let node = this.root;
        for (const key of this.keyOrder) {
            const part = keyObj[key];
            const next = node.get(part);
            if (!(next instanceof Map)) {
                return {
                    node: null,
                    lastPart: keyObj[this.keyOrder.at(-1)],
                };
            }
            node = next;
        }
        return {
            node,
            lastPart: keyObj[this.keyOrder.at(-1)],
        };
    }
}
