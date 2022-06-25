"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncData = void 0;
const PubSubManager_1 = require("./PubSubManager");
const prostgles_types_1 = require("prostgles-types");
function getNumbers(numberArr) {
    return numberArr.filter(v => v !== null && v !== undefined && Number.isFinite(+v));
}
const syncData = async (_this, sync, clientData, source) => {
    (0, PubSubManager_1.log)("syncData", { clientData, sync: (0, PubSubManager_1.pickKeys)(sync, ["filter", "last_synced", "lr", "is_syncing"]), source });
    const { socket_id, channel_name, table_name, filter, table_rules, allow_delete = false, params, synced_field, id_fields = [], batch_size, wal, throttle = 0 } = sync, socket = _this.sockets[socket_id];
    if (!socket) {
        console.error("Orphaned socket", { sync, clientData });
        return;
    }
    const sync_fields = [synced_field, ...id_fields.sort()], orderByAsc = sync_fields.reduce((a, v) => ({ ...a, [v]: true }), {}), orderByDesc = sync_fields.reduce((a, v) => ({ ...a, [v]: false }), {}), 
    // desc_params = { orderBy: [{ [synced_field]: false }].concat(id_fields.map(f => ({ [f]: false }) )) },
    // asc_params = { orderBy: [synced_field].concat(id_fields) },
    rowsIdsMatch = (a, b) => {
        return a && b && !id_fields.find(key => (a[key]).toString() !== (b[key]).toString());
    }, rowsFullyMatch = (a, b) => {
        return rowsIdsMatch(a, b) && a?.[synced_field].toString() === b?.[synced_field].toString();
    }, getServerRowInfo = async (args = {}) => {
        const { from_synced = null, to_synced = null, offset = 0, limit } = args;
        let _filter = { ...filter };
        if (from_synced || to_synced) {
            _filter[synced_field] = {
                ...(from_synced ? { $gte: from_synced } : {}),
                ...(to_synced ? { $lte: to_synced } : {})
            };
        }
        if (_this.dbo?.[table_name]?.find === undefined || _this?.dbo?.[table_name]?.count === undefined) {
            throw `dbo.${table_name}.find or .count are missing or not allowed`;
        }
        const first_rows = await _this.dbo?.[table_name]?.find?.(_filter, { orderBy: orderByAsc, select: sync_fields, limit, offset }, undefined, table_rules);
        const last_rows = first_rows?.slice(-1);
        // const last_rows = await _this?.dbo[table_name]?.find?.(_filter, { orderBy: (orderByDesc as OrderBy), select: sync_fields, limit: 1, offset: -offset || 0 }, null, table_rules);
        const count = await _this.dbo?.[table_name]?.count?.(_filter, undefined, undefined, table_rules);
        return { s_fr: first_rows?.[0] || null, s_lr: last_rows?.[0] || null, s_count: count };
    }, getClientRowInfo = (args = {}) => {
        const { from_synced = null, to_synced = null, end_offset = null } = args;
        let res = new Promise((resolve, reject) => {
            let onSyncRequest = { from_synced, to_synced, end_offset }; //, forReal: true };
            socket.emit(channel_name, { onSyncRequest }, (resp) => {
                if (resp && "onSyncRequest" in resp && resp?.onSyncRequest) {
                    let c_fr = resp.onSyncRequest.c_fr, c_lr = resp.onSyncRequest.c_lr, c_count = resp.onSyncRequest.c_count;
                    // console.log(onSyncRequest, { c_fr, c_lr, c_count }, socket._user);
                    return resolve({ c_fr, c_lr, c_count });
                }
                else if (resp && "err" in resp && resp?.err) {
                    reject(resp.err);
                }
            });
        });
        return res;
    }, getClientData = (from_synced = 0, offset = 0) => {
        return new Promise((resolve, reject) => {
            const onPullRequest = { from_synced: from_synced || 0, offset: offset || 0, limit: batch_size };
            socket.emit(channel_name, { onPullRequest }, async (resp) => {
                if (resp && resp.data && Array.isArray(resp.data)) {
                    // console.log({ onPullRequest, resp }, socket._user)
                    resolve(sortClientData(resp.data));
                }
                else {
                    reject("unexpected onPullRequest response: " + JSON.stringify(resp));
                }
            });
        });
        function sortClientData(data) {
            return data.sort((a, b) => {
                /* Order by increasing synced and ids (sorted alphabetically) */
                return (+a[synced_field] - +b[synced_field]) || id_fields.sort().map(idKey => a[idKey] < b[idKey] ? -1 : a[idKey] > b[idKey] ? 1 : 0).find(v => v) || 0;
            });
        }
    }, getServerData = async (from_synced = 0, offset = 0) => {
        let _filter = {
            ...filter,
            [synced_field]: { $gte: from_synced || 0 }
        };
        if (!_this?.dbo?.[table_name]?.find)
            throw "_this?.dbo?.[table_name]?.find is missing";
        try {
            let res = _this?.dbo?.[table_name]?.find?.(_filter, {
                select: params.select,
                orderBy: orderByAsc,
                offset: offset || 0,
                limit: batch_size
            }, undefined, table_rules);
            if (!res)
                throw "_this?.dbo?.[table_name]?.find is missing";
            return res;
        }
        catch (e) {
            console.error("Sync getServerData failed: ", e);
            throw "INTERNAL ERROR";
        }
    }, deleteData = async (deleted) => {
        // console.log("deleteData deleteData  deleteData " + deleted.length);
        if (allow_delete) {
            return Promise.all(deleted.map(async (d) => {
                const id_filter = (0, PubSubManager_1.pickKeys)(d, id_fields);
                try {
                    await _this.dbo[table_name].delete(id_filter, undefined, undefined, table_rules);
                    return 1;
                }
                catch (e) {
                    console.error(e);
                }
                return 0;
            }));
        }
        else {
            console.warn("client tried to delete data without permission (allow_delete is false)");
        }
        return false;
    }, 
    /**
     * Upserts the given client data where synced_field is higher than on server
     */
    upsertData = (data, isExpress = false) => {
        // console.log("isExpress", isExpress, data);
        return _this.dboBuilder.getTX(async (dbTX) => {
            const tbl = dbTX[table_name];
            const existingData = await tbl.find({ $or: data.map(d => (0, PubSubManager_1.pickKeys)(d, id_fields)) }, {
                select: [synced_field, ...id_fields],
                orderBy: orderByAsc,
            }, undefined, table_rules);
            let inserts = data.filter(d => !existingData.find(ed => rowsIdsMatch(ed, d)));
            let updates = data.filter(d => existingData.find(ed => rowsIdsMatch(ed, d) && +ed[synced_field] < +d[synced_field]));
            try {
                if (!table_rules)
                    throw "table_rules missing";
                if (table_rules.update && updates.length) {
                    let updateData = [];
                    await Promise.all(updates.map(upd => {
                        const id_filter = (0, PubSubManager_1.pickKeys)(upd, id_fields);
                        const syncSafeFilter = { $and: [id_filter, { [synced_field]: { "<": upd[synced_field] } }] };
                        updateData.push([syncSafeFilter, (0, PubSubManager_1.omitKeys)(upd, id_fields)]);
                    }));
                    await tbl.updateBatch(updateData, { fixIssues: true }, table_rules);
                }
                else {
                    updates = [];
                }
                if (table_rules.insert && inserts.length) {
                    // const qs = await tbl.insert(inserts, { fixIssues: true }, null, table_rules, { returnQuery: true });
                    // console.log("inserts", qs)
                    await tbl.insert(inserts, { fixIssues: true }, undefined, table_rules);
                }
                else {
                    inserts = [];
                }
                return { inserts, updates };
            }
            catch (e) {
                console.trace(e);
                throw e;
            }
        }).then(({ inserts, updates }) => {
            (0, PubSubManager_1.log)(`upsertData: inserted( ${inserts.length} )    updated( ${updates.length} )     total( ${data.length} ) \n last insert ${JSON.stringify(inserts.at(-1))} \n last update ${JSON.stringify(updates.at(-1))}`);
            return { inserted: inserts.length, updated: updates.length, total: data.length };
        })
            .catch(err => {
            console.trace("Something went wrong with syncing to server: \n ->", err, data.length, id_fields);
            return Promise.reject("Something went wrong with syncing to server: ");
        });
    }, 
    /**
     * Pushes the given data to client
     * @param isSynced = true if
     */
    pushData = async (data, isSynced = false, err = null) => {
        return new Promise((resolve, reject) => {
            socket.emit(channel_name, { data, isSynced }, (resp) => {
                if (resp && resp.ok) {
                    // console.log("PUSHED to client: fr/lr", data[0], data[data.length - 1]);
                    resolve({ pushed: data?.length, resp });
                }
                else {
                    reject(resp);
                    console.error("Unexpected response");
                }
            });
        });
    }, 
    /**
     * Returns the lowest synced_field between server and client by checking client and server sync data.
     * If last rows don't match it will find an earlier matching last row and use that last matching from_synced
     * If no rows or fully synced (c_lr and s_lr match) then returns null
     */
    getLastSynced = async (clientSyncInfo) => {
        // Get latest row info
        const { c_fr, c_lr, c_count } = clientSyncInfo || await getClientRowInfo();
        const { s_fr, s_lr, s_count } = await getServerRowInfo();
        // console.log("getLastSynced", clientData, socket._user )
        let result = null;
        /* Nothing to sync */
        if (!c_fr && !s_fr || rowsFullyMatch(c_lr, s_lr)) { //  c_count === s_count && 
            // sync.last_synced = null;
            result = null;
            /* Sync Everything */
        }
        else if (!rowsFullyMatch(c_fr, s_fr)) {
            if (c_fr && s_fr) {
                result = Math.min(c_fr[synced_field], s_fr[synced_field]);
            }
            else if (c_fr || s_fr) {
                result = (c_fr || s_fr)[synced_field];
            }
            /* Sync from last matching synced value */
        }
        else if (rowsFullyMatch(c_fr, s_fr)) {
            if (s_lr && c_lr) {
                result = Math.min(...getNumbers([c_lr[synced_field], s_lr[synced_field]]));
            }
            else {
                result = Math.min(...getNumbers([c_fr[synced_field], s_fr?.[synced_field]]));
            }
            let min_count = Math.min(...getNumbers([c_count, s_count]));
            let end_offset = 1; // Math.min(s_count, c_count) - 1;
            let step = 0;
            while (min_count > 5 && end_offset < min_count) {
                const { c_lr = null } = await getClientRowInfo({ from_synced: 0, to_synced: result, end_offset });
                // console.log("getLastSynced... end_offset > " + end_offset);
                let server_row;
                if (c_lr) {
                    let _filter = {};
                    sync_fields.map(key => {
                        _filter[key] = c_lr[key];
                    });
                    server_row = await _this?.dbo?.[table_name]?.find?.(_filter, { select: sync_fields, limit: 1 }, undefined, table_rules);
                }
                // if(rowsFullyMatch(c_lr, s_lr)){ //c_count === s_count && 
                if (server_row && server_row.length) {
                    server_row = server_row[0];
                    result = +server_row[synced_field];
                    end_offset = min_count;
                    // console.log(`getLastSynced found for ${table_name} -> ${result}`);
                }
                else {
                    end_offset += 1 + step * (step > 4 ? 2 : 1);
                    // console.log(`getLastSynced NOT found for ${table_name} -> ${result}`);
                }
                step++;
            }
        }
        return result;
    }, updateSyncLR = (data) => {
        if (data.length) {
            const lastRow = data[data.length - 1];
            if (sync.lr?.[synced_field] && +sync.lr?.[synced_field] > +lastRow[synced_field]) {
                console.error({ syncIssue: "sync.lr[synced_field] is greater than lastRow[synced_field]" });
            }
            sync.lr = lastRow;
            sync.last_synced = +sync.lr?.[synced_field];
        }
    }, 
    /**
     * Will push pull sync between client and server from a given from_synced value
     */
    syncBatch = async (from_synced) => {
        let offset = 0, limit = batch_size, canContinue = true, min_synced = from_synced || 0, max_synced = from_synced;
        let inserted = 0, updated = 0, pushed = 0, deleted = 0, total = 0;
        // console.log("syncBatch", from_synced)
        while (canContinue) {
            let cData = await getClientData(min_synced, offset);
            if (cData.length) {
                let res = await upsertData(cData);
                inserted += res.inserted;
                updated += res.updated;
            }
            let sData;
            try {
                sData = await getServerData(min_synced, offset);
            }
            catch (e) {
                console.trace("sync getServerData err", e);
                await pushData(undefined, undefined, "Internal error. Check server logs");
                throw " d";
            }
            // console.log("allow_delete", table_rules.delete);
            if (allow_delete && table_rules?.delete) {
                const to_delete = sData.filter(d => {
                    !cData.find(c => rowsIdsMatch(c, d));
                });
                await Promise.all(to_delete.map(d => {
                    deleted++;
                    return _this.dbo[table_name].delete((0, PubSubManager_1.pickKeys)(d, id_fields), {}, undefined, table_rules);
                }));
                sData = await getServerData(min_synced, offset);
            }
            let forClient = sData.filter(s => {
                return !cData.find(c => rowsIdsMatch(c, s) &&
                    +c[synced_field] >= +s[synced_field]);
            });
            if (forClient.length) {
                let res = await pushData(forClient.filter(d => !sync.wal || !sync.wal.isInHistory(d)));
                pushed += res.pushed;
            }
            if (sData.length) {
                updateSyncLR(sData);
                total += sData.length;
            }
            offset += sData.length;
            // canContinue = offset >= limit;
            canContinue = sData.length >= limit;
            // console.log(`sData ${sData.length}      limit ${limit}`);
        }
        // console.log(`syncBatch ${table_name}: inserted( ${inserted} )    updated( ${updated} )   deleted( ${deleted} )    pushed( ${pushed} )     total( ${total} )`, socket._user );
        return true;
    };
    if (!wal) {
        /* Used to throttle and merge incomming updates */
        sync.wal = new prostgles_types_1.WAL({
            id_fields, synced_field, throttle, batch_size,
            DEBUG_MODE: _this.dboBuilder.prostgles.opts.DEBUG_MODE,
            onSendStart: () => {
                sync.is_syncing = true;
            },
            onSend: async (data) => {
                // console.log("WAL upsertData START", data)
                const res = await upsertData(data, true);
                // const max_incoming_synced = Math.max(...data.map(d => +d[synced_field]));
                // if(Number.isFinite(max_incoming_synced) && max_incoming_synced > +sync.last_synced){
                //     sync.last_synced = max_incoming_synced;
                // }
                // console.log("WAL upsertData END")
                /******** */
                /* TO DO -> Store and push patch updates instead of full data if and where possible */
                /******** */
                // 1. Store successfully upserted wal items for a couple of seconds
                // 2. When pushing data to clients check if any matching wal items exist
                // 3. Replace text fields with matching patched data
                return res;
            },
            onSendEnd: (batch) => {
                updateSyncLR(batch);
                sync.is_syncing = false;
                // console.log("syncData from WAL.onSendEnd")
                /**
                 * After all data was inserted request SyncInfo from client and sync again if necessary
                 */
                _this.syncData(sync, undefined, source);
            },
        });
    }
    /* Debounce sync requests */
    if (!sync.wal)
        throw "sync.wal missing";
    if (!sync.wal.isSending() && sync.is_syncing) {
        if (!_this.syncTimeout) {
            _this.syncTimeout = setTimeout(() => {
                _this.syncTimeout = undefined;
                // console.log("SYNC FROM TIMEOUT")
                _this.syncData(sync, undefined, source);
            }, throttle);
        }
        // console.log("SYNC THROTTLE")
        return;
    }
    // console.log("syncData", clientData)
    /**
     * Express data sent from a client that has already been synced
     * Add to WAL manager which will sync at the end
     */
    if (clientData) {
        if (clientData.data && Array.isArray(clientData.data) && clientData.data.length) {
            if (!sync.wal)
                throw "sync.wal missing";
            sync.wal.addData(clientData.data.map(d => ({ current: d })));
            return;
            // await upsertData(clientData.data, true);
            /* Not expecting this anymore. use normal db.table.delete channel */
        }
        else if (clientData.deleted && Array.isArray(clientData.deleted) && clientData.deleted.length) {
            await deleteData(clientData.deleted);
        }
    }
    else {
    }
    if (sync.wal.isSending())
        return;
    sync.is_syncing = true;
    // from synced does not make sense. It should be sync.lr only!!!
    let from_synced = null;
    /** Sync was already synced */
    if (sync.lr) {
        const { s_lr } = await getServerRowInfo();
        /* Make sure trigger is not firing on freshly synced data */
        if (!rowsFullyMatch(sync.lr, s_lr)) {
            from_synced = sync.last_synced;
        }
        else {
            // console.log("rowsFullyMatch")
        }
        // console.log(table_name, sync.lr[synced_field])
    }
    else {
        from_synced = await getLastSynced(clientData);
    }
    if (from_synced !== null) {
        await syncBatch(from_synced);
    }
    else {
        // console.log("from_synced is null")
    }
    await pushData([], true);
    sync.is_syncing = false;
    // console.log(`Finished sync for ${table_name}`, socket._user);
};
exports.syncData = syncData;
//# sourceMappingURL=SyncReplication.js.map