/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
export class Viewport {
    constructor(top, left, width, height) {
        this._viewportBrand = undefined;
        this.top = top | 0;
        this.left = left | 0;
        this.width = width | 0;
        this.height = height | 0;
    }
}
export class OutputPosition {
    constructor(outputLineIndex, outputOffset) {
        this.outputLineIndex = outputLineIndex;
        this.outputOffset = outputOffset;
    }
    toString() {
        return `${this.outputLineIndex}:${this.outputOffset}`;
    }
    toPosition(baseLineNumber, wrappedTextIndentLength) {
        const delta = (this.outputLineIndex > 0 ? wrappedTextIndentLength : 0);
        return new Position(baseLineNumber + this.outputLineIndex, delta + this.outputOffset + 1);
    }
}
export class LineBreakData {
    constructor(breakOffsets, breakOffsetsVisibleColumn, wrappedTextIndentLength, injectionOffsets, injectionOptions) {
        this.breakOffsets = breakOffsets;
        this.breakOffsetsVisibleColumn = breakOffsetsVisibleColumn;
        this.wrappedTextIndentLength = wrappedTextIndentLength;
        this.injectionOffsets = injectionOffsets;
        this.injectionOptions = injectionOptions;
    }
    getInputOffsetOfOutputPosition(outputLineIndex, outputOffset) {
        let inputOffset = 0;
        if (outputLineIndex === 0) {
            inputOffset = outputOffset;
        }
        else {
            inputOffset = this.breakOffsets[outputLineIndex - 1] + outputOffset;
        }
        if (this.injectionOffsets !== null) {
            for (let i = 0; i < this.injectionOffsets.length; i++) {
                if (inputOffset > this.injectionOffsets[i]) {
                    if (inputOffset < this.injectionOffsets[i] + this.injectionOptions[i].content.length) {
                        // `inputOffset` is within injected text
                        inputOffset = this.injectionOffsets[i];
                    }
                    else {
                        inputOffset -= this.injectionOptions[i].content.length;
                    }
                }
                else {
                    break;
                }
            }
        }
        return inputOffset;
    }
    getOutputPositionOfInputOffset(inputOffset, affinity = 2 /* None */) {
        let delta = 0;
        if (this.injectionOffsets !== null) {
            for (let i = 0; i < this.injectionOffsets.length; i++) {
                if (inputOffset < this.injectionOffsets[i]) {
                    break;
                }
                if (affinity !== 1 /* Right */ && inputOffset === this.injectionOffsets[i]) {
                    break;
                }
                delta += this.injectionOptions[i].content.length;
            }
        }
        inputOffset += delta;
        return this.getOutputPositionOfOffsetInUnwrappedLine(inputOffset, affinity);
    }
    getOutputPositionOfOffsetInUnwrappedLine(inputOffset, affinity = 2 /* None */) {
        let low = 0;
        let high = this.breakOffsets.length - 1;
        let mid = 0;
        let midStart = 0;
        while (low <= high) {
            mid = low + ((high - low) / 2) | 0;
            const midStop = this.breakOffsets[mid];
            midStart = mid > 0 ? this.breakOffsets[mid - 1] : 0;
            if (affinity === 0 /* Left */) {
                if (inputOffset <= midStart) {
                    high = mid - 1;
                }
                else if (inputOffset > midStop) {
                    low = mid + 1;
                }
                else {
                    break;
                }
            }
            else {
                if (inputOffset < midStart) {
                    high = mid - 1;
                }
                else if (inputOffset >= midStop) {
                    low = mid + 1;
                }
                else {
                    break;
                }
            }
        }
        return new OutputPosition(mid, inputOffset - midStart);
    }
    outputPositionToOffsetInUnwrappedLine(outputLineIndex, outputOffset) {
        let result = (outputLineIndex > 0 ? this.breakOffsets[outputLineIndex - 1] : 0) + outputOffset;
        if (outputLineIndex > 0) {
            result -= this.wrappedTextIndentLength;
        }
        return result;
    }
    normalizeOffsetAroundInjections(offsetInUnwrappedLine, affinity) {
        const injectedText = this.getInjectedTextAtOffset(offsetInUnwrappedLine);
        if (!injectedText) {
            return offsetInUnwrappedLine;
        }
        if (affinity === 2 /* None */) {
            if (offsetInUnwrappedLine === injectedText.offsetInUnwrappedLine + injectedText.length) {
                // go to the end of this injected text
                return injectedText.offsetInUnwrappedLine + injectedText.length;
            }
            else {
                // go to the start of this injected text
                return injectedText.offsetInUnwrappedLine;
            }
        }
        if (affinity === 1 /* Right */) {
            let result = injectedText.offsetInUnwrappedLine + injectedText.length;
            let index = injectedText.injectedTextIndex;
            // traverse all injected text that touch eachother
            while (index + 1 < this.injectionOffsets.length && this.injectionOffsets[index + 1] === this.injectionOffsets[index]) {
                result += this.injectionOptions[index + 1].content.length;
                index++;
            }
            return result;
        }
        // affinity is left
        let result = injectedText.offsetInUnwrappedLine;
        let index = injectedText.injectedTextIndex;
        // traverse all injected text that touch eachother
        while (index - 1 >= 0 && this.injectionOffsets[index - 1] === this.injectionOffsets[index]) {
            result -= this.injectionOptions[index - 1].content.length;
            index++;
        }
        return result;
    }
    getInjectedText(outputLineIndex, outputOffset) {
        const offset = this.outputPositionToOffsetInUnwrappedLine(outputLineIndex, outputOffset);
        const injectedText = this.getInjectedTextAtOffset(offset);
        if (!injectedText) {
            return null;
        }
        return {
            options: this.injectionOptions[injectedText.injectedTextIndex]
        };
    }
    getInjectedTextAtOffset(offsetInUnwrappedLine) {
        const injectionOffsets = this.injectionOffsets;
        const injectionOptions = this.injectionOptions;
        if (injectionOffsets !== null) {
            let totalInjectedTextLengthBefore = 0;
            for (let i = 0; i < injectionOffsets.length; i++) {
                const length = injectionOptions[i].content.length;
                const injectedTextStartOffsetInUnwrappedLine = injectionOffsets[i] + totalInjectedTextLengthBefore;
                const injectedTextEndOffsetInUnwrappedLine = injectionOffsets[i] + totalInjectedTextLengthBefore + length;
                if (injectedTextStartOffsetInUnwrappedLine > offsetInUnwrappedLine) {
                    // Injected text starts later.
                    break; // All later injected texts have an even larger offset.
                }
                if (offsetInUnwrappedLine <= injectedTextEndOffsetInUnwrappedLine) {
                    // Injected text ends after or with the given position (but also starts with or before it).
                    return {
                        injectedTextIndex: i,
                        offsetInUnwrappedLine: injectedTextStartOffsetInUnwrappedLine,
                        length
                    };
                }
                totalInjectedTextLengthBefore += length;
            }
        }
        return undefined;
    }
}
export class InjectedText {
    constructor(options) {
        this.options = options;
    }
}
export class MinimapLinesRenderingData {
    constructor(tabSize, data) {
        this.tabSize = tabSize;
        this.data = data;
    }
}
export class ViewLineData {
    constructor(content, continuesWithWrappedLine, minColumn, maxColumn, startVisibleColumn, tokens, inlineDecorations) {
        this._viewLineDataBrand = undefined;
        this.content = content;
        this.continuesWithWrappedLine = continuesWithWrappedLine;
        this.minColumn = minColumn;
        this.maxColumn = maxColumn;
        this.startVisibleColumn = startVisibleColumn;
        this.tokens = tokens;
        this.inlineDecorations = inlineDecorations;
    }
}
export class ViewLineRenderingData {
    constructor(minColumn, maxColumn, content, continuesWithWrappedLine, mightContainRTL, mightContainNonBasicASCII, tokens, inlineDecorations, tabSize, startVisibleColumn) {
        this.minColumn = minColumn;
        this.maxColumn = maxColumn;
        this.content = content;
        this.continuesWithWrappedLine = continuesWithWrappedLine;
        this.isBasicASCII = ViewLineRenderingData.isBasicASCII(content, mightContainNonBasicASCII);
        this.containsRTL = ViewLineRenderingData.containsRTL(content, this.isBasicASCII, mightContainRTL);
        this.tokens = tokens;
        this.inlineDecorations = inlineDecorations;
        this.tabSize = tabSize;
        this.startVisibleColumn = startVisibleColumn;
    }
    static isBasicASCII(lineContent, mightContainNonBasicASCII) {
        if (mightContainNonBasicASCII) {
            return strings.isBasicASCII(lineContent);
        }
        return true;
    }
    static containsRTL(lineContent, isBasicASCII, mightContainRTL) {
        if (!isBasicASCII && mightContainRTL) {
            return strings.containsRTL(lineContent);
        }
        return false;
    }
}
export class InlineDecoration {
    constructor(range, inlineClassName, type) {
        this.range = range;
        this.inlineClassName = inlineClassName;
        this.type = type;
    }
}
export class SingleLineInlineDecoration {
    constructor(startOffset, endOffset, inlineClassName, inlineClassNameAffectsLetterSpacing) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.inlineClassName = inlineClassName;
        this.inlineClassNameAffectsLetterSpacing = inlineClassNameAffectsLetterSpacing;
    }
    toInlineDecoration(lineNumber) {
        return new InlineDecoration(new Range(lineNumber, this.startOffset + 1, lineNumber, this.endOffset + 1), this.inlineClassName, this.inlineClassNameAffectsLetterSpacing ? 3 /* RegularAffectingLetterSpacing */ : 0 /* Regular */);
    }
}
export class ViewModelDecoration {
    constructor(range, options) {
        this._viewModelDecorationBrand = undefined;
        this.range = range;
        this.options = options;
    }
}
