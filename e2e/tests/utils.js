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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLLMResponses = exports.enableAskLLM = exports.createAccessRuleForTestDB = exports.createAccessRule = exports.disablePwdlessAdminAndCreateUser = exports.setWspColLayout = exports.getTableWindow = exports.getSearchListItem = exports.queries = exports.localNoAuthSetup = exports.TEST_DB_NAME = exports.USERS = exports.isEmpty = exports.uploadFile = exports.fileName = exports.selectAndInsertFile = exports.dropConnectionAndDatabase = exports.createDatabase = exports.openTable = exports.runDbSql = exports.runDbsSql = exports.setTableRule = exports.closeWorkspaceWindows = exports.forEachLocator = exports.typeConfirmationCode = exports.login = exports.fillLoginFormAndSubmit = exports.goTo = exports.insertRow = exports.clickInsertRow = exports.fillSmartFormAndInsert = exports.runSql = exports.monacoType = exports.getMonacoValue = exports.getMonacoEditorBySelector = void 0;
var test_1 = require("@playwright/test");
var path = require("path");
var getMonacoEditorBySelector = function (page, parentSelector) { return __awaiter(void 0, void 0, void 0, function () {
    var monacoEditor;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page
                    .locator("".concat(parentSelector, " .monaco-editor"))
                    .nth(0)];
            case 1:
                monacoEditor = _a.sent();
                return [2 /*return*/, monacoEditor];
        }
    });
}); };
exports.getMonacoEditorBySelector = getMonacoEditorBySelector;
var getMonacoValue = function (page, parentSelector) { return __awaiter(void 0, void 0, void 0, function () {
    var text, normalizedText;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page.keyboard.press("Control+A")];
            case 1:
                _a.sent();
                return [4 /*yield*/, page.innerText("".concat(parentSelector, " .monaco-editor .lines-content"))];
            case 2:
                text = _a.sent();
                normalizedText = text.replace(/\u00A0/g, " ");
                return [2 /*return*/, normalizedText];
        }
    });
}); };
exports.getMonacoValue = getMonacoValue;
/**
 * Will overwrite all previous content
 */
var monacoType = function (page, parentSelector, text, _a) {
    var _b = _a === void 0 ? { deleteAll: true } : _a, deleteAll = _b.deleteAll, pressBeforeTyping = _b.pressBeforeTyping, pressAfterTyping = _b.pressAfterTyping, _c = _b.keyPressDelay, keyPressDelay = _c === void 0 ? 100 : _c;
    return __awaiter(void 0, void 0, void 0, function () {
        var monacoEditor, _i, _d, key, _e, _f, key;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, (0, exports.getMonacoEditorBySelector)(page, parentSelector)];
                case 1:
                    monacoEditor = _g.sent();
                    return [4 /*yield*/, monacoEditor.click()];
                case 2:
                    _g.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 3:
                    _g.sent();
                    if (!deleteAll) return [3 /*break*/, 7];
                    return [4 /*yield*/, page.keyboard.press("Control+A")];
                case 4:
                    _g.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _g.sent();
                    return [4 /*yield*/, page.keyboard.press("Delete")];
                case 6:
                    _g.sent();
                    _g.label = 7;
                case 7: return [4 /*yield*/, page.waitForTimeout(500)];
                case 8:
                    _g.sent();
                    return [4 /*yield*/, monacoEditor.click()];
                case 9:
                    _g.sent();
                    return [4 /*yield*/, monacoEditor.blur()];
                case 10:
                    _g.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 11:
                    _g.sent();
                    return [4 /*yield*/, monacoEditor.click()];
                case 12:
                    _g.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 13:
                    _g.sent();
                    _i = 0, _d = pressBeforeTyping !== null && pressBeforeTyping !== void 0 ? pressBeforeTyping : [];
                    _g.label = 14;
                case 14:
                    if (!(_i < _d.length)) return [3 /*break*/, 18];
                    key = _d[_i];
                    return [4 /*yield*/, page.keyboard.press(key)];
                case 15:
                    _g.sent();
                    return [4 /*yield*/, page.waitForTimeout(50)];
                case 16:
                    _g.sent();
                    _g.label = 17;
                case 17:
                    _i++;
                    return [3 /*break*/, 14];
                case 18: return [4 /*yield*/, page.keyboard.type(text, { delay: keyPressDelay })];
                case 19:
                    _g.sent();
                    _e = 0, _f = pressAfterTyping !== null && pressAfterTyping !== void 0 ? pressAfterTyping : [];
                    _g.label = 20;
                case 20:
                    if (!(_e < _f.length)) return [3 /*break*/, 24];
                    key = _f[_e];
                    return [4 /*yield*/, page.keyboard.press(key)];
                case 21:
                    _g.sent();
                    return [4 /*yield*/, page.waitForTimeout(50)];
                case 22:
                    _g.sent();
                    _g.label = 23;
                case 23:
                    _e++;
                    return [3 /*break*/, 20];
                case 24: return [4 /*yield*/, page.waitForTimeout(500)];
                case 25:
                    _g.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.monacoType = monacoType;
var runSql = function (page, query) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.monacoType)(page, ".ProstglesSQL", query)];
            case 1:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(300)];
            case 2:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("dashboard.window.runQuery").click()];
            case 3:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(200)];
            case 4:
                _a.sent();
                return [4 /*yield*/, page
                        .getByTestId("dashboard.window.runQuery")
                        .isEnabled({ timeout: 5e3 })];
            case 5:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(1e3)];
            case 6:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.runSql = runSql;
