/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
/**
 * Common operations that work and make sense both on the model and on the view model.
 */
export class CursorColumns {
    static visibleColumnFromColumn(lineContent, column, tabSize) {
        const lineContentLength = lineContent.length;
        const endOffset = column - 1 < lineContentLength ? column - 1 : lineContentLength;
        let result = 0;
        let i = 0;
        while (i < endOffset) {
            const codePoint = strings.getNextCodePoint(lineContent, endOffset, i);
            i += (codePoint >= 65536 /* UNICODE_SUPPLEMENTARY_PLANE_BEGIN */ ? 2 : 1);
            if (codePoint === 9 /* Tab */) {
                result = CursorColumns.nextRenderTabStop(result, tabSize);
            }
            else {
                let graphemeBreakType = strings.getGraphemeBreakType(codePoint);
                while (i < endOffset) {
                    const nextCodePoint = strings.getNextCodePoint(lineContent, endOffset, i);
                    const nextGraphemeBreakType = strings.getGraphemeBreakType(nextCodePoint);
                    if (strings.breakBetweenGraphemeBreakType(graphemeBreakType, nextGraphemeBreakType)) {
                        break;
                    }
                    i += (nextCodePoint >= 65536 /* UNICODE_SUPPLEMENTARY_PLANE_BEGIN */ ? 2 : 1);
                    graphemeBreakType = nextGraphemeBreakType;
                }
                if (strings.isFullWidthCharacter(codePoint) || strings.isEmojiImprecise(codePoint)) {
                    result = result + 2;
                }
                else {
                    result = result + 1;
                }
            }
        }
        return result;
    }
    /**
     * Returns an array that maps one based columns to one based visible columns. The entry at position 0 is -1.
    */
    static visibleColumnsByColumns(lineContent, tabSize) {
        const endOffset = lineContent.length;
        let result = new Array();
        result.push(-1);
        let pos = 0;
        let i = 0;
        while (i < endOffset) {
            const codePoint = strings.getNextCodePoint(lineContent, endOffset, i);
            i += (codePoint >= 65536 /* UNICODE_SUPPLEMENTARY_PLANE_BEGIN */ ? 2 : 1);
            result.push(pos);
            if (codePoint >= 65536 /* UNICODE_SUPPLEMENTARY_PLANE_BEGIN */) {
                result.push(pos);
            }
            if (codePoint === 9 /* Tab */) {
                pos = CursorColumns.nextRenderTabStop(pos, tabSize);
            }
            else {
                let graphemeBreakType = strings.getGraphemeBreakType(codePoint);
                while (i < endOffset) {
                    const nextCodePoint = strings.getNextCodePoint(lineContent, endOffset, i);
                    const nextGraphemeBreakType = strings.getGraphemeBreakType(nextCodePoint);
                    if (strings.breakBetweenGraphemeBreakType(graphemeBreakType, nextGraphemeBreakType)) {
                        break;
                    }
                    i += (nextCodePoint >= 65536 /* UNICODE_SUPPLEMENTARY_PLANE_BEGIN */ ? 2 : 1);
                    result.push(pos);
                    if (codePoint >= 65536 /* UNICODE_SUPPLEMENTARY_PLANE_BEGIN */) {
                        result.push(pos);
                    }
                    graphemeBreakType = nextGraphemeBreakType;
                }
                if (strings.isFullWidthCharacter(codePoint) || strings.isEmojiImprecise(codePoint)) {
                    pos = pos + 2;
                }
                else {
                    pos = pos + 1;
                }
            }
        }
        result.push(pos);
        return result;
    }
    static visibleColumnFromColumn2(config, model, position) {
        return this.visibleColumnFromColumn(model.getLineContent(position.lineNumber), position.column, config.tabSize);
    }
    static columnFromVisibleColumn(lineContent, visibleColumn, tabSize) {
        if (visibleColumn <= 0) {
            return 1;
        }
        const lineLength = lineContent.length;
        let beforeVisibleColumn = 0;
        let beforeColumn = 1;
        let i = 0;
        while (i < lineLength) {
            const codePoint = strings.getNextCodePoint(lineContent, lineLength, i);
            i += (codePoint >= 65536 /* UNICODE_SUPPLEMENTARY_PLANE_BEGIN */ ? 2 : 1);
            let afterVisibleColumn;
            if (codePoint === 9 /* Tab */) {
                afterVisibleColumn = CursorColumns.nextRenderTabStop(beforeVisibleColumn, tabSize);
            }
            else {
                let graphemeBreakType = strings.getGraphemeBreakType(codePoint);
                while (i < lineLength) {
                    const nextCodePoint = strings.getNextCodePoint(lineContent, lineLength, i);
                    const nextGraphemeBreakType = strings.getGraphemeBreakType(nextCodePoint);
                    if (strings.breakBetweenGraphemeBreakType(graphemeBreakType, nextGraphemeBreakType)) {
                        break;
                    }
                    i += (nextCodePoint >= 65536 /* UNICODE_SUPPLEMENTARY_PLANE_BEGIN */ ? 2 : 1);
                    graphemeBreakType = nextGraphemeBreakType;
                }
                if (strings.isFullWidthCharacter(codePoint) || strings.isEmojiImprecise(codePoint)) {
                    afterVisibleColumn = beforeVisibleColumn + 2;
                }
                else {
                    afterVisibleColumn = beforeVisibleColumn + 1;
                }
            }
            const afterColumn = i + 1;
            if (afterVisibleColumn >= visibleColumn) {
                const beforeDelta = visibleColumn - beforeVisibleColumn;
                const afterDelta = afterVisibleColumn - visibleColumn;
                if (afterDelta < beforeDelta) {
                    return afterColumn;
                }
                else {
                    return beforeColumn;
                }
            }
            beforeVisibleColumn = afterVisibleColumn;
            beforeColumn = afterColumn;
        }
        // walked the entire string
        return lineLength + 1;
    }
    static columnFromVisibleColumn2(config, model, lineNumber, visibleColumn) {
        let result = this.columnFromVisibleColumn(model.getLineContent(lineNumber), visibleColumn, config.tabSize);
        let minColumn = model.getLineMinColumn(lineNumber);
        if (result < minColumn) {
            return minColumn;
        }
        let maxColumn = model.getLineMaxColumn(lineNumber);
        if (result > maxColumn) {
            return maxColumn;
        }
        return result;
    }
    /**
     * ATTENTION: This works with 0-based columns (as oposed to the regular 1-based columns)
     */
    static nextRenderTabStop(visibleColumn, tabSize) {
        return visibleColumn + tabSize - visibleColumn % tabSize;
    }
    /**
     * ATTENTION: This works with 0-based columns (as oposed to the regular 1-based columns)
     */
    static nextIndentTabStop(visibleColumn, indentSize) {
        return visibleColumn + indentSize - visibleColumn % indentSize;
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     */
    static prevRenderTabStop(column, tabSize) {
        return Math.max(0, column - 1 - (column - 1) % tabSize);
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     */
    static prevIndentTabStop(column, indentSize) {
        return Math.max(0, column - 1 - (column - 1) % indentSize);
    }
}
