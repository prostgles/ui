/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function createDisposableRef(object, disposable) {
    return {
        object,
        dispose: () => disposable === null || disposable === void 0 ? void 0 : disposable.dispose(),
    };
}
export function compareBy(selector, comparator) {
    return (a, b) => comparator(selector(a), selector(b));
}
export function compareByNumber() {
    return (a, b) => a - b;
}
export function findMaxBy(items, comparator) {
    let min = undefined;
    for (const item of items) {
        if (min === undefined || comparator(item, min) > 0) {
            min = item;
        }
    }
    return min;
}
