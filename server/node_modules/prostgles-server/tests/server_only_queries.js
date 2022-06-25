"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function f(db) {
    /* Transaction example */
    await db.tx(async (t) => {
        await t.items.insert({ name: "tx_" });
        const expect1 = await t.items.count({ name: "tx_" });
        const expect0 = await db.items.count({ name: "tx_" });
        if (expect0 !== 0 || expect1 !== 1)
            throw "db.tx failed";
        //throw "err"; // Any errors will revert all data-changing commands using the transaction object ( t )
    });
    const expect1 = await db.items.count({ name: "tx_" });
    if (expect1 !== 1)
        throw "db.tx failed";
}
exports.default = f;
