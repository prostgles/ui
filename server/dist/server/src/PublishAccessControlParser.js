"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getACFilter = void 0;
const filterUtils_1 = require("../../commonTypes/filterUtils");
const prostgles_types_1 = require("prostgles-types");
const getACFilter = (rule) => {
    if ((0, prostgles_types_1.isObject)(rule) && rule.forcedFilterDetailed) {
        const forcedFilterD = rule.forcedFilterDetailed;
        const isAnd = "$and" in forcedFilterD;
        const filters = isAnd ? forcedFilterD.$and : forcedFilterD.$or;
        return { [isAnd ? "$and" : "$or"]: filters.map(filterUtils_1.getFinalFilter) };
    }
};
exports.getACFilter = getACFilter;
//# sourceMappingURL=PublishAccessControlParser.js.map