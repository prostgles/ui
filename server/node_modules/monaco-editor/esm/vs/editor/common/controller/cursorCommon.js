/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
import { TextModel } from '../model/textModel.js';
import { LanguageConfigurationRegistry } from '../modes/languageConfigurationRegistry.js';
export { CursorColumns } from './cursorColumns.js';
const autoCloseAlways = () => true;
const autoCloseNever = () => false;
const autoCloseBeforeWhitespace = (chr) => (chr === ' ' || chr === '\t');
export class CursorConfiguration {
    constructor(languageIdentifier, modelOptions, configuration) {
        this._cursorMoveConfigurationBrand = undefined;
        this._languageIdentifier = languageIdentifier;
        const options = configuration.options;
        const layoutInfo = options.get(129 /* layoutInfo */);
        this.readOnly = options.get(80 /* readOnly */);
        this.tabSize = modelOptions.tabSize;
        this.indentSize = modelOptions.indentSize;
        this.insertSpaces = modelOptions.insertSpaces;
        this.stickyTabStops = options.get(103 /* stickyTabStops */);
        this.lineHeight = options.get(58 /* lineHeight */);
        this.pageSize = Math.max(1, Math.floor(layoutInfo.height / this.lineHeight) - 2);
        this.useTabStops = options.get(114 /* useTabStops */);
        this.wordSeparators = options.get(115 /* wordSeparators */);
        this.emptySelectionClipboard = options.get(32 /* emptySelectionClipboard */);
        this.copyWithSyntaxHighlighting = options.get(21 /* copyWithSyntaxHighlighting */);
        this.multiCursorMergeOverlapping = options.get(68 /* multiCursorMergeOverlapping */);
        this.multiCursorPaste = options.get(70 /* multiCursorPaste */);
        this.autoClosingBrackets = options.get(5 /* autoClosingBrackets */);
        this.autoClosingQuotes = options.get(8 /* autoClosingQuotes */);
        this.autoClosingDelete = options.get(6 /* autoClosingDelete */);
        this.autoClosingOvertype = options.get(7 /* autoClosingOvertype */);
        this.autoSurround = options.get(11 /* autoSurround */);
        this.autoIndent = options.get(9 /* autoIndent */);
        this.surroundingPairs = {};
        this._electricChars = null;
        this.shouldAutoCloseBefore = {
            quote: CursorConfiguration._getShouldAutoClose(languageIdentifier, this.autoClosingQuotes),
            bracket: CursorConfiguration._getShouldAutoClose(languageIdentifier, this.autoClosingBrackets)
        };
        this.autoClosingPairs = LanguageConfigurationRegistry.getAutoClosingPairs(languageIdentifier.id);
        let surroundingPairs = CursorConfiguration._getSurroundingPairs(languageIdentifier);
        if (surroundingPairs) {
            for (const pair of surroundingPairs) {
                this.surroundingPairs[pair.open] = pair.close;
            }
        }
    }
    static shouldRecreate(e) {
        return (e.hasChanged(129 /* layoutInfo */)
            || e.hasChanged(115 /* wordSeparators */)
            || e.hasChanged(32 /* emptySelectionClipboard */)
            || e.hasChanged(68 /* multiCursorMergeOverlapping */)
            || e.hasChanged(70 /* multiCursorPaste */)
            || e.hasChanged(5 /* autoClosingBrackets */)
            || e.hasChanged(8 /* autoClosingQuotes */)
            || e.hasChanged(6 /* autoClosingDelete */)
            || e.hasChanged(7 /* autoClosingOvertype */)
            || e.hasChanged(11 /* autoSurround */)
            || e.hasChanged(114 /* useTabStops */)
            || e.hasChanged(58 /* lineHeight */)
            || e.hasChanged(80 /* readOnly */));
    }
    get electricChars() {
        if (!this._electricChars) {
            this._electricChars = {};
            let electricChars = CursorConfiguration._getElectricCharacters(this._languageIdentifier);
            if (electricChars) {
                for (const char of electricChars) {
                    this._electricChars[char] = true;
                }
            }
        }
        return this._electricChars;
    }
    normalizeIndentation(str) {
        return TextModel.normalizeIndentation(str, this.indentSize, this.insertSpaces);
    }
    static _getElectricCharacters(languageIdentifier) {
        try {
            return LanguageConfigurationRegistry.getElectricCharacters(languageIdentifier.id);
        }
        catch (e) {
            onUnexpectedError(e);
            return null;
        }
    }
    static _getShouldAutoClose(languageIdentifier, autoCloseConfig) {
        switch (autoCloseConfig) {
            case 'beforeWhitespace':
                return autoCloseBeforeWhitespace;
            case 'languageDefined':
                return CursorConfiguration._getLanguageDefinedShouldAutoClose(languageIdentifier);
            case 'always':
                return autoCloseAlways;
            case 'never':
                return autoCloseNever;
        }
    }
    static _getLanguageDefinedShouldAutoClose(languageIdentifier) {
        try {
            const autoCloseBeforeSet = LanguageConfigurationRegistry.getAutoCloseBeforeSet(languageIdentifier.id);
            return c => autoCloseBeforeSet.indexOf(c) !== -1;
        }
        catch (e) {
            onUnexpectedError(e);
            return autoCloseNever;
        }
    }
    static _getSurroundingPairs(languageIdentifier) {
        try {
            return LanguageConfigurationRegistry.getSurroundingPairs(languageIdentifier.id);
        }
        catch (e) {
            onUnexpectedError(e);
            return null;
        }
    }
}
/**
 * Represents the cursor state on either the model or on the view model.
 */
