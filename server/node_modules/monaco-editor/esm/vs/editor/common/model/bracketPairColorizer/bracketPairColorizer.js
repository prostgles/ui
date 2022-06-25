/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../core/range.js';
import { BracketPair } from '../../model.js';
import { DenseKeyProvider } from './smallImmutableSet.js';
import { LanguageConfigurationRegistry } from '../../modes/languageConfigurationRegistry.js';
import { editorBracketHighlightingForeground1, editorBracketHighlightingForeground2, editorBracketHighlightingForeground3, editorBracketHighlightingForeground4, editorBracketHighlightingForeground5, editorBracketHighlightingForeground6, editorBracketHighlightingUnexpectedBracketForeground } from '../../view/editorColorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { TextEditInfo } from './beforeEditPositionMapper.js';
import { LanguageAgnosticBracketTokens } from './brackets.js';
import { lengthAdd, lengthGreaterThanEqual, lengthLessThanEqual, lengthOfString, lengthsToRange, lengthZero, positionToLength, toLength } from './length.js';
import { parseDocument } from './parser.js';
import { FastTokenizer, TextBufferTokenizer } from './tokenizer.js';
export class BracketPairColorizer extends Disposable {
    constructor(textModel) {
        super();
        this.textModel = textModel;
        this.didChangeDecorationsEmitter = new Emitter();
        this.cache = this._register(new MutableDisposable());
        this.bracketsRequested = false;
        this.options = textModel.getOptions().bracketPairColorizationOptions;
        this._register(LanguageConfigurationRegistry.onDidChange((e) => {
            var _a;
            if ((_a = this.cache.value) === null || _a === void 0 ? void 0 : _a.object.didLanguageChange(e.languageIdentifier.id)) {
                this.cache.clear();
                this.updateCache();
            }
        }));
        this._register(textModel.onDidChangeOptions(e => {
            this.options = textModel.getOptions().bracketPairColorizationOptions;
            this.cache.clear();
            this.updateCache();
        }));
        this._register(textModel.onDidChangeLanguage(e => {
            this.cache.clear();
            this.updateCache();
        }));
        this._register(textModel.onDidChangeAttached(() => {
            this.updateCache();
        }));
    }
    get isDocumentSupported() {
        const maxSupportedDocumentLength = /* max lines */ 50000 * /* average column count */ 100;
        return this.textModel.getValueLength() <= maxSupportedDocumentLength;
    }
    updateCache() {
        if (this.bracketsRequested || (this.textModel.isAttachedToEditor() && this.isDocumentSupported && this.options.enabled)) {
            if (!this.cache.value) {
                const store = new DisposableStore();
                this.cache.value = createDisposableRef(store.add(new BracketPairColorizerImpl(this.textModel)), store);
                store.add(this.cache.value.object.onDidChangeDecorations(e => this.didChangeDecorationsEmitter.fire(e)));
                this.didChangeDecorationsEmitter.fire();
            }
        }
        else {
            this.cache.clear();
            this.didChangeDecorationsEmitter.fire();
        }
    }
    handleContentChanged(change) {
        var _a;
        (_a = this.cache.value) === null || _a === void 0 ? void 0 : _a.object.handleContentChanged(change);
    }
    getDecorationsInRange(range, ownerId, filterOutValidation) {
        var _a;
        if (ownerId === undefined) {
            return [];
        }
        if (!this.options.enabled) {
            return [];
        }
        return ((_a = this.cache.value) === null || _a === void 0 ? void 0 : _a.object.getDecorationsInRange(range, ownerId, filterOutValidation)) || [];
    }
    getAllDecorations(ownerId, filterOutValidation) {
        var _a;
        if (ownerId === undefined) {
            return [];
        }
        if (!this.options.enabled) {
            return [];
        }
        return ((_a = this.cache.value) === null || _a === void 0 ? void 0 : _a.object.getAllDecorations(ownerId, filterOutValidation)) || [];
    }
    onDidChangeDecorations(listener) {
        return this.didChangeDecorationsEmitter.event(listener);
    }
    /**
     * Returns all bracket pairs that intersect the given range.
     * The result is sorted by the start position.
    */
    getBracketPairsInRange(range) {
        var _a;
        this.bracketsRequested = true;
        this.updateCache();
        return ((_a = this.cache.value) === null || _a === void 0 ? void 0 : _a.object.getBracketPairsInRange(range)) || [];
    }
}
function createDisposableRef(object, disposable) {
    return {
        object,
        dispose: () => disposable === null || disposable === void 0 ? void 0 : disposable.dispose(),
    };
}
class BracketPairColorizerImpl extends Disposable {
    constructor(textModel) {
        super();
        this.textModel = textModel;
        this.didChangeDecorationsEmitter = new Emitter();
        this.colorProvider = new ColorProvider();
        this.denseKeyProvider = new DenseKeyProvider();
        this.brackets = new LanguageAgnosticBracketTokens(this.denseKeyProvider);
        this.onDidChangeDecorations = this.didChangeDecorationsEmitter.event;
        this._register(textModel.onBackgroundTokenizationStateChanged(() => {
            if (textModel.backgroundTokenizationState === 2 /* Completed */) {
                const wasUndefined = this.initialAstWithoutTokens === undefined;
                // Clear the initial tree as we can use the tree with token information now.
                this.initialAstWithoutTokens = undefined;
                if (!wasUndefined) {
                    this.didChangeDecorationsEmitter.fire();
                }
            }
        }));
        this._register(textModel.onDidChangeTokens(({ ranges }) => {
            const edits = ranges.map(r => new TextEditInfo(toLength(r.fromLineNumber - 1, 0), toLength(r.toLineNumber, 0), toLength(r.toLineNumber - r.fromLineNumber + 1, 0)));
            this.astWithTokens = this.parseDocumentFromTextBuffer(edits, this.astWithTokens, false);
            if (!this.initialAstWithoutTokens) {
                this.didChangeDecorationsEmitter.fire();
            }
        }));
        if (textModel.backgroundTokenizationState === 0 /* Uninitialized */) {
            // There are no token information yet
            const brackets = this.brackets.getSingleLanguageBracketTokens(this.textModel.getLanguageIdentifier().id);
            const tokenizer = new FastTokenizer(this.textModel.getValue(), brackets);
            this.initialAstWithoutTokens = parseDocument(tokenizer, [], undefined, true);
            this.astWithTokens = this.initialAstWithoutTokens;
        }
        else if (textModel.backgroundTokenizationState === 2 /* Completed */) {
            // Skip the initial ast, as there is no flickering.
            // Directly create the tree with token information.
            this.initialAstWithoutTokens = undefined;
            this.astWithTokens = this.parseDocumentFromTextBuffer([], undefined, false);
        }
        else if (textModel.backgroundTokenizationState === 1 /* InProgress */) {
            this.initialAstWithoutTokens = this.parseDocumentFromTextBuffer([], undefined, true);
            this.astWithTokens = this.initialAstWithoutTokens;
        }
    }
    didLanguageChange(languageId) {
        return this.brackets.didLanguageChange(languageId);
    }
    handleContentChanged(change) {
        const edits = change.changes.map(c => {
            const range = Range.lift(c.range);
            return new TextEditInfo(positionToLength(range.getStartPosition()), positionToLength(range.getEndPosition()), lengthOfString(c.text));
        }).reverse();
        this.astWithTokens = this.parseDocumentFromTextBuffer(edits, this.astWithTokens, false);
        if (this.initialAstWithoutTokens) {
            this.initialAstWithoutTokens = this.parseDocumentFromTextBuffer(edits, this.initialAstWithoutTokens, false);
        }
    }
    /**
     * @pure (only if isPure = true)
    */
    parseDocumentFromTextBuffer(edits, previousAst, immutable) {
        // Is much faster if `isPure = false`.
        const isPure = false;
        const previousAstClone = isPure ? previousAst === null || previousAst === void 0 ? void 0 : previousAst.deepClone() : previousAst;
        const tokenizer = new TextBufferTokenizer(this.textModel, this.brackets);
        const result = parseDocument(tokenizer, edits, previousAstClone, immutable);
        return result;
    }
    getBracketsInRange(range) {
        const startOffset = toLength(range.startLineNumber - 1, range.startColumn - 1);
        const endOffset = toLength(range.endLineNumber - 1, range.endColumn - 1);
        const result = new Array();
        const node = this.initialAstWithoutTokens || this.astWithTokens;
        collectBrackets(node, lengthZero, node.length, startOffset, endOffset, result);
        return result;
    }
    getDecorationsInRange(range, ownerId, filterOutValidation) {
        const result = new Array();
        const bracketsInRange = this.getBracketsInRange(range);
        for (const bracket of bracketsInRange) {
            result.push({
                id: `bracket${bracket.hash()}`,
                options: { description: 'BracketPairColorization', inlineClassName: this.colorProvider.getInlineClassName(bracket) },
                ownerId: 0,
                range: bracket.range
            });
        }
        return result;
    }
    getAllDecorations(ownerId, filterOutValidation) {
        return this.getDecorationsInRange(new Range(1, 1, this.textModel.getLineCount(), 1), ownerId, filterOutValidation);
    }
    getBracketPairsInRange(range) {
        const result = new Array();
        const startLength = positionToLength(range.getStartPosition());
        const endLength = positionToLength(range.getEndPosition());
        const node = this.initialAstWithoutTokens || this.astWithTokens;
        collectBracketPairs(node, lengthZero, node.length, startLength, endLength, result);
        return result;
    }
}
function collectBrackets(node, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, result, level = 0) {
    if (node.kind === 1 /* Bracket */) {
        const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
        result.push(new BracketInfo(range, level - 1, false));
    }
    else if (node.kind === 3 /* UnexpectedClosingBracket */) {
        const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
        result.push(new BracketInfo(range, level - 1, true));
    }
    else if (node.kind === 4 /* List */) {
        for (const child of node.children) {
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            if (lengthLessThanEqual(nodeOffsetStart, endOffset) && lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                collectBrackets(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, result, level);
            }
            nodeOffsetStart = nodeOffsetEnd;
        }
    }
    else if (node.kind === 2 /* Pair */) {
        // Don't use node.children here to improve performance
        level++;
        {
            const child = node.openingBracket;
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            if (lengthLessThanEqual(nodeOffsetStart, endOffset) && lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                collectBrackets(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, result, level);
            }
            nodeOffsetStart = nodeOffsetEnd;
        }
        if (node.child) {
            const child = node.child;
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            if (lengthLessThanEqual(nodeOffsetStart, endOffset) && lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                collectBrackets(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, result, level);
            }
            nodeOffsetStart = nodeOffsetEnd;
        }
        if (node.closingBracket) {
            const child = node.closingBracket;
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            if (lengthLessThanEqual(nodeOffsetStart, endOffset) && lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                collectBrackets(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, result, level);
            }
            nodeOffsetStart = nodeOffsetEnd;
        }
    }
}
function collectBracketPairs(node, nodeOffset, nodeOffsetEnd, startOffset, endOffset, result, level = 0) {
    var _a;
    if (node.kind === 2 /* Pair */) {
        const openingBracketEnd = lengthAdd(nodeOffset, node.openingBracket.length);
        result.push(new BracketPair(lengthsToRange(nodeOffset, nodeOffsetEnd), lengthsToRange(nodeOffset, openingBracketEnd), node.closingBracket
            ? lengthsToRange(lengthAdd(openingBracketEnd, ((_a = node.child) === null || _a === void 0 ? void 0 : _a.length) || lengthZero), nodeOffsetEnd)
            : undefined, level));
        level++;
    }
    let curOffset = nodeOffset;
    for (const child of node.children) {
        const childOffset = curOffset;
        curOffset = lengthAdd(curOffset, child.length);
        if (lengthLessThanEqual(childOffset, endOffset) && lengthLessThanEqual(startOffset, curOffset)) {
            collectBracketPairs(child, childOffset, curOffset, startOffset, endOffset, result, level);
        }
    }
}
export class BracketInfo {
    constructor(range, 
    /** 0-based level */
    level, isInvalid) {
        this.range = range;
        this.level = level;
        this.isInvalid = isInvalid;
    }
    hash() {
        return `${this.range.toString()}-${this.level}`;
    }
}
class ColorProvider {
    constructor() {
        this.unexpectedClosingBracketClassName = 'unexpected-closing-bracket';
    }
    getInlineClassName(bracket) {
        if (bracket.isInvalid) {
            return this.unexpectedClosingBracketClassName;
        }
        return this.getInlineClassNameOfLevel(bracket.level);
    }
    getInlineClassNameOfLevel(level) {
        // To support a dynamic amount of colors up to 6 colors,
        // we use a number that is a lcm of all numbers from 1 to 6.
        return `bracket-highlighting-${level % 30}`;
    }
}
registerThemingParticipant((theme, collector) => {
    const colors = [
        editorBracketHighlightingForeground1,
        editorBracketHighlightingForeground2,
        editorBracketHighlightingForeground3,
        editorBracketHighlightingForeground4,
        editorBracketHighlightingForeground5,
        editorBracketHighlightingForeground6
    ];
    const colorProvider = new ColorProvider();
    collector.addRule(`.monaco-editor .${colorProvider.unexpectedClosingBracketClassName} { color: ${theme.getColor(editorBracketHighlightingUnexpectedBracketForeground)}; }`);
    let colorValues = colors
        .map(c => theme.getColor(c))
        .filter((c) => !!c)
        .filter(c => !c.isTransparent());
    for (let level = 0; level < 30; level++) {
        const color = colorValues[level % colorValues.length];
        collector.addRule(`.monaco-editor .${colorProvider.getInlineClassNameOfLevel(level)} { color: ${color}; }`);
    }
});
