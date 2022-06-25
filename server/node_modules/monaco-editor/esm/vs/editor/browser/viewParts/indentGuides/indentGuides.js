/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './indentGuides.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { editorActiveIndentGuides, editorBracketHighlightingForeground1, editorBracketHighlightingForeground2, editorBracketHighlightingForeground3, editorBracketHighlightingForeground4, editorBracketHighlightingForeground5, editorBracketHighlightingForeground6, editorIndentGuides } from '../../../common/view/editorColorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { Position } from '../../../common/core/position.js';
import { IndentGuide } from '../../../common/model.js';
import { ArrayQueue } from '../../../../base/common/arrays.js';
import { BracketPairGuidesClassNames } from '../../../common/model/textModel.js';
export class IndentGuidesOverlay extends DynamicViewOverlay {
    constructor(context) {
        super();
        this._context = context;
        this._primaryPosition = null;
        const options = this._context.configuration.options;
        const wrappingInfo = options.get(130 /* wrappingInfo */);
        const fontInfo = options.get(43 /* fontInfo */);
        this._lineHeight = options.get(58 /* lineHeight */);
        this._spaceWidth = fontInfo.spaceWidth;
        this._maxIndentLeft = wrappingInfo.wrappingColumn === -1 ? -1 : (wrappingInfo.wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth);
        this._bracketPairGuideOptions = options.get(13 /* guides */);
        this._renderResult = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const wrappingInfo = options.get(130 /* wrappingInfo */);
        const fontInfo = options.get(43 /* fontInfo */);
        this._lineHeight = options.get(58 /* lineHeight */);
        this._spaceWidth = fontInfo.spaceWidth;
        this._maxIndentLeft = wrappingInfo.wrappingColumn === -1 ? -1 : (wrappingInfo.wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth);
        this._bracketPairGuideOptions = options.get(13 /* guides */);
        return true;
    }
    onCursorStateChanged(e) {
        var _a;
        const selection = e.selections[0];
        const newPosition = selection.getPosition();
        if (!((_a = this._primaryPosition) === null || _a === void 0 ? void 0 : _a.equals(newPosition))) {
            this._primaryPosition = newPosition;
            return true;
        }
        return false;
    }
    onDecorationsChanged(e) {
        // true for inline decorations
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged; // || e.scrollWidthChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    onLanguageConfigurationChanged(e) {
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        var _a, _b;
        if (!this._bracketPairGuideOptions.indentation && !this._bracketPairGuideOptions.bracketPairs) {
            this._renderResult = null;
            return;
        }
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const scrollWidth = ctx.scrollWidth;
        const lineHeight = this._lineHeight;
        const activeCursorPosition = this._primaryPosition;
        const indents = this.getGuidesByLine(visibleStartLineNumber, visibleEndLineNumber, activeCursorPosition);
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            const indent = indents[lineIndex];
            let result = '';
            const leftOffset = (_b = (_a = ctx.visibleRangeForPosition(new Position(lineNumber, 1))) === null || _a === void 0 ? void 0 : _a.left) !== null && _b !== void 0 ? _b : 0;
            for (const guide of indent) {
                const left = leftOffset + (guide.visibleColumn - 1) * this._spaceWidth;
                if (left > scrollWidth || (this._maxIndentLeft > 0 && left > this._maxIndentLeft)) {
                    break;
                }
                result += `<div class="core-guide ${guide.className}" style="left:${left}px;height:${lineHeight}px;width:${this._spaceWidth}px"></div>`;
            }
            output[lineIndex] = result;
        }
        this._renderResult = output;
    }
    getGuidesByLine(visibleStartLineNumber, visibleEndLineNumber, activeCursorPosition) {
        var _a;
        const bracketGuides = this._bracketPairGuideOptions.bracketPairs
            ? this._context.model.getBracketGuidesInRangeByLine(visibleStartLineNumber, visibleEndLineNumber, activeCursorPosition, true, true)
            : null;
        const indentGuides = this._bracketPairGuideOptions.indentation
            ? this._context.model.getLinesIndentGuides(visibleStartLineNumber, visibleEndLineNumber)
            : null;
        let activeIndentStartLineNumber = 0;
        let activeIndentEndLineNumber = 0;
        let activeIndentLevel = 0;
        if (this._bracketPairGuideOptions.highlightActiveIndentation && activeCursorPosition) {
            const activeIndentInfo = this._context.model.getActiveIndentGuide(activeCursorPosition.lineNumber, visibleStartLineNumber, visibleEndLineNumber);
            activeIndentStartLineNumber = activeIndentInfo.startLineNumber;
            activeIndentEndLineNumber = activeIndentInfo.endLineNumber;
            activeIndentLevel = activeIndentInfo.indent;
        }
        const { indentSize } = this._context.model.getTextModelOptions();
        const result = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineGuides = new Array();
            result.push(lineGuides);
            const bracketGuidesInLine = bracketGuides ? bracketGuides[lineNumber - visibleStartLineNumber] : [];
            const bracketGuidesInLineQueue = new ArrayQueue(bracketGuidesInLine);
            const indentGuidesInLine = indentGuides ? indentGuides[lineNumber - visibleStartLineNumber] : [];
            for (let indentLvl = 1; indentLvl <= indentGuidesInLine; indentLvl++) {
                const indentGuide = (indentLvl - 1) * indentSize + 1;
                const isActive = 
                // Disable active indent guide if there are bracket guides.
                bracketGuidesInLine.length === 0 &&
                    activeIndentStartLineNumber <= lineNumber &&
                    lineNumber <= activeIndentEndLineNumber &&
                    indentLvl === activeIndentLevel;
                lineGuides.push(...bracketGuidesInLineQueue.takeWhile(g => g.visibleColumn < indentGuide) || []);
                if (((_a = bracketGuidesInLineQueue.peek()) === null || _a === void 0 ? void 0 : _a.visibleColumn) !== indentGuide) {
                    lineGuides.push(new IndentGuide(indentGuide, isActive ? 'core-guide-indent-active' : 'core-guide-indent'));
                }
            }
            lineGuides.push(...bracketGuidesInLineQueue.takeWhile(g => true) || []);
        }
        return result;
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderResult) {
            return '';
        }
        const lineIndex = lineNumber - startLineNumber;
        if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
            return '';
        }
        return this._renderResult[lineIndex];
    }
}
registerThemingParticipant((theme, collector) => {
    const editorIndentGuidesColor = theme.getColor(editorIndentGuides);
    if (editorIndentGuidesColor) {
        collector.addRule(`.monaco-editor .lines-content .core-guide-indent { box-shadow: 1px 0 0 0 ${editorIndentGuidesColor} inset; }`);
    }
    const editorActiveIndentGuidesColor = theme.getColor(editorActiveIndentGuides) || editorIndentGuidesColor;
    if (editorActiveIndentGuidesColor) {
        collector.addRule(`.monaco-editor .lines-content .core-guide-indent-active { box-shadow: 1px 0 0 0 ${editorActiveIndentGuidesColor} inset; }`);
    }
    const colors = [
        editorBracketHighlightingForeground1,
        editorBracketHighlightingForeground2,
        editorBracketHighlightingForeground3,
        editorBracketHighlightingForeground4,
        editorBracketHighlightingForeground5,
        editorBracketHighlightingForeground6
    ];
    const colorProvider = new BracketPairGuidesClassNames();
    let colorValues = colors
        .map(c => theme.getColor(c))
        .filter((c) => !!c)
        .filter(c => !c.isTransparent());
    for (let level = 0; level < 30; level++) {
        const color = colorValues[level % colorValues.length];
        collector.addRule(`.monaco-editor .${colorProvider.getInlineClassNameOfLevel(level).replace(/ /g, '.')} { opacity: 0.3; box-shadow: 1px 0 0 0 ${color} inset; }`);
    }
    collector.addRule(`.monaco-editor .${colorProvider.activeClassName} { opacity: 1 !important; }`);
});
