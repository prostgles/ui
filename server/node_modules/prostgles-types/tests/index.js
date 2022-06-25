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
const util_1 = require("../dist/util");
const typeTests_1 = require("./typeTests");
(0, typeTests_1.typeTestsOK)();
let error;
let failed = -1;
const vals = [
    { o: "ad awd awd awb", n: "a12b" },
    { o: "ab", n: "zzzzzzzzdqw q32e3qz" },
    { o: "ab", n: "12ab" },
    { o: "ab", n: "a12" },
    { o: "", n: "a12b" },
    { o: "ab", n: "" },
    { o: "ab", n: null },
    { o: null, n: "a12b" },
    { o: "ab123", n: "ab123" },
];
vals.map(({ o, n }, i) => {
    const patch = (0, util_1.getTextPatch)(o, n);
    const unpatched = (0, util_1.unpatchText)(o, patch);
    if (unpatched !== n) {
        failed = i;
    }
});
if (failed > -1) {
    error = { msg: "unpatchText failed for:", data: vals[failed] };
}
const w = new util_1.WAL({
    id_fields: ["a", "b"],
    synced_field: "c",
    onSend: (d) => __awaiter(void 0, void 0, void 0, function* () {
        if (d[0].a !== "a" || d[3].a !== "z" || d[2].b !== "zbb") {
            error = error || { msg: "WAL sorting failed", data: d };
        }
        if (error) {
            console.error(error);
            process.exit(1);
        }
        else {
            console.log("Testing successful");
            process.exit(0);
        }
    }),
    throttle: 100,
    batch_size: 50
});
w.addData([
    { current: { a: "a", b: "bbb", c: "1" } },
    { current: { a: "e", b: "zbb", c: "1" } },
    { current: { a: "e", b: "ebb", c: "1" } },
    { current: { a: "z", b: "bbb", c: "1" } }
]);
//# sourceMappingURL=index.js.map