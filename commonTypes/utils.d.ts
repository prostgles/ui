export declare const SECOND = 1000;
export declare const MINUTE: number;
export declare const HOUR: number;
export declare const DAY: number;
export declare const MONTH: number;
export declare const YEAR: number;
export type AGE = {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
};
export declare const getAge: <ReturnALL extends boolean = false>(date1: number, date2: number, returnAll?: ReturnALL | undefined) => ReturnALL extends true ? Required<AGE> : AGE;
