"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeTestsOK = void 0;
(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const tableHandler = undefined;
    const f = {
        $and: [
            { a: "d", num: { ">": 232 } },
            { "num.$eq": 2, }
        ]
    };
    if (tableHandler) {
        const newRow = yield ((_a = tableHandler.insert) === null || _a === void 0 ? void 0 : _a.call(tableHandler, { h: 2 }, { returning: { b: 1, c: 1 } }));
        newRow.b;
        newRow.c;
        newRow.h;
        const row = yield ((_b = tableHandler.findOne) === null || _b === void 0 ? void 0 : _b.call(tableHandler, { "c.$nin": [2] }, { select: { b: 0 } }));
        row.c;
        row.h;
        const vals = yield ((_c = tableHandler.find) === null || _c === void 0 ? void 0 : _c.call(tableHandler, { "c.$nin": [2] }, { returnType: "values" }));
        row.b;
        tableHandler.subscribe({ h: 2 }, { select: { b: 1 } }, (rows) => __awaiter(void 0, void 0, void 0, function* () {
            const row = rows[0];
            row.b;
            row.c;
        }));
        tableHandler.subscribeOne({ h: 2 }, { select: { b: 0 } }, (row) => __awaiter(void 0, void 0, void 0, function* () {
            row.b;
            row.c;
        }));
    }
    const sqlHandler = undefined;
    if (sqlHandler) {
        const full = yield sqlHandler("SELECT 1", {});
        full.rows.flatMap;
        full.fields.find(f => f.tsDataType === "string");
        const value = yield sqlHandler("SELECT 1", {}, { returnType: "value" });
        value;
        const values = yield sqlHandler("SELECT 1", {}, { returnType: "values" });
        values.flatMap;
        const row = yield sqlHandler("SELECT 1", {}, { returnType: "row" });
        row.dhawjpeojfgrdfhoeisj;
        const rows = yield sqlHandler("SELECT 1", {}, { returnType: "rows" });
        rows.flatMap;
        const handles = yield sqlHandler("SELECT 1", {}, { returnType: "noticeSubscription" });
        handles.addListener;
        handles.socketChannel;
        handles.socketUnsubChannel;
        const listenHandlesOrData = yield sqlHandler("SELECT 1", {}, { allowListen: true });
        if ("command" in listenHandlesOrData) {
            listenHandlesOrData.command;
            listenHandlesOrData.duration;
        }
        else {
            listenHandlesOrData.command;
            handles.addListener;
            handles.socketChannel;
            handles.socketUnsubChannel;
        }
    }
    const db = 1;
    const s = { a: 1 };
    const s2 = { a: 1, zz: 1 };
    const s22 = { a: 1, zz: { $max: ["c"] } };
    const s3 = { a: 1, cc: "2" };
    const s33 = { a: 1, c: "$max" };
    db.view1.find({ "c1.$in": ["2", null] }, { select: { c1: 1, c2: 1 } });
    db.table1.insert({ c1: "2" }, { returning: { c1: 1, c2: "func", dwad: { dwada: [] } } });
    db.table1.update;
    db.table12.update;
    db.table1.find;
    const result = yield db.table2.update({}, { c1: "" }, { returning: "*" });
    result.c2 + 2;
    const sel = {
        dwa: 1
    };
    const r = 1;
    const sel1 = { id: 1, name: 1, public: 1, $rowhash: 1, added_day: { $day: [] } };
    const sel2 = { id: 1, name: 1, public: 1, $rowhash: 1, dsds: { d: [] } };
    const sel3 = "";
    const sel4 = "*";
    const sel12 = { id: 1, name: 1, public: 1, $rowhash: 1, dsds: { d: [] } };
    const sel13 = "";
    const sel14 = "*";
    const fRow = {
        $rowhash: { "$in": [""] }
    };
    const emptyFilter = {};
    const ef = {
        $existsJoined: {
            tbl11: {}
        }
    };
    const emptyExists = {
        $existsJoined: {
            tbl1: {}
        }
    };
    const deletePar = {
        returning: { id: 1, name: 1, public: 1, $rowhash: 1, added_day: { "$day": ["added"] } }
    };
}));
const typeTestsOK = () => { };
exports.typeTestsOK = typeTestsOK;
//# sourceMappingURL=typeTests.js.map