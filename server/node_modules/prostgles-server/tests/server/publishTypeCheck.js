"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPublishTypes = void 0;
const testPublishTypes = () => {
    (() => {
        const p1 = {
            items: {
                delete: "*",
                select: {
                    fields: { h: 1, id: 1 },
                    forcedFilter: { $and: [
                            { h: { $overlaps: ["23", "32"] } },
                            { $existsJoined: { items: { "h.$eq": [] } } }
                        ] }
                }
            },
            items3: "*"
        };
        const p2 = "*";
        const p11 = {
            items: {
                delete: "*",
                select: {
                    fields: { h: 1, id: 1 },
                    forcedFilter: {
                        $and: [
                            { h: { $overlaps: ["23", "32"] } },
                            { $existsJoined: { items: { "h.$eq": [] } } }
                        ]
                    }
                }
            },
            items3: "*"
        };
        const p123 = p11;
        const p1234 = p1;
        const p12 = "*";
        const res = {
            shapes: "*",
            items: "*",
            items2: "*",
            items3: "*",
            v_items: "*",
            various: "*",
            tr1: "*",
            tr2: "*",
            planes: {
                select: "*",
                update: "*",
                insert: "*",
                delete: "*",
                sync: {
                    id_fields: ["id"],
                    synced_field: "last_updated"
                }
            },
            items4: {
                select: Math.random() ? "*" : {
                    fields: { name: 0 },
                    forcedFilter: { name: "abc" }
                },
                insert: "*",
                update: "*",
                delete: "*"
            },
            items4_pub: "*",
            "*": {
                select: { fields: { "*": 0 } },
                insert: "*",
                update: "*",
            },
            [`"*"`]: {
                select: { fields: { [`"*"`]: 0 } },
                insert: "*",
                update: "*",
            },
            obj_table: "*",
            media: "*",
            items_with_one_media: "*",
            items_with_media: "*",
            prostgles_lookup_media_items_with_one_media: "*",
            prostgles_lookup_media_items_with_media: "*",
            insert_rules: {
                insert: {
                    fields: "*",
                    returningFields: { name: 1 },
                    validate: async (row) => {
                        if (row.name === "a")
                            row.name = "b";
                        return row;
                    }
                }
            },
            uuid_text: {
                insert: {
                    fields: "*",
                    forcedData: {
                        id: 'c81089e1-c4c1-45d7-a73d-e2d613cb7c3e'
                    }
                },
                update: {
                    fields: [],
                    dynamicFields: [{
                            fields: { id: 1 },
                            filter: {
                                id: 'c81089e1-c4c1-45d7-a73d-e2d613cb7c3e'
                            }
                        }]
                }
            }
        };
        const res2 = res;
        const res3 = {
            items: {
                select: {
                    fields: {
                        h: 1
                    },
                    forcedFilter: {
                        // "h.$eq": ["2"]
                        $and: [
                            { "h.$eq": ["2"] }
                        ]
                    }
                }
            }
        };
    });
};
exports.testPublishTypes = testPublishTypes;
