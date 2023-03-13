import { DBSSchema } from "./publishUtils";

export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const MONTH = DAY * 30;
export const YEAR = DAY * 365;

export type AGE = {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

export const getAge = <ReturnALL extends boolean = false>(date1: number, date2: number, returnAll?: ReturnALL): ReturnALL extends true? Required<AGE> : AGE => {
  
  const diff = +date2 - +date1;

  const years = diff/YEAR,
    months = diff/MONTH,
    days = diff/DAY,
    hours = diff/HOUR,
    minutes = diff/MINUTE,
    seconds = diff/SECOND;

  if(returnAll && returnAll === true){
    return { years, months, days, hours, minutes, seconds };
  }

  if(years >= 1){
    return { years, months } as any;
  } else if(months >= 1){
    return { months, days } as any;
  } else if(days >= 1){
    return { days, hours } as any;
  } else if(hours >= 1){
    return { hours, minutes } as any;
  } else {
    return { minutes, seconds } as any;
  }
}

export const DESTINATIONS = [
  { key: "Local", subLabel: "Saved locally (server in address bar)" },
  { key: "Cloud", subLabel: "Saved to Amazon S3" }
] as const;

export type DumpOpts = DBSSchema["backups"]["options"]; 

export type PGDumpParams = { 
  options: DumpOpts; 
  credentialID?: DBSSchema["backups"]["credential_id"];
  destination: typeof DESTINATIONS[number]["key"];
  initiator?: string; 
};

export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