var fillSmartFormAndInsert = function (page, tableName, values) { return __awaiter(void 0, void 0, void 0, function () {
    var _i, _a, _b, key, value, unescapedSelector, escapedSelector, elem, selectElem;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _i = 0, _a = Object.entries(values);
                _c.label = 1;
            case 1:
                if (!(_i < _a.length)) return [3 /*break*/, 10];
                _b = _a[_i], key = _b[0], value = _b[1];
                unescapedSelector = "".concat(tableName, "-").concat(key);
                return [4 /*yield*/, page.evaluate(function (unescapedSelector) { return CSS.escape(unescapedSelector); }, unescapedSelector)];
            case 2:
                escapedSelector = _c.sent();
                return [4 /*yield*/, page.locator("input#" + escapedSelector)];
            case 3:
                elem = _c.sent();
                return [4 /*yield*/, elem.fill(value)];
            case 4:
                _c.sent();
                return [4 /*yield*/, page.locator("[data-key=".concat(JSON.stringify(key), "] .FormField_Select"))];
            case 5:
                selectElem = _c.sent();
                return [4 /*yield*/, selectElem.isVisible()];
            case 6:
                if (!_c.sent()) return [3 /*break*/, 9];
                return [4 /*yield*/, selectElem.click()];
            case 7:
                _c.sent();
                return [4 /*yield*/, page
                        .getByTestId("SearchList.List")
                        .locator("[data-key=".concat(JSON.stringify(value), "]"))
                        .click()];
            case 8:
                _c.sent();
                _c.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 1];
            case 10: return [4 /*yield*/, page.waitForTimeout(200)];
            case 11:
                _c.sent();
                return [4 /*yield*/, page.getByRole("button", { name: "Insert", exact: true }).click()];
            case 12:
                _c.sent();
                return [4 /*yield*/, page.waitForTimeout(200)];
            case 13:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.fillSmartFormAndInsert = fillSmartFormAndInsert;
var clickInsertRow = function (page, tableName, useTopBtn) {
    if (useTopBtn === void 0) { useTopBtn = false; }
    return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, page
                        .getByTestId(useTopBtn ?
                        "dashboard.window.rowInsertTop"
                        : "dashboard.window.rowInsert")
                        .and(page.locator("[data-key=".concat(JSON.stringify(tableName), "]")))
                        .click()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(200)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.clickInsertRow = clickInsertRow;
var insertRow = function (page, tableName, row, useTopBtn) {
    if (useTopBtn === void 0) { useTopBtn = false; }
    return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, exports.clickInsertRow)(page, tableName, useTopBtn)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, exports.fillSmartFormAndInsert)(page, tableName, row)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(2200)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.insertRow = insertRow;
var goTo = function (page, url) {
    if (url === void 0) { url = "localhost:3004"; }
    return __awaiter(void 0, void 0, void 0, function () {
        var resp, _a, _b, _c, errorCompSelector, pageText;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, page.goto(url, { waitUntil: "networkidle" })];
                case 1:
                    resp = _d.sent();
                    if (!(resp && resp.status() >= 400)) return [3 /*break*/, 3];
                    _b = (_a = console).error;
                    _c = ["page.goto failed:"];
                    return [4 /*yield*/, resp.text()];
                case 2:
                    _b.apply(_a, _c.concat([_d.sent()]));
                    _d.label = 3;
                case 3:
                    if (!resp) {
                        console.warn("page.goto ".concat(url, ": no response"));
                    }
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 4:
                    _d.sent();
                    errorCompSelector = "div.ErrorComponent";
                    return [4 /*yield*/, page.isVisible(errorCompSelector)];
                case 5:
                    if (!_d.sent()) return [3 /*break*/, 7];
                    return [4 /*yield*/, page.innerText(errorCompSelector)];
                case 6:
                    pageText = _d.sent();
                    if (pageText.includes("connectionError")) {
                        if (exports.localNoAuthSetup && pageText.includes("passwordless admin")) {
                            throw "For local testing you must disable passwordless admin and \ncreate a prostgles admin account for user: ".concat(USERS.test_user, " with password: ").concat(USERS.test_user);
                        }
                        throw pageText;
                    }
                    _d.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    });
};
exports.goTo = goTo;
var fillLoginFormAndSubmit = function (page, userNameAndPassword) {
    if (userNameAndPassword === void 0) { userNameAndPassword = "test_user"; }
    return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, page.locator("#username").waitFor({ state: "visible", timeout: 30e3 })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, page.locator("#username").fill("")];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, page.locator("#username").fill(userNameAndPassword)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, page.locator("#password").fill(userNameAndPassword)];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, page.getByRole("button", { name: "Sign in", exact: true }).click()];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.fillLoginFormAndSubmit = fillLoginFormAndSubmit;