export class SingleCursorState {
    constructor(selectionStart, selectionStartLeftoverVisibleColumns, position, leftoverVisibleColumns) {
        this._singleCursorStateBrand = undefined;
        this.selectionStart = selectionStart;
        this.selectionStartLeftoverVisibleColumns = selectionStartLeftoverVisibleColumns;
        this.position = position;
        this.leftoverVisibleColumns = leftoverVisibleColumns;
        this.selection = SingleCursorState._computeSelection(this.selectionStart, this.position);
    }
    equals(other) {
        return (this.selectionStartLeftoverVisibleColumns === other.selectionStartLeftoverVisibleColumns
            && this.leftoverVisibleColumns === other.leftoverVisibleColumns
            && this.position.equals(other.position)
            && this.selectionStart.equalsRange(other.selectionStart));
    }
    hasSelection() {
        return (!this.selection.isEmpty() || !this.selectionStart.isEmpty());
    }
    move(inSelectionMode, lineNumber, column, leftoverVisibleColumns) {
        if (inSelectionMode) {
            // move just position
            return new SingleCursorState(this.selectionStart, this.selectionStartLeftoverVisibleColumns, new Position(lineNumber, column), leftoverVisibleColumns);
        }
        else {
            // move everything
            return new SingleCursorState(new Range(lineNumber, column, lineNumber, column), leftoverVisibleColumns, new Position(lineNumber, column), leftoverVisibleColumns);
        }
    }
    static _computeSelection(selectionStart, position) {
        let startLineNumber, startColumn, endLineNumber, endColumn;
        if (selectionStart.isEmpty()) {
            startLineNumber = selectionStart.startLineNumber;
            startColumn = selectionStart.startColumn;
            endLineNumber = position.lineNumber;
            endColumn = position.column;
        }
        else {
            if (position.isBeforeOrEqual(selectionStart.getStartPosition())) {
                startLineNumber = selectionStart.endLineNumber;
                startColumn = selectionStart.endColumn;
                endLineNumber = position.lineNumber;
                endColumn = position.column;
            }
            else {
                startLineNumber = selectionStart.startLineNumber;
                startColumn = selectionStart.startColumn;
                endLineNumber = position.lineNumber;
                endColumn = position.column;
            }
        }
        return new Selection(startLineNumber, startColumn, endLineNumber, endColumn);
    }
}
export class CursorContext {
    constructor(model, viewModel, coordinatesConverter, cursorConfig) {
        this._cursorContextBrand = undefined;
        this.model = model;
        this.viewModel = viewModel;
        this.coordinatesConverter = coordinatesConverter;
        this.cursorConfig = cursorConfig;
    }
}
export class PartialModelCursorState {
    constructor(modelState) {
        this.modelState = modelState;
        this.viewState = null;
    }
}
export class PartialViewCursorState {
    constructor(viewState) {
        this.modelState = null;
        this.viewState = viewState;
    }
}
export class CursorState {
    constructor(modelState, viewState) {
        this._cursorStateBrand = undefined;
        this.modelState = modelState;
        this.viewState = viewState;
    }
    static fromModelState(modelState) {
        return new PartialModelCursorState(modelState);
    }
    static fromViewState(viewState) {
        return new PartialViewCursorState(viewState);
    }
    static fromModelSelection(modelSelection) {
        const selectionStartLineNumber = modelSelection.selectionStartLineNumber;
        const selectionStartColumn = modelSelection.selectionStartColumn;
        const positionLineNumber = modelSelection.positionLineNumber;
        const positionColumn = modelSelection.positionColumn;
        const modelState = new SingleCursorState(new Range(selectionStartLineNumber, selectionStartColumn, selectionStartLineNumber, selectionStartColumn), 0, new Position(positionLineNumber, positionColumn), 0);
        return CursorState.fromModelState(modelState);
    }
    static fromModelSelections(modelSelections) {
        let states = [];
        for (let i = 0, len = modelSelections.length; i < len; i++) {
            states[i] = this.fromModelSelection(modelSelections[i]);
        }
        return states;
    }
    equals(other) {
        return (this.viewState.equals(other.viewState) && this.modelState.equals(other.modelState));
    }
}
export class EditOperationResult {
    constructor(type, commands, opts) {
        this._editOperationResultBrand = undefined;
        this.type = type;
        this.commands = commands;
        this.shouldPushStackElementBefore = opts.shouldPushStackElementBefore;
        this.shouldPushStackElementAfter = opts.shouldPushStackElementAfter;
    }
}
export function isQuote(ch) {
    return (ch === '\'' || ch === '"' || ch === '`');
}
