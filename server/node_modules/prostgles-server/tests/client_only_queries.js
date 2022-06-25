"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const dist_1 = require("./client/node_modules/prostgles-types/dist");
const isomorphic_queries_1 = require("./isomorphic_queries");
async function client_only(db, auth, log, methods, tableSchema) {
    /**
     * onReady(dbo, methodsObj, tableSchema, _auth)
     * tableSchema must contan an array of all tables and their columns that have getInfo and getColumns allowed
     */
    await (0, isomorphic_queries_1.tryRun)("Check tableSchema", async () => {
        const dbTables = Object.keys(db).map(k => {
            const h = db[k];
            return !!(h.getColumns && h.getInfo) ? k : undefined;
        }).filter(dist_1.isDefined);
        const missingTbl = dbTables.find(t => !tableSchema.some(st => st.name === t));
        if (missingTbl)
            throw `${missingTbl} is missing from tableSchema: ${JSON.stringify(tableSchema)}`;
        const missingscTbl = tableSchema.find(t => !dbTables.includes(t.name));
        if (missingscTbl)
            throw `${missingscTbl} is missing from db`;
        await Promise.all(tableSchema.map(async (tbl) => {
            const cols = await db[tbl.name]?.getColumns();
            const info = await db[tbl.name]?.getInfo();
            assert_1.strict.deepStrictEqual(tbl.columns, cols);
            assert_1.strict.deepStrictEqual(tbl.info, info);
        }));
    });
    const testRealtime = () => {
        return new Promise(async (resolve, reject) => {
            try {
                /* METHODS */
                const t222 = await methods.get();
                assert_1.strict.equal(t222, 222, "methods.get() failed");
                /* RAWSQL */
                await (0, isomorphic_queries_1.tryRun)("SQL Full result", async () => {
                    const sqlStatement = await db.sql("SELECT $1", [1], { returnType: "statement" });
                    assert_1.strict.equal(sqlStatement, "SELECT 1", "db.sql statement query failed");
                    const arrayMode = await db.sql("SELECT 1 as a, 2 as a", undefined, { returnType: "arrayMode" });
                    assert_1.strict.equal(arrayMode.rows?.[0].join("."), "1.2", "db.sql statement arrayMode failed");
                    assert_1.strict.equal(arrayMode.fields?.map(f => f.name).join("."), "a.a", "db.sql statement arrayMode failed");
                    const select1 = await db.sql("SELECT $1 as col1", [1], { returnType: "rows" });
                    assert_1.strict.deepStrictEqual(select1[0], { col1: 1 }, "db.sql justRows query failed");
                    const fullResult = await db.sql("SELECT $1 as col1", [1]);
                    // console.log(fullResult)
                    assert_1.strict.deepStrictEqual(fullResult.rows[0], { col1: 1 }, "db.sql query failed");
                    assert_1.strict.deepStrictEqual(fullResult.fields, [{
                            name: 'col1',
                            tableID: 0,
                            columnID: 0,
                            dataTypeID: 23,
                            dataTypeSize: 4,
                            dataTypeModifier: -1,
                            format: 'text',
                            dataType: 'int4',
                            udt_name: 'int4',
                            tsDataType: "number"
                        }], "db.sql query failed");
                });
                await (0, isomorphic_queries_1.tryRunP)("sql LISTEN NOTIFY events", async (resolve, reject) => {
                    try {
                        const sub = await db.sql("LISTEN chnl ", {}, { allowListen: true, returnType: "arrayMode" });
                        if (!("addListener" in sub)) {
                            reject("addListener missing");
                            return;
                        }
                        sub.addListener(notif => {
                            const expected = "hello";
                            if (notif === expected)
                                resolve(true);
                            else
                                reject(`Notif value is not what we expect: ${JSON.stringify(notif)} is not ${JSON.stringify(expected)} (expected) `);
                        });
                        db.sql("NOTIFY chnl , 'hello'; ");
                    }
                    catch (e) {
                        reject(e);
                    }
                });
                await (0, isomorphic_queries_1.tryRunP)("sql NOTICE events", async (resolve, reject) => {
                    const sub = await db.sql("", {}, { returnType: "noticeSubscription" });
                    sub.addListener(notice => {
                        const expected = "hello2";
                        if (notice.message === expected)
                            resolve(true);
                        else
                            reject(`Notice value is not what we expect: ${JSON.stringify(notice)} is not ${JSON.stringify(expected)} (expected) `);
                    });
                    db.sql(`
          DO $$ 
          BEGIN

            RAISE NOTICE 'hello2';

          END $$;
        `);
                }, log);
                /* REPLICATION */
                log("Started testRealtime");
                const start = Date.now();
                await db.planes.delete();
                let inserts = new Array(100).fill(null).map((d, i) => ({ id: i, flight_number: `FN${i}`, x: Math.random(), y: i }));
                await db.planes.insert(inserts);
                const CLOCK_DRIFT = 2000;
                if ((await db.planes.count()) !== 100)
                    throw "Not 100 planes";
                /**
                 * Two listeners are added at the same time to dbo.planes (which has 100 records):
                 *  subscribe({ x: 10 }
                 *  sync({}
                 *
                 * Then sync starts updating x to 10 for each record
                 * subscribe waits for 100 records of x=10 and then updates everything to x=20
                 * sync waits for 100 records of x=20 and finishes the test
                 */
                /* After all sync records are updated to x10 here we'll update them to x20 */
                const sP = await db.planes.subscribe({ x: 10 }, {}, async (planes) => {
                    const p10 = planes.filter(p => p.x == 10);
                    log(Date.now() + ": sub stats: x10 -> " + p10.length + "    x20 ->" + planes.filter(p => p.x == 20).length);
                    if (p10.length === 100) {
                        /** 2 second delay to account for client-server clock drift */
                        setTimeout(async () => {
                            // db.planes.findOne({}, { select: { last_updated: "$max"}}).then(log);
                            sP.unsubscribe();
                            log(Date.now() + ": sub: db.planes.update({}, { x: 20, last_updated });");
                            const dLastUpdated = Math.max(...p10.map(v => +v.last_updated));
                            const last_updated = Date.now();
                            if (dLastUpdated >= last_updated)
                                throw "dLastUpdated >= last_updated should not happen";
                            await db.planes.update({}, { x: 20, last_updated });
                            log(Date.now() + ": sub: Updated to x20", await db.planes.count({ x: 20 }));
                            // db.planes.findOne({}, { select: { last_updated: "$max"}}).then(log)
                        }, CLOCK_DRIFT);
                    }
                });
                let updt = 0;
                const sync = await db.planes.sync({}, { handlesOnData: true, patchText: true, }, (planes, deltas) => {
                    const x20 = planes.filter(p => p.x == 20).length;
                    const x10 = planes.filter(p => p.x == 10);
                    log(Date.now() + `: sync stats: x10 -> ${x10.length}  x20 -> ${x20}`);
                    let update = false;
                    planes.map(p => {
                        // if(p.y === 1) window.up = p;
                        if (typeof p.x !== "number")
                            log(typeof p.x);
                        if (+p.x < 10) {
                            updt++;
                            update = true;
                            p.$update({ x: 10 });
                            log(Date.now() + `: sync: p.$update({ x: 10 }); (id: ${p.id})`);
                        }
                    });
                    // if(update) log("$update({ x: 10 })", updt)
                    if (x20 === 100) {
                        // log(22)
                        // console.timeEnd("test")
                        log(Date.now() + ": sync end: Finished replication test. Inserting 100 rows then updating two times took: " + (Date.now() - start - CLOCK_DRIFT) + "ms");
                        resolve(true);
                    }
                });
                const msLimit = 20000;
                setTimeout(async () => {
                    const dbCounts = {
                        x10: await db.planes.count({ x: 10 }),
                        x20: await db.planes.count({ x: 20 }),
                        latest: await db.planes.findOne({}, { orderBy: { last_updated: -1 } }),
                    };
                    const syncCounts = {
                        x10: sync?.getItems().filter(d => d.x == 10).length,
                        x20: sync?.getItems().filter(d => d.x == 20).length,
                        latest: sync?.getItems()?.sort((a, b) => +b.last_updated - +a.last_updated)[0],
                    };
                    const msg = "Replication test failed due to taking longer than " + msLimit + "ms \n " + JSON.stringify({ dbCounts, syncCounts }, null, 2);
                    log(msg);
                    reject(msg);
                }, msLimit);
            }
            catch (err) {
                log(JSON.stringify(err));
                await tout(1000);
                throw err;
            }
        });
    };
    /* TODO: SECURITY */
    log("auth.user:", auth.user);
    if (!auth.user) {
        log("Checking public data");
        // Public data
        await (0, isomorphic_queries_1.tryRun)("Security rules example", async () => {
            const vQ = await db.items4.find({}, { select: { added: 0 } });
            assert_1.strict.deepStrictEqual(vQ, [
                { id: 1, public: 'public data' },
                { id: 2, public: 'public data' }
            ]);
            const cols = await db.insert_rules.getColumns();
            assert_1.strict.equal(cols.filter(({ insert, update: u, select: s, delete: d }) => insert && !u && !s && !d).length, 3, "Validated getColumns failed");
            /* Validated insert */
            const expectB = await db.insert_rules.insert({ name: "a" }, { returning: "*" });
            assert_1.strict.deepStrictEqual(expectB, { name: "b" }, "Validated insert failed");
            /* forced UUID insert */
            const row = await db.uuid_text.insert({}, { returning: "*" });
            assert_1.strict.equal(row.id, 'c81089e1-c4c1-45d7-a73d-e2d613cb7c3e');
        });
        // await tryRun("Duplicate subscription", async () => {
        //   return new Promise(async (resolve, reject) => {
        //     let data1 = [], data2 = [], cntr = 0;
        //     function check(){
        //       cntr++;
        //       if(cntr === 2){
        //         assert.equal(data1.length, data2.length);
        //         console.error(data1, data2)
        //         reject( data1);
        //         resolve(data1)
        //       }
        //     }
        //     const sub1 = await db.planes.subscribe({}, {}, data => {
        //       data1 = data;
        //       check()
        //     });
        //     const sub2 = await db.planes.subscribe({}, {}, data => {
        //       data2 = data;
        //       check()
        //     });
        //   })
        // })
        await testRealtime();
        // auth.login({ username: "john", password: "secret" });
        // await tout();
    }
    else {
        log("Checking User data");
        // User data
        await (0, isomorphic_queries_1.tryRun)("Security rules example", async () => {
            const vQ = await db.items4.find();
            assert_1.strict.deepStrictEqual(vQ, [
                { id: 1, public: 'public data' },
                { id: 2, public: 'public data' }
            ]);
            const dynamicCols = await db.uuid_text.getColumns(undefined, {
                rule: "update",
                filter: {
                    id: 'c81089e1-c4c1-45d7-a73d-e2d613cb7c3e'
                },
                data: {
                    id: "dwadwa"
                }
            });
            assert_1.strict.equal(dynamicCols.length, 1);
            assert_1.strict.equal(dynamicCols[0].name, "id");
            const defaultCols = await db.uuid_text.getColumns(undefined, {
                rule: "update",
                filter: {
                    id: 'not matching'
                },
                data: {
                    id: "dwadwa"
                }
            });
            throw defaultCols.map(c => c.name);
        }, log);
    }
}
exports.default = client_only;
const tout = (t = 3000) => {
    return new Promise(async (resolve, reject) => {
        setTimeout(() => {
            resolve(true);
        }, t);
    });
};