var login = function (page, userNameAndPassword, url) {
    if (userNameAndPassword === void 0) { userNameAndPassword = "test_user"; }
    if (url === void 0) { url = "localhost:3004"; }
    return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, exports.goTo)(page, url)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, exports.fillLoginFormAndSubmit)(page, userNameAndPassword)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, page.locator("#username").waitFor({ state: "detached", timeout: 30e3 })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.login = login;
var typeConfirmationCode = function (page) { return __awaiter(void 0, void 0, void 0, function () {
    var code;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page.waitForTimeout(200)];
            case 1:
                _a.sent();
                return [4 /*yield*/, page.getByTitle("confirmation-code").textContent()];
            case 2:
                code = _a.sent();
                return [4 /*yield*/, page.waitForTimeout(200)];
            case 3:
                _a.sent();
                return [4 /*yield*/, page
                        .locator("input[name=\"confirmation\"]")
                        .fill(code !== null && code !== void 0 ? code : "code not found on the page")];
            case 4:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(200)];
            case 5:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.typeConfirmationCode = typeConfirmationCode;
var forEachLocator = function (page, match, onMatch) { return __awaiter(void 0, void 0, void 0, function () {
    var items, firstItem;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                items = [];
                _a.label = 1;
            case 1: return [4 /*yield*/, match()];
            case 2: return [4 /*yield*/, (_a.sent()).all()];
            case 3:
                items = _a.sent();
                firstItem = items[0];
                if (!firstItem) return [3 /*break*/, 6];
                return [4 /*yield*/, onMatch(firstItem)];
            case 4:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(220)];
            case 5:
                _a.sent();
                _a.label = 6;
            case 6:
                if (items.length) return [3 /*break*/, 1];
                _a.label = 7;
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.forEachLocator = forEachLocator;
var closeWorkspaceWindows = function (page) { return __awaiter(void 0, void 0, void 0, function () {
    var closeBtnsCount;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.forEachLocator)(page, function () { return page.getByTestId("dashboard.window.close"); }, function (closeBtn) { return __awaiter(void 0, void 0, void 0, function () {
                    var deleteSqlBtn;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, closeBtn.click()];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, page.getByRole("button", {
                                        name: "Delete",
                                        exact: true,
                                    })];
                            case 2:
                                deleteSqlBtn = _a.sent();
                                return [4 /*yield*/, deleteSqlBtn.count()];
                            case 3:
                                if (!_a.sent()) return [3 /*break*/, 5];
                                return [4 /*yield*/, deleteSqlBtn.click()];
                            case 4:
                                _a.sent();
                                _a.label = 5;
                            case 5: return [4 /*yield*/, page.waitForTimeout(220)];
                            case 6:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1:
                _a.sent();
                return [4 /*yield*/, page
                        .getByTestId("dashboard.window.close")
                        .count()];
            case 2:
                closeBtnsCount = _a.sent();
                if (closeBtnsCount) {
                    throw "".concat(closeBtnsCount, " windows are still opened");
                }
                return [4 /*yield*/, page.waitForTimeout(100)];
            case 3:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.closeWorkspaceWindows = closeWorkspaceWindows;
var getDataKey = function (key) { return "[data-key=".concat(JSON.stringify(key), "]"); };
var getTestId = function (testid) {
    return "[data-command=".concat(JSON.stringify(testid), "]");
};
var setTableRule = function (page, tableName, rule, isFileTable) { return __awaiter(void 0, void 0, void 0, function () {
    var tableRow, setForcedFilter, setExcludedFields, setForcedData, toggleFileRule;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page.locator(getDataKey(tableName))];
            case 1:
                tableRow = _a.sent();
                setForcedFilter = function (forcedFilter) { return __awaiter(void 0, void 0, void 0, function () {
                    var _i, forcedFilter_1, _a, fieldName, value;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (!forcedFilter)
                                    return [2 /*return*/];
                                return [4 /*yield*/, page.getByTestId("ForcedFilterControl.type").click()];
                            case 1:
                                _b.sent();
                                return [4 /*yield*/, page.getByTestId("ForcedFilterControl.type.enabled").click()];
                            case 2:
                                _b.sent();
                                _i = 0, forcedFilter_1 = forcedFilter;
                                _b.label = 3;
                            case 3:
                                if (!(_i < forcedFilter_1.length)) return [3 /*break*/, 11];
                                _a = forcedFilter_1[_i], fieldName = _a.fieldName, value = _a.value;
                                return [4 /*yield*/, page.getByTestId("SmartAddFilter").click()];
                            case 4:
                                _b.sent();
                                return [4 /*yield*/, page.locator(getDataKey(fieldName)).click()];
                            case 5:
                                _b.sent();
                                return [4 /*yield*/, page
                                        .getByTestId("FilterWrapper")
                                        .locator("input#search-all")
                                        .type(value)];
                            case 6:
                                _b.sent();
                                return [4 /*yield*/, page.waitForTimeout(500)];
                            case 7:
                                _b.sent();
                                return [4 /*yield*/, page.keyboard.press("Enter")];
                            case 8:
                                _b.sent();
                                return [4 /*yield*/, page.waitForTimeout(200)];
                            case 9:
                                _b.sent();
                                _b.label = 10;
                            case 10:
                                _i++;
                                return [3 /*break*/, 3];
                            case 11: return [2 /*return*/];
                        }
                    });
                }); };
                setExcludedFields = function (excludedFields) { return __awaiter(void 0, void 0, void 0, function () {
                    var _i, excludedFields_1, field;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!(excludedFields === null || excludedFields === void 0 ? void 0 : excludedFields.length))
                                    return [2 /*return*/];
                                return [4 /*yield*/, page.getByTestId("FieldFilterControl.type").click()];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, page.getByTestId("FieldFilterControl.type.except").click()];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, page.getByTestId("FieldFilterControl.select").click()];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, page.getByTestId("SearchList.toggleAll").click()];
                            case 4:
                                _a.sent();
                                _i = 0, excludedFields_1 = excludedFields;
                                _a.label = 5;
                            case 5:
                                if (!(_i < excludedFields_1.length)) return [3 /*break*/, 9];
                                field = excludedFields_1[_i];
                                return [4 /*yield*/, page.locator("[data-key=".concat(JSON.stringify(field), "]")).click()];
                            case 6:
                                _a.sent();
                                return [4 /*yield*/, page.waitForTimeout(500)];
                            case 7:
                                _a.sent();
                                _a.label = 8;
                            case 8:
                                _i++;
                                return [3 /*break*/, 5];
                            case 9: return [4 /*yield*/, page.keyboard.press("Escape")];
                            case 10:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); };
                setForcedData = function (forcedData) { return __awaiter(void 0, void 0, void 0, function () {
                    var _i, _a, _b, fieldName, value;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                if (!forcedData)
                                    return [2 /*return*/];
                                // await page.getByTestId("ForcedDataControl.toggle").click();
                                // for(const [fieldName, value] of Object.entries(forcedData)){
                                //   await page.getByTestId("ForcedDataControl.addColumn").click();
                                //   await page.locator(`[data-key=${JSON.stringify(fieldName)}]`).click();
                                //   await page.locator(`input#${tableName}-${fieldName}`).type(value);
                                //   await page.waitForTimeout(500);
                                // }
                                return [4 /*yield*/, page.getByTestId("CheckFilterControl.type").click()];
                            case 1:
                                // await page.getByTestId("ForcedDataControl.toggle").click();
                                // for(const [fieldName, value] of Object.entries(forcedData)){
                                //   await page.getByTestId("ForcedDataControl.addColumn").click();
                                //   await page.locator(`[data-key=${JSON.stringify(fieldName)}]`).click();
                                //   await page.locator(`input#${tableName}-${fieldName}`).type(value);
                                //   await page.waitForTimeout(500);
                                // }
                                _c.sent();
                                return [4 /*yield*/, page.getByTestId("CheckFilterControl.type.enabled").click()];
                            case 2:
                                _c.sent();
                                _i = 0, _a = Object.entries(forcedData);
                                _c.label = 3;
                            case 3:
                                if (!(_i < _a.length)) return [3 /*break*/, 11];
                                _b = _a[_i], fieldName = _b[0], value = _b[1];
                                return [4 /*yield*/, page.getByTestId("SmartAddFilter").click()];
                            case 4:
                                _c.sent();
                                return [4 /*yield*/, page.locator(getDataKey(fieldName)).click()];
                            case 5:
                                _c.sent();
                                return [4 /*yield*/, page
                                        .locator("".concat(getTestId("FilterWrapper")).concat(getDataKey(fieldName), " input"))
                                        .type(value)];
                            case 6:
                                _c.sent();
                                return [4 /*yield*/, page.waitForTimeout(500)];
                            case 7:
                                _c.sent();
                                return [4 /*yield*/, page.keyboard.press("Enter")];
                            case 8:
                                _c.sent();
                                return [4 /*yield*/, page.waitForTimeout(200)];
                            case 9:
                                _c.sent();
                                _c.label = 10;
                            case 10:
                                _i++;
                                return [3 /*break*/, 3];
                            case 11: return [2 /*return*/];
                        }
                    });
                }); };
                toggleFileRule = function () { return __awaiter(void 0, void 0, void 0, function () {
                    var ruleToggle;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, page.getByTestId("RuleToggle")];
                            case 1:
                                ruleToggle = _a.sent();
                                if (!isFileTable) return [3 /*break*/, 4];
                                return [4 /*yield*/, ruleToggle.click()];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, page.getByTestId("TablePermissionControls.close").click()];
                            case 3:
                                _a.sent();
                                _a.label = 4;
                            case 4: return [2 /*return*/];
                        }
                    });
                }); };
                if (!rule.select) return [3 /*break*/, 10];
                return [4 /*yield*/, tableRow.getByTestId("selectRule").click()];
            case 2:
                _a.sent();
                return [4 /*yield*/, toggleFileRule()];
            case 3:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 4:
                _a.sent();
                if (!!(0, exports.isEmpty)(rule.select)) return [3 /*break*/, 10];
                return [4 /*yield*/, tableRow.getByTestId("selectRuleAdvanced").click()];
            case 5:
                _a.sent();
                return [4 /*yield*/, setExcludedFields(rule.select.excludedFields)];
            case 6:
                _a.sent();
                return [4 /*yield*/, setForcedFilter(rule.select.forcedFilter)];
            case 7:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("TablePermissionControls.close").click()];
            case 8:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 9:
                _a.sent();
                _a.label = 10;
            case 10:
                if (!rule.insert) return [3 /*break*/, 19];
                return [4 /*yield*/, tableRow.getByTestId("insertRule").click()];
            case 11:
                _a.sent();
                return [4 /*yield*/, toggleFileRule()];
            case 12:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 13:
                _a.sent();
                if (!!(0, exports.isEmpty)(rule.select)) return [3 /*break*/, 19];
                return [4 /*yield*/, tableRow.getByTestId("insertRuleAdvanced").click()];
            case 14:
                _a.sent();
                return [4 /*yield*/, setExcludedFields(rule.insert.excludedFields)];
            case 15:
                _a.sent();
                return [4 /*yield*/, setForcedData(rule.insert.forcedData)];
            case 16:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("TablePermissionControls.close").click()];
            case 17:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 18:
                _a.sent();
                _a.label = 19;
            case 19:
                if (!rule.update) return [3 /*break*/, 29];
                return [4 /*yield*/, tableRow.getByTestId("updateRule").click()];
            case 20:
                _a.sent();
                return [4 /*yield*/, toggleFileRule()];
            case 21:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 22:
                _a.sent();
                if (!!(0, exports.isEmpty)(rule.select)) return [3 /*break*/, 29];
                return [4 /*yield*/, tableRow.getByTestId("updateRuleAdvanced").click()];
            case 23:
                _a.sent();
                return [4 /*yield*/, setExcludedFields(rule.update.excludedFields)];
            case 24:
                _a.sent();
                return [4 /*yield*/, setForcedFilter(rule.update.forcedFilter)];
            case 25:
                _a.sent();
                return [4 /*yield*/, setForcedData(rule.update.forcedData)];
            case 26:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("TablePermissionControls.close").click()];
            case 27:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 28:
                _a.sent();
                _a.label = 29;
            case 29:
                if (!rule.delete) return [3 /*break*/, 37];
                return [4 /*yield*/, tableRow.getByTestId("deleteRule").click()];
            case 30:
                _a.sent();
                return [4 /*yield*/, toggleFileRule()];
            case 31:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 32:
                _a.sent();
                if (!!(0, exports.isEmpty)(rule.select)) return [3 /*break*/, 37];
                return [4 /*yield*/, tableRow.getByTestId("deleteRuleAdvanced").click()];
            case 33:
                _a.sent();
                return [4 /*yield*/, setForcedFilter(rule.delete.forcedFilter)];
            case 34:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("TablePermissionControls.close").click()];
            case 35:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 36:
                _a.sent();
                _a.label = 37;
            case 37: return [4 /*yield*/, page.waitForTimeout(500)];
            case 38:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.setTableRule = setTableRule;
