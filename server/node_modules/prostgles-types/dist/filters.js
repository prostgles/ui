"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXISTS_KEYS = exports.GeomFilter_Funcs = exports.GeomFilterKeys = exports.ArrayFilterOperands = exports.TextFilter_FullTextSearchFilterKeys = exports.TextFilterFTSKeys = exports.TextFilterKeys = exports.CompareInFilterKeys = exports.CompareFilterKeys = void 0;
exports.CompareFilterKeys = ["=", "$eq", "<>", ">", ">=", "<=", "$eq", "$ne", "$gt", "$gte", "$lte"];
exports.CompareInFilterKeys = ["$in", "$nin"];
exports.TextFilterKeys = ["$ilike", "$like"];
exports.TextFilterFTSKeys = ["@@", "@>", "<@", "$contains", "$containedBy"];
exports.TextFilter_FullTextSearchFilterKeys = ["to_tsquery", "plainto_tsquery", "phraseto_tsquery", "websearch_to_tsquery"];
exports.ArrayFilterOperands = [...exports.TextFilterFTSKeys, "&&", "$overlaps"];
exports.GeomFilterKeys = ["~", "~=", "@", "|&>", "|>>", ">>", "=", "<<|", "<<", "&>", "&<|", "&<", "&&&", "&&"];
const _GeomFilter_Funcs = ["ST_MakeEnvelope", "ST_MakePolygon"];
exports.GeomFilter_Funcs = _GeomFilter_Funcs.concat(_GeomFilter_Funcs.map(v => v.toLowerCase()));
exports.EXISTS_KEYS = ["$exists", "$notExists", "$existsJoined", "$notExistsJoined"];
const f = {
    "h.$eq": ["2"]
};
const forcedFilter = {
    $and: [
        { "h.$eq": [] },
        { h: { "$containedBy": [] } }
    ]
};
//# sourceMappingURL=filters.js.map