/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Position } from '../../common/core/position.js';
import { Range } from '../../common/core/range.js';
import { SnippetParser } from '../snippet/snippetParser.js';
import { SnippetSession } from '../snippet/snippetSession.js';
import { SuggestController } from '../suggest/suggestController.js';
import { minimizeInlineCompletion } from './inlineCompletionsModel.js';
import { normalizedInlineCompletionsEquals } from './inlineCompletionToGhostText.js';
import { compareBy, compareByNumber, findMaxBy } from './utils.js';
export class SuggestWidgetInlineCompletionProvider extends Disposable {
    constructor(editor, suggestControllerPreselector) {
        super();
        this.editor = editor;
        this.suggestControllerPreselector = suggestControllerPreselector;
        this.isSuggestWidgetVisible = false;
        this.isShiftKeyPressed = false;
        this._isActive = false;
        this._currentInlineCompletion = undefined;
        this.onDidChangeEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        // This delay fixes a suggest widget issue when typing "." immediately restarts the suggestion session.
        this.setInactiveDelayed = this._register(new RunOnceScheduler(() => {
            if (!this.isSuggestWidgetVisible) {
                if (this._isActive) {
                    this._isActive = false;
                    this.onDidChangeEmitter.fire();
                }
            }
        }, 100));
        // See the command acceptAlternativeSelectedSuggestion that is bound to shift+tab
        this._register(editor.onKeyDown(e => {
            if (e.shiftKey && !this.isShiftKeyPressed) {
                this.isShiftKeyPressed = true;
                this.update(this._isActive);
            }
        }));
        this._register(editor.onKeyUp(e => {
            if (e.shiftKey && this.isShiftKeyPressed) {
                this.isShiftKeyPressed = false;
                this.update(this._isActive);
            }
        }));
        const suggestController = SuggestController.get(this.editor);
        if (suggestController) {
            this._register(suggestController.registerSelector({
                priority: 100,
                select: (model, pos, suggestItems) => {
                    const textModel = this.editor.getModel();
                    const normalizedItemToPreselect = minimizeInlineCompletion(textModel, this.suggestControllerPreselector());
                    if (!normalizedItemToPreselect) {
                        return -1;
                    }
                    const position = Position.lift(pos);
                    const candidates = suggestItems
                        .map((suggestItem, index) => {
                        const inlineSuggestItem = suggestionToInlineCompletion(suggestController, position, suggestItem, this.isShiftKeyPressed);
                        const normalizedSuggestItem = minimizeInlineCompletion(textModel, inlineSuggestItem);
                        const valid = normalizedSuggestItem.range.equalsRange(normalizedItemToPreselect.range) &&
                            normalizedItemToPreselect.text.startsWith(normalizedSuggestItem.text);
                        return { index, valid, prefixLength: normalizedSuggestItem.text.length, suggestItem };
                    })
                        .filter(item => item.valid);
                    const result = findMaxBy(candidates, compareBy(s => s.prefixLength, compareByNumber()));
                    return result ? result.index : -1;
                }
            }));
            let isBoundToSuggestWidget = false;
            const bindToSuggestWidget = () => {
                if (isBoundToSuggestWidget) {
                    return;
                }
                isBoundToSuggestWidget = true;
                this._register(suggestController.widget.value.onDidShow(() => {
                    this.isSuggestWidgetVisible = true;
                    this.update(true);
                }));
                this._register(suggestController.widget.value.onDidHide(() => {
                    this.isSuggestWidgetVisible = false;
                    this.setInactiveDelayed.schedule();
                    this.update(this._isActive);
                }));
                this._register(suggestController.widget.value.onDidFocus(() => {
                    this.isSuggestWidgetVisible = true;
                    this.update(true);
                }));
            };
            this._register(Event.once(suggestController.model.onDidTrigger)(e => {
                bindToSuggestWidget();
            }));
        }
        this.update(this._isActive);
    }
    /**
     * Returns undefined if the suggest widget is not active.
    */
    get state() {
        if (!this._isActive) {
            return undefined;
        }
        return { selectedItemAsInlineCompletion: this._currentInlineCompletion };
    }
    update(newActive) {
        const newInlineCompletion = this.getInlineCompletion();
        let shouldFire = false;
        if (!normalizedInlineCompletionsEquals(this._currentInlineCompletion, newInlineCompletion)) {
            this._currentInlineCompletion = newInlineCompletion;
            shouldFire = true;
        }
        if (this._isActive !== newActive) {
            this._isActive = newActive;
            shouldFire = true;
        }
        if (shouldFire) {
            this.onDidChangeEmitter.fire();
        }
    }
    getInlineCompletion() {
        const suggestController = SuggestController.get(this.editor);
        if (!suggestController) {
            return undefined;
        }
        if (!this.isSuggestWidgetVisible) {
            return undefined;
        }
        const focusedItem = suggestController.widget.value.getFocusedItem();
        if (!focusedItem) {
            return undefined;
        }
        // TODO: item.isResolved
        return suggestionToInlineCompletion(suggestController, this.editor.getPosition(), focusedItem.item, this.isShiftKeyPressed);
    }
    stopForceRenderingAbove() {
        const suggestController = SuggestController.get(this.editor);
        if (suggestController) {
            suggestController.stopForceRenderingAbove();
        }
    }
    forceRenderingAbove() {
        const suggestController = SuggestController.get(this.editor);
        if (suggestController) {
            suggestController.forceRenderingAbove();
        }
    }
}
function suggestionToInlineCompletion(suggestController, position, item, toggleMode) {
    // additionalTextEdits might not be resolved here, this could be problematic.
    if (Array.isArray(item.completion.additionalTextEdits) && item.completion.additionalTextEdits.length > 0) {
        // cannot represent additional text edits
        return {
            text: '',
            range: Range.fromPositions(position, position),
        };
    }
    let { insertText } = item.completion;
    if (item.completion.insertTextRules & 4 /* InsertAsSnippet */) {
        const snippet = new SnippetParser().parse(insertText);
        const model = suggestController.editor.getModel();
        SnippetSession.adjustWhitespace(model, position, snippet, true, true);
        insertText = snippet.toString();
    }
    const info = suggestController.getOverwriteInfo(item, toggleMode);
    return {
        text: insertText,
        range: Range.fromPositions(position.delta(0, -info.overwriteBefore), position.delta(0, Math.max(info.overwriteAfter, 0))),
    };
}