var runDbsSql = function (page, query, args, opts) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, exports.runDbSql)(page, query, args, opts, "dbs")];
    });
}); };
exports.runDbsSql = runDbsSql;
var runDbSql = function (page, query, args, opts, dbType) {
    if (dbType === void 0) { dbType = "db"; }
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, error, sqlResult;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, page.evaluate(function (_a) {
                        var query = _a[0], args = _a[1], opts = _a[2], dbType = _a[3];
                        return __awaiter(void 0, void 0, void 0, function () {
                            var db, data, error_1;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        db = window[dbType];
                                        if (!db)
                                            throw dbType + " is missing";
                                        return [4 /*yield*/, db.sql(query, args, opts)];
                                    case 1:
                                        data = _b.sent();
                                        return [2 /*return*/, [undefined, data]];
                                    case 2:
                                        error_1 = _b.sent();
                                        return [2 /*return*/, [error_1]];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    }, [query, args, opts, dbType])];
                case 1:
                    _a = (_b.sent()), error = _a[0], sqlResult = _a[1];
                    if (error) {
                        console.error("Error running sql:", error);
                        throw error;
                    }
                    return [2 /*return*/, sqlResult];
            }
        });
    });
};
exports.runDbSql = runDbSql;
var openTable = function (page, namePartStart) { return __awaiter(void 0, void 0, void 0, function () {
    var searchAlLInput, table, v_triggers;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page.getByTestId("dashboard.menu").waitFor({ state: "visible" })];
            case 1:
                _a.sent();
                return [4 /*yield*/, page.keyboard.press("Control+KeyP")];
            case 2:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(200)];
            case 3:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("SearchAll")];
            case 4:
                searchAlLInput = _a.sent();
                return [4 /*yield*/, searchAlLInput.waitFor({ state: "visible" })];
            case 5:
                _a.sent();
                return [4 /*yield*/, searchAlLInput.fill(namePartStart)];
            case 6:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(200)];
            case 7:
                _a.sent();
                return [4 /*yield*/, page.keyboard.press("Enter")];
            case 8:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 9:
                _a.sent();
                return [4 /*yield*/, page.locator("[data-table-name^=".concat(JSON.stringify(namePartStart), "]"))];
            case 10:
                table = _a.sent();
                if (!!table.isVisible()) return [3 /*break*/, 13];
                return [4 /*yield*/, (0, exports.runDbsSql)(page, "SELECT * FROM prostgles.v_triggers;", {}, { returnType: "rows" })];
            case 11:
                v_triggers = _a.sent();
                console.log(JSON.stringify({ v_triggers: v_triggers, namePartStart: namePartStart }));
                return [4 /*yield*/, page.waitForTimeout(500)];
            case 12:
                _a.sent();
                _a.label = 13;
            case 13:
                (0, test_1.expect)(table).toBeVisible();
                return [4 /*yield*/, page.waitForTimeout(1000)];
            case 14:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.openTable = openTable;
