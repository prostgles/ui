import { getStringFormat } from "../../utils";

type Type = "string" | "date" | "timestamp" | "number" | "integer";
const getType = (val: string) => {
  const format = getStringFormat(val);
  const formatStr = format.map(f => f.type).join("");
  if(format.length){
    let type: Type | undefined;
    format.find(f => {
      if(f.type === "c"){
        type = "string";
        return true;
      } 
      if(f.type === "n"){
        const isInteger = !val.includes(".");
        type ??= isInteger? "integer" : "number";
        if(isInteger && type === "number") type = "integer";
        return true;
      }
      if(f.type === "n" && !val.includes(".")){
        type = "number";
        return true;
      }
    })
    return "number";
  }

  return undefined;
}

/**
 * During the file import process, this function will check the data types of the columns in the CSV file.
 */
export const checkCSVColumnDataTypes = async (args: Args) => {
  const keyTypes: Record<string, Type> = {};
  const onBatch = async (batch: Record<string, any>[]) => {
    batch.forEach(row => {
      Object.entries(row).forEach(([key, val]) => {
        const type = typeof val;
        if (type === "string") {
          const format = getStringFormat(val);
          if (!keyTypes[key]) keyTypes[key] = "string";
        } else if (type === "number") {
          if (!keyTypes[key]) keyTypes[key] = "number";
        } else if (type === "object") {
          if (val instanceof Date) {
            if (!keyTypes[key]) keyTypes[key] = "date";
          }
        }
      });
    });
  }
}