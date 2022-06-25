import { getTextPatch, TextPatch, unpatchText, WAL } from "../dist/util";
import { typeTestsOK } from "./typeTests";

typeTestsOK();

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
  const patch = getTextPatch(o, n) as TextPatch;
  // console.log(o, patch)
  const unpatched = unpatchText(o, patch);
  // console.log(o, unpatched, n)
  if(unpatched !== n){
    failed = i;
  }
});

if(failed > -1) {
  error = { msg: "unpatchText failed for:", data: vals[failed] }
}

const w = new WAL({
  id_fields: ["a", "b"],
  synced_field: "c",
  onSend: async (d) => {

    if(d[0].a !== "a" || d[3].a !== "z" || d[2].b !== "zbb"){
      error = error || { msg: "WAL sorting failed", data: d }
    }

    /* END */
    if(error){
      console.error(error);
      process.exit(1);
    } else {
      console.log("Testing successful")
      process.exit(0);
    }
  },
  throttle: 100,
  batch_size: 50
});

w.addData(
  [
    { current: { a: "a", b: "bbb", c: "1"} },
    { current: { a: "e", b: "zbb", c: "1"} },
    { current: { a: "e", b: "ebb", c: "1"} },
    { current: { a: "z", b: "bbb", c: "1"} }
  ]
);