var MINUTE = 60e3;
var createDatabase = function (dbName, page, fromTemplates, owner) {
    if (fromTemplates === void 0) { fromTemplates = false; }
    return __awaiter(void 0, void 0, void 0, function () {
        var databaseCreationTime, workspaceCreationAndLoatTime;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, exports.goTo)(page, "localhost:3004/connections")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, page
                            .locator("[data-command=\"ConnectionServer.add\"][data-key^=\"usr@localhost\"]")
                            .first()
                            .click()];
                case 2:
                    _a.sent();
                    if (!fromTemplates) return [3 /*break*/, 6];
                    return [4 /*yield*/, page.getByTestId("ConnectionServer.add.newDatabase").click()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, page.getByTestId("ConnectionServer.SampleSchemas").click()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, page
                            .getByTestId("ConnectionServer.SampleSchemas")
                            .locator("[data-key=".concat(JSON.stringify(dbName), "]"))
                            .click()];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 6: return [4 /*yield*/, page.getByTestId("ConnectionServer.add.newDatabase").click()];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, page
                            .getByTestId("ConnectionServer.NewDbName")
                            .locator("input")
                            .fill(dbName)];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9:
                    if (!owner) return [3 /*break*/, 15];
                    return [4 /*yield*/, page.getByTestId("ConnectionServer.withNewOwnerToggle").click()];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, page
                            .getByTestId("ConnectionServer.NewUserName")
                            .locator("input")
                            .fill(owner.name)];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, page
                            .getByTestId("ConnectionServer.NewUserPassword")
                            .locator("input")
                            .fill(owner.pass)];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 14:
                    _a.sent();
                    _a.label = 15;
                case 15: return [4 /*yield*/, page.getByTestId("ConnectionServer.add.confirm").click()];
                case 16:
                    _a.sent();
                    databaseCreationTime = (fromTemplates ? 4 : 1) * MINUTE;
                    workspaceCreationAndLoatTime = 3 * MINUTE;
                    return [4 /*yield*/, page
                            .getByTestId("ConnectionServer.add.confirm")
                            .waitFor({ state: "detached", timeout: databaseCreationTime })];
                case 17:
                    _a.sent();
                    return [4 /*yield*/, page
                            .getByTestId("dashboard.menu")
                            .waitFor({ state: "visible", timeout: workspaceCreationAndLoatTime })];
                case 18:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.createDatabase = createDatabase;
