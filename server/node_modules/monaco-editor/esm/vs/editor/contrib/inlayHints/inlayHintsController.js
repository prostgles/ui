/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { RunOnceScheduler } from '../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../base/common/errors.js';
import { hash } from '../../../base/common/hash.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { LRUCache } from '../../../base/common/map.js';
import { assertType } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { registerEditorContribution } from '../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { Position } from '../../common/core/position.js';
import { Range } from '../../common/core/range.js';
import { InlayHintKind, InlayHintsProviderRegistry } from '../../common/modes.js';
import { LanguageFeatureRequestDelays } from '../../common/modes/languageFeatureRegistry.js';
import { ITextModelService } from '../../common/services/resolverService.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { editorInlayHintBackground, editorInlayHintForeground, editorInlayHintParameterBackground, editorInlayHintParameterForeground, editorInlayHintTypeBackground, editorInlayHintTypeForeground } from '../../../platform/theme/common/colorRegistry.js';
import { themeColorFromId } from '../../../platform/theme/common/themeService.js';
const MAX_DECORATORS = 1500;
export function getInlayHints(model, ranges, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const all = [];
        const providers = InlayHintsProviderRegistry.ordered(model).reverse();
        const promises = providers.map(provider => ranges.map((range) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield provider.provideInlayHints(model, range, token);
                if (result === null || result === void 0 ? void 0 : result.length) {
                    all.push(result.filter(hint => range.containsPosition(hint.position)));
                }
            }
            catch (err) {
                onUnexpectedExternalError(err);
            }
        })));
        yield Promise.all(promises.flat());
        return all.flat().sort((a, b) => Position.compare(a.position, b.position));
    });
}
class InlayHintsCache {
    constructor() {
        this._entries = new LRUCache(50);
    }
    get(model) {
        const key = InlayHintsCache._key(model);
        return this._entries.get(key);
    }
    set(model, value) {
        const key = InlayHintsCache._key(model);
        this._entries.set(key, value);
    }
    static _key(model) {
        return `${model.uri.toString()}/${model.getVersionId()}`;
    }
}
let InlayHintsController = class InlayHintsController {
    constructor(_editor, _codeEditorService) {
        this._editor = _editor;
        this._codeEditorService = _codeEditorService;
        this._decorationOwnerId = ++InlayHintsController._decorationOwnerIdPool;
        this._disposables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._getInlayHintsDelays = new LanguageFeatureRequestDelays(InlayHintsProviderRegistry, 25, 500);
        this._cache = new InlayHintsCache();
        this._decorations = new Map();
        this._disposables.add(InlayHintsProviderRegistry.onDidChange(() => this._update()));
        this._disposables.add(_editor.onDidChangeModel(() => this._update()));
        this._disposables.add(_editor.onDidChangeModelLanguage(() => this._update()));
        this._disposables.add(_editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(125 /* inlayHints */)) {
                this._update();
            }
        }));
        this._update();
    }
    dispose() {
        this._sessionDisposables.dispose();
        this._removeAllDecorations();
        this._disposables.dispose();
    }
    _update() {
        this._sessionDisposables.clear();
        this._removeAllDecorations();
        if (!this._editor.getOption(125 /* inlayHints */).enabled) {
            return;
        }
        const model = this._editor.getModel();
        if (!model || !InlayHintsProviderRegistry.has(model)) {
            return;
        }
        // iff possible, quickly update from cache
        const cached = this._cache.get(model);
        if (cached) {
            this._updateHintsDecorators([model.getFullModelRange()], cached);
        }
        const scheduler = new RunOnceScheduler(() => __awaiter(this, void 0, void 0, function* () {
            const t1 = Date.now();
            const cts = new CancellationTokenSource();
            this._sessionDisposables.add(toDisposable(() => cts.dispose(true)));
            const ranges = this._getHintsRanges();
            const result = yield getInlayHints(model, ranges, cts.token);
            scheduler.delay = this._getInlayHintsDelays.update(model, Date.now() - t1);
            if (cts.token.isCancellationRequested) {
                return;
            }
            this._updateHintsDecorators(ranges, result);
            this._cache.set(model, Array.from(this._decorations.values()).map(obj => obj.hint));
        }), this._getInlayHintsDelays.get(model));
        this._sessionDisposables.add(scheduler);
        // update inline hints when content or scroll position changes
        this._sessionDisposables.add(this._editor.onDidChangeModelContent(() => scheduler.schedule()));
        this._disposables.add(this._editor.onDidScrollChange(() => scheduler.schedule()));
        scheduler.schedule();
        // update inline hints when any any provider fires an event
        const providerListener = new DisposableStore();
        this._sessionDisposables.add(providerListener);
        for (const provider of InlayHintsProviderRegistry.all(model)) {
            if (typeof provider.onDidChangeInlayHints === 'function') {
                providerListener.add(provider.onDidChangeInlayHints(() => scheduler.schedule()));
            }
        }
    }
    _getHintsRanges() {
        const extra = 30;
        const model = this._editor.getModel();
        const visibleRanges = this._editor.getVisibleRangesPlusViewportAboveBelow();
        const result = [];
        for (const range of visibleRanges.sort(Range.compareRangesUsingStarts)) {
            const extendedRange = model.validateRange(new Range(range.startLineNumber - extra, range.startColumn, range.endLineNumber + extra, range.endColumn));
            if (result.length === 0 || !Range.areIntersectingOrTouching(result[result.length - 1], extendedRange)) {
                result.push(extendedRange);
            }
            else {
                result[result.length - 1] = Range.plusRange(result[result.length - 1], extendedRange);
            }
        }
        return result;
    }
    _updateHintsDecorators(ranges, hints) {
        const { fontSize, fontFamily } = this._getLayoutInfo();
        const model = this._editor.getModel();
        const newDecorationsTypeIds = [];
        const newDecorationsData = [];
        const fontFamilyVar = '--code-editorInlayHintsFontFamily';
        this._editor.getContainerDomNode().style.setProperty(fontFamilyVar, fontFamily);
        for (const hint of hints) {
            const { text, position, whitespaceBefore, whitespaceAfter } = hint;
            const marginBefore = whitespaceBefore ? (fontSize / 3) | 0 : 0;
            const marginAfter = whitespaceAfter ? (fontSize / 3) | 0 : 0;
            const contentOptions = {
                contentText: fixSpace(text),
                fontSize: `${fontSize}px`,
                margin: `0px ${marginAfter}px 0px ${marginBefore}px`,
                fontFamily: `var(${fontFamilyVar})`,
                padding: `1px ${Math.max(1, fontSize / 4) | 0}px`,
                borderRadius: `${(fontSize / 4) | 0}px`,
                verticalAlign: 'middle',
                backgroundColor: themeColorFromId(editorInlayHintBackground),
                color: themeColorFromId(editorInlayHintForeground)
            };
            if (hint.kind === InlayHintKind.Parameter) {
                contentOptions.backgroundColor = themeColorFromId(editorInlayHintParameterBackground);
                contentOptions.color = themeColorFromId(editorInlayHintParameterForeground);
            }
            else if (hint.kind === InlayHintKind.Type) {
                contentOptions.backgroundColor = themeColorFromId(editorInlayHintTypeBackground);
                contentOptions.color = themeColorFromId(editorInlayHintTypeForeground);
            }
            let renderOptions = { beforeInjectedText: Object.assign(Object.assign({}, contentOptions), { affectsLetterSpacing: true }) };
            let range = Range.fromPositions(position);
            let word = model.getWordAtPosition(position);
            let usesWordRange = false;
            if (word) {
                if (word.endColumn === position.column) {
                    // change decoration to after
                    renderOptions.afterInjectedText = renderOptions.beforeInjectedText;
                    renderOptions.beforeInjectedText = undefined;
                    usesWordRange = true;
                    range = wordToRange(word, position.lineNumber);
                }
                else if (word.startColumn === position.column) {
                    usesWordRange = true;
                    range = wordToRange(word, position.lineNumber);
                }
            }
            const key = 'inlayHints-' + hash(renderOptions).toString(16);
            this._codeEditorService.registerDecorationType('inlay-hints-controller', key, renderOptions, undefined, this._editor);
            // decoration types are ref-counted which means we only need to
            // call register und remove equally often
            newDecorationsTypeIds.push(key);
            const newLen = newDecorationsData.push({
                range,
                options: Object.assign(Object.assign({}, this._codeEditorService.resolveDecorationOptions(key, true)), { showIfCollapsed: !usesWordRange, stickiness: 0 /* AlwaysGrowsWhenTypingAtEdges */ })
            });
            if (newLen > MAX_DECORATORS) {
                break;
            }
        }
        // collect all decoration ids that are affected by the ranges
        // and only update those decorations
        const decorationIdsToUpdate = [];
        for (const range of ranges) {
            for (const { id } of model.getDecorationsInRange(range, this._decorationOwnerId, true)) {
                const obj = this._decorations.get(id);
                if (obj) {
                    decorationIdsToUpdate.push(id);
                    this._codeEditorService.removeDecorationType(obj.decorationTypeId);
                    this._decorations.delete(id);
                }
            }
        }
        const newDecorationIds = model.deltaDecorations(decorationIdsToUpdate, newDecorationsData, this._decorationOwnerId);
        for (let i = 0; i < newDecorationIds.length; i++) {
            this._decorations.set(newDecorationIds[i], { hint: hints[i], decorationTypeId: newDecorationsTypeIds[i] });
        }
    }
    _getLayoutInfo() {
        const options = this._editor.getOption(125 /* inlayHints */);
        const editorFontSize = this._editor.getOption(45 /* fontSize */);
        let fontSize = options.fontSize;
        if (!fontSize || fontSize < 5 || fontSize > editorFontSize) {
            fontSize = (editorFontSize * .9) | 0;
        }
        const fontFamily = options.fontFamily || this._editor.getOption(42 /* fontFamily */);
        return { fontSize, fontFamily };
    }
    _removeAllDecorations() {
        this._editor.deltaDecorations(Array.from(this._decorations.keys()), []);
        for (let obj of this._decorations.values()) {
            this._codeEditorService.removeDecorationType(obj.decorationTypeId);
        }
        this._decorations.clear();
    }
};
InlayHintsController.ID = 'editor.contrib.InlayHints';
InlayHintsController._decorationOwnerIdPool = 0;
InlayHintsController = __decorate([
    __param(1, ICodeEditorService)
], InlayHintsController);
export { InlayHintsController };
function wordToRange(word, lineNumber) {
    return new Range(lineNumber, word.startColumn, lineNumber, word.endColumn);
}
function fixSpace(str) {
    const noBreakWhitespace = '\xa0';
    return str.replace(/[ \t]/g, noBreakWhitespace);
}
registerEditorContribution(InlayHintsController.ID, InlayHintsController);
CommandsRegistry.registerCommand('_executeInlayHintProvider', (accessor, ...args) => __awaiter(void 0, void 0, void 0, function* () {
    const [uri, range] = args;
    assertType(URI.isUri(uri));
    assertType(Range.isIRange(range));
    const ref = yield accessor.get(ITextModelService).createModelReference(uri);
    try {
        const data = yield getInlayHints(ref.object.textEditorModel, [Range.lift(range)], CancellationToken.None);
        return data;
    }
    finally {
        ref.dispose();
    }
}));
