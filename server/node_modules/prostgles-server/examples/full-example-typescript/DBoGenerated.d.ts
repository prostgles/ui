export declare type FieldFilter = object | string[] | "*" | "";
export declare type OrderBy = {
    key: string;
    asc: boolean;
}[] | {
    [key: string]: boolean;
}[] | string | string[];
export declare type SelectParams = {
    select?: FieldFilter;
    limit?: number;
    offset?: number;
    orderBy?: OrderBy;
    expectOne?: boolean;
};
export declare type UpdateParams = {
    returning?: FieldFilter;
    onConflictDoNothing?: boolean;
    fixIssues?: boolean;
    multi?: boolean;
};
export declare type InsertParams = {
    returning?: FieldFilter;
    onConflictDoNothing?: boolean;
    fixIssues?: boolean;
};
export declare type DeleteParams = {
    returning?: FieldFilter;
};
declare type Airports = {
    last_updated?: number;
    id?: number;
};
declare type Planes = {
    last_updated?: number;
    manufacturer?: string;
    model?: string;
    id?: number;
};
declare type DBO_airports = {
    find: (filter?: object, selectParams?: SelectParams, param3_unused?: any) => Promise<Airports[]>;
    findOne: (filter?: object, selectParams?: SelectParams, param3_unused?: any) => Promise<Airports>;
    subscribe: (filter: object, params: SelectParams, onData: (items: Airports[]) => any) => {
        unsubscribe: () => any;
    };
    subscribeOne: (filter: object, params: SelectParams, onData: (item: Airports) => any) => {
        unsubscribe: () => any;
    };
    count: (filter?: object) => Promise<number>;
    update: (filter: object, newData: Airports, params?: UpdateParams) => Promise<void | Airports>;
    upsert: (filter: object, newData: Airports, params?: UpdateParams) => Promise<void | Airports>;
    insert: (data: (Airports | Airports[]), params?: InsertParams) => Promise<void | Airports>;
    delete: (filter: object, params?: DeleteParams) => Promise<void | Airports>;
};
declare type DBO_planes = {
    find: (filter?: object, selectParams?: SelectParams, param3_unused?: any) => Promise<Planes[]>;
    findOne: (filter?: object, selectParams?: SelectParams, param3_unused?: any) => Promise<Planes>;
    subscribe: (filter: object, params: SelectParams, onData: (items: Planes[]) => any) => {
        unsubscribe: () => any;
    };
    subscribeOne: (filter: object, params: SelectParams, onData: (item: Planes) => any) => {
        unsubscribe: () => any;
    };
    count: (filter?: object) => Promise<number>;
    update: (filter: object, newData: Planes, params?: UpdateParams) => Promise<void | Planes>;
    upsert: (filter: object, newData: Planes, params?: UpdateParams) => Promise<void | Planes>;
    insert: (data: (Planes | Planes[]), params?: InsertParams) => Promise<void | Planes>;
    delete: (filter: object, params?: DeleteParams) => Promise<void | Planes>;
};
export declare type DBObj = {
    airports: DBO_airports;
    planes: DBO_planes;
};
export {};
//# sourceMappingURL=DBoGenerated.d.ts.map