var dropConnectionAndDatabase = function (dbName, page) { return __awaiter(void 0, void 0, void 0, function () {
    var connectionSelector;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page.waitForTimeout(2000)];
            case 1:
                _a.sent();
                connectionSelector = "[data-key=".concat(JSON.stringify(dbName), "]");
                return [4 /*yield*/, page.locator(connectionSelector).getByTestId("Connection.edit").click()];
            case 2:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("Connection.edit.delete").click()];
            case 3:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("Connection.edit.delete.dropDatabase").click()];
            case 4:
                _a.sent();
                return [4 /*yield*/, (0, exports.typeConfirmationCode)(page)];
            case 5:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("Connection.edit.delete.confirm").click()];
            case 6:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(5000)];
            case 7:
                _a.sent();
                return [2 /*return*/, { connectionSelector: connectionSelector }];
        }
    });
}); };
exports.dropConnectionAndDatabase = dropConnectionAndDatabase;
var selectAndInsertFile = function (page, onOpenFileDialog) { return __awaiter(void 0, void 0, void 0, function () {
    var fileChooserPromise, fileChooser, resolvedPath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                fileChooserPromise = page.waitForEvent("filechooser");
                return [4 /*yield*/, onOpenFileDialog(page)];
            case 1:
                _a.sent();
                return [4 /*yield*/, fileChooserPromise];
            case 2:
                fileChooser = _a.sent();
                resolvedPath = path.resolve(path.join(__dirname, "../" + exports.fileName));
                return [4 /*yield*/, fileChooser.setFiles(resolvedPath)];
            case 3:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(2e3)];
            case 4:
                _a.sent();
                return [4 /*yield*/, page.getByRole("button", { name: "Insert", exact: true }).click()];
            case 5:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(1200)];
            case 6:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.selectAndInsertFile = selectAndInsertFile;
exports.fileName = "icon512.png";
var uploadFile = function (page) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.clickInsertRow)(page, "files")];
            case 1:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(200)];
            case 2:
                _a.sent();
                return [4 /*yield*/, (0, exports.selectAndInsertFile)(page, function (page) {
                        return page.getByTestId("FileBtn").click();
                    })];
            case 3:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.uploadFile = uploadFile;
var isEmpty = function (obj) {
    return !obj || Object.keys(obj).length === 0;
};
exports.isEmpty = isEmpty;
var USERS;
(function (USERS) {
    USERS["test_user"] = "test_user";
    USERS["default_user"] = "default_user";
    USERS["default_user1"] = "default_user1";
    USERS["public_user"] = "public_user";
    USERS["new_user"] = "new_user";
    USERS["new_user1"] = "new_user1";
    USERS["free_llm_user1"] = "free_llm_user1";
})(USERS || (exports.USERS = USERS = {}));
exports.TEST_DB_NAME = "Prostgles UI automated tests database";
exports.localNoAuthSetup = !!process.env.PRGL_DEV_ENV;
exports.queries = {
    orders: "CREATE TABLE orders ( id SERIAL PRIMARY KEY, user_id UUID NOT NULL, status TEXT );",
};
var getSearchListItem = function (page, _a) {
    var dataKey = _a.dataKey;
    return page
        .getByTestId("SearchList.List")
        .locator("[data-key=".concat(JSON.stringify(dataKey), "]"));
};
exports.getSearchListItem = getSearchListItem;
var getTableWindow = function (page, tableName) {
    return page.locator("[data-table-name=".concat(JSON.stringify(tableName), "]"));
};
exports.getTableWindow = getTableWindow;
var setWspColLayout = function (page) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page.getByTestId("dashboard.menu").waitFor({ state: "visible" })];
            case 1:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("dashboard.menu.settingsToggle").click()];
            case 2:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("dashboard.menu.settings.defaultLayoutType").click()];
            case 3:
                _a.sent();
                return [4 /*yield*/, page
                        .getByTestId("dashboard.menu.settings.defaultLayoutType")
                        .locator("[data-key=\"col\"]")
                        .click()];
            case 4:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("Popup.close").click()];
            case 5:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.setWspColLayout = setWspColLayout;
var disablePwdlessAdminAndCreateUser = function (page) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.goTo)(page)];
            case 1:
                _a.sent();
                return [4 /*yield*/, page
                        .getByRole("link", { name: "Users" })
                        .waitFor({ state: "visible", timeout: 60e3 })];
            case 2:
                _a.sent();
                return [4 /*yield*/, page.getByRole("link", { name: "Users" }).click()];
            case 3:
                _a.sent();
                return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL(/.*users/)];
            case 4:
                _a.sent();
                return [4 /*yield*/, page.goto("localhost:3004/users", {
                        waitUntil: "networkidle",
                        timeout: 10e3,
                    })];
            case 5:
                _a.sent();
                return [4 /*yield*/, page.getByRole("button", { name: "Create admin user" }).click()];
            case 6:
                _a.sent();
                return [4 /*yield*/, page.locator("#username").fill(USERS.test_user)];
            case 7:
                _a.sent();
                return [4 /*yield*/, page.locator("#new-password").fill(USERS.test_user)];
            case 8:
                _a.sent();
                return [4 /*yield*/, page.locator("#confirm_password").fill(USERS.test_user)];
            case 9:
                _a.sent();
                return [4 /*yield*/, page.getByRole("button", { name: "Create", exact: true }).click()];
            case 10:
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(5e3)];
            case 11:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.disablePwdlessAdminAndCreateUser = disablePwdlessAdminAndCreateUser;
var createAccessRule = function (page, userType) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: 
            /** Set permissions */
            return [4 /*yield*/, page.getByTestId("config.ac").click()];
            case 1:
                /** Set permissions */
                _a.sent();
                return [4 /*yield*/, page.waitForTimeout(1e3)];
            case 2:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("config.ac.create").click()];
            case 3:
                _a.sent();
                /** Setting user type to default */
                return [4 /*yield*/, page.getByTestId("config.ac.edit.user").click()];
            case 4:
                /** Setting user type to default */
                _a.sent();
                return [4 /*yield*/, page.getByRole("listitem").getByText(userType).click()];
            case 5:
                _a.sent();
                return [4 /*yield*/, page.getByRole("button", { name: "Done", exact: true }).click()];
            case 6:
                _a.sent();
                /** Setting AC Type to custom */
                return [4 /*yield*/, page
                        .getByTestId("config.ac.edit.type")
                        .locator("button[value=\"Custom\"]")
                        .click()];
            case 7:
                /** Setting AC Type to custom */
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.createAccessRule = createAccessRule;
var createAccessRuleForTestDB = function (page, userType) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.login)(page)];
            case 1:
                _a.sent();
                return [4 /*yield*/, page.getByRole("link", { name: "Connections" }).click()];
            case 2:
                _a.sent();
                return [4 /*yield*/, page.getByRole("link", { name: exports.TEST_DB_NAME }).click()];
            case 3:
                _a.sent();
                return [4 /*yield*/, page
                        .getByTestId("dashboard.goToConnConfig")
                        .waitFor({ state: "visible", timeout: 10e3 })];
            case 4:
                _a.sent();
                return [4 /*yield*/, page.getByTestId("dashboard.goToConnConfig").click()];
            case 5:
                _a.sent();
                return [4 /*yield*/, (0, exports.createAccessRule)(page, userType)];
            case 6:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.createAccessRuleForTestDB = createAccessRuleForTestDB;
var enableAskLLM = function (page, maxRequestsPerDay, credsProvided) {
    if (credsProvided === void 0) { credsProvided = false; }
    return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, page.getByTestId("AskLLMAccessControl").click()];
                case 1:
                    _a.sent();
                    if (!!credsProvided) return [3 /*break*/, 9];
                    return [4 /*yield*/, page.getByTestId("SetupLLMCredentials.api").click()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, page.getByTestId("AddLLMCredentialForm").click()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, page.getByTestId("AddLLMCredentialForm.Provider").click()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, page
                            .getByTestId("AddLLMCredentialForm.Provider")
                            .locator("[data-key=\"Custom\"]")
                            .click()];
                case 5:
                    _a.sent();
                    // await fillSmartFormAndInsert(page, "llm_credentials", { endpoint: "http://localhost:3004/mocked-llm" });
                    return [4 /*yield*/, page.locator("#endpoint").fill("http://localhost:3004/mocked-llm")];
                case 6:
                    // await fillSmartFormAndInsert(page, "llm_credentials", { endpoint: "http://localhost:3004/mocked-llm" });
                    _a.sent();
                    return [4 /*yield*/, page.getByTestId("AddLLMCredentialForm.Save").click()];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(1e3)];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9: return [4 /*yield*/, page.getByTestId("AskLLMAccessControl.AllowAll").click()];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(1e3)];
                case 11:
                    _a.sent();
                    if (!maxRequestsPerDay) return [3 /*break*/, 13];
                    return [4 /*yield*/, page
                            .getByTestId("AskLLMAccessControl.llm_daily_limit")
                            .locator("input")
                            .fill(maxRequestsPerDay.toString())];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13: return [4 /*yield*/, page.getByTestId("Popup.close").click()];
                case 14:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.enableAskLLM = enableAskLLM;
var getLLMResponses = function (page, questions) { var _a, questions_1, questions_1_1; return __awaiter(void 0, void 0, void 0, function () {
    var result, question, response, e_1_1;
    var _b, e_1, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0: return [4 /*yield*/, page.getByTestId("AskLLM").click()];
            case 1:
                _e.sent();
                return [4 /*yield*/, page.getByTestId("AskLLM.popup").waitFor({ state: "visible" })];
            case 2:
                _e.sent();
                return [4 /*yield*/, page.waitForTimeout(2e3)];
            case 3:
                _e.sent();
                result = [];
                _e.label = 4;
            case 4:
                _e.trys.push([4, 13, 14, 19]);
                _a = true, questions_1 = __asyncValues(questions);
                _e.label = 5;
            case 5: return [4 /*yield*/, questions_1.next()];
            case 6:
                if (!(questions_1_1 = _e.sent(), _b = questions_1_1.done, !_b)) return [3 /*break*/, 12];
                _d = questions_1_1.value;
                _a = false;
                question = _d;
                return [4 /*yield*/, page.getByTestId("AskLLM.popup").locator("textarea").fill(question)];
            case 7:
                _e.sent();
                return [4 /*yield*/, page.getByTestId("AskLLM.popup").getByTestId("Chat.send").click()];
            case 8:
                _e.sent();
                return [4 /*yield*/, page.waitForTimeout(2e3)];
            case 9:
                _e.sent();
                return [4 /*yield*/, page
                        .getByTestId("AskLLM.popup")
                        .locator(".message.incoming")
                        .last()
                        .textContent()];
            case 10:
                response = _e.sent();
                result.push({
                    response: response,
                    isOk: !!(response === null || response === void 0 ? void 0 : response.includes("Mocked response")),
                });
                _e.label = 11;
            case 11:
                _a = true;
                return [3 /*break*/, 5];
            case 12: return [3 /*break*/, 19];
            case 13:
                e_1_1 = _e.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 19];
            case 14:
                _e.trys.push([14, , 17, 18]);
                if (!(!_a && !_b && (_c = questions_1.return))) return [3 /*break*/, 16];
                return [4 /*yield*/, _c.call(questions_1)];
            case 15:
                _e.sent();
                _e.label = 16;
            case 16: return [3 /*break*/, 18];
            case 17:
                if (e_1) throw e_1.error;
                return [7 /*endfinally*/];
            case 18: return [7 /*endfinally*/];
            case 19: return [4 /*yield*/, page.getByTestId("Popup.close").click()];
            case 20:
                _e.sent();
                return [2 /*return*/, result];
        }
    });
}); };
exports.getLLMResponses = getLLMResponses;
