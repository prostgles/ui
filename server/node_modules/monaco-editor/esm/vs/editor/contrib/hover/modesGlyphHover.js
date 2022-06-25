/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { asArray } from '../../../base/common/arrays.js';
import { isEmptyMarkdownString } from '../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../browser/core/markdownRenderer.js';
import { HoverOperation } from './hoverOperation.js';
import { Widget } from '../../../base/browser/ui/widget.js';
import { NullOpenerService } from '../../../platform/opener/common/opener.js';
import { HoverWidget } from '../../../base/browser/ui/hover/hoverWidget.js';
const $ = dom.$;
class MarginComputer {
    constructor(editor) {
        this._editor = editor;
        this._lineNumber = -1;
        this._result = [];
    }
    setLineNumber(lineNumber) {
        this._lineNumber = lineNumber;
        this._result = [];
    }
    clearResult() {
        this._result = [];
    }
    computeSync() {
        const toHoverMessage = (contents) => {
            return {
                value: contents
            };
        };
        const lineDecorations = this._editor.getLineDecorations(this._lineNumber);
        const result = [];
        if (!lineDecorations) {
            return result;
        }
        for (const d of lineDecorations) {
            if (!d.options.glyphMarginClassName) {
                continue;
            }
            const hoverMessage = d.options.glyphMarginHoverMessage;
            if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
                continue;
            }
            result.push(...asArray(hoverMessage).map(toHoverMessage));
        }
        return result;
    }
    onResult(result, isFromSynchronousComputation) {
        this._result = this._result.concat(result);
    }
    getResult() {
        return this._result;
    }
    getResultWithLoadingMessage() {
        return this.getResult();
    }
}
export class ModesGlyphHoverWidget extends Widget {
    constructor(editor, modeService, openerService = NullOpenerService) {
        super();
        this._renderDisposeables = this._register(new DisposableStore());
        this._editor = editor;
        this._hover = this._register(new HoverWidget());
        this._isVisible = false;
        this._messages = [];
        this._lastLineNumber = -1;
        this._markdownRenderer = this._register(new MarkdownRenderer({ editor: this._editor }, modeService, openerService));
        this._computer = new MarginComputer(this._editor);
        this._hoverOperation = new HoverOperation(this._computer, (result) => this._withResult(result), undefined, (result) => this._withResult(result), 300);
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(43 /* fontInfo */)) {
                this._updateFont();
            }
        }));
        this._editor.addOverlayWidget(this);
    }
    dispose() {
        this._hoverOperation.cancel();
        this._editor.removeOverlayWidget(this);
        super.dispose();
    }
    getId() {
        return ModesGlyphHoverWidget.ID;
    }
    getDomNode() {
        return this._hover.containerDomNode;
    }
    getPosition() {
        return null;
    }
    _showAt(lineNumber) {
        if (!this._isVisible) {
            this._isVisible = true;
            this._hover.containerDomNode.classList.toggle('hidden', !this._isVisible);
        }
        const editorLayout = this._editor.getLayoutInfo();
        const topForLineNumber = this._editor.getTopForLineNumber(lineNumber);
        const editorScrollTop = this._editor.getScrollTop();
        const lineHeight = this._editor.getOption(58 /* lineHeight */);
        const nodeHeight = this._hover.containerDomNode.clientHeight;
        const top = topForLineNumber - editorScrollTop - ((nodeHeight - lineHeight) / 2);
        this._hover.containerDomNode.style.left = `${editorLayout.glyphMarginLeft + editorLayout.glyphMarginWidth}px`;
        this._hover.containerDomNode.style.top = `${Math.max(Math.round(top), 0)}px`;
    }
    _updateFont() {
        const codeClasses = Array.prototype.slice.call(this._hover.contentsDomNode.getElementsByClassName('code'));
        codeClasses.forEach(node => this._editor.applyFontInfo(node));
    }
    _updateContents(node) {
        this._hover.contentsDomNode.textContent = '';
        this._hover.contentsDomNode.appendChild(node);
        this._updateFont();
    }
    onModelDecorationsChanged() {
        if (this._isVisible) {
            // The decorations have changed and the hover is visible,
            // we need to recompute the displayed text
            this._hoverOperation.cancel();
            this._computer.clearResult();
            this._hoverOperation.start(0 /* Delayed */);
        }
    }
    startShowingAt(lineNumber) {
        if (this._lastLineNumber === lineNumber) {
            // We have to show the widget at the exact same line number as before, so no work is needed
            return;
        }
        this._hoverOperation.cancel();
        this.hide();
        this._lastLineNumber = lineNumber;
        this._computer.setLineNumber(lineNumber);
        this._hoverOperation.start(0 /* Delayed */);
    }
    hide() {
        this._lastLineNumber = -1;
        this._hoverOperation.cancel();
        if (!this._isVisible) {
            return;
        }
        this._isVisible = false;
        this._hover.containerDomNode.classList.toggle('hidden', !this._isVisible);
    }
    _withResult(result) {
        this._messages = result;
        if (this._messages.length > 0) {
            this._renderMessages(this._lastLineNumber, this._messages);
        }
        else {
            this.hide();
        }
    }
    _renderMessages(lineNumber, messages) {
        this._renderDisposeables.clear();
        const fragment = document.createDocumentFragment();
        for (const msg of messages) {
            const markdownHoverElement = $('div.hover-row.markdown-hover');
            const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents'));
            const renderedContents = this._renderDisposeables.add(this._markdownRenderer.render(msg.value));
            hoverContentsElement.appendChild(renderedContents.element);
            fragment.appendChild(markdownHoverElement);
        }
        this._updateContents(fragment);
        this._showAt(lineNumber);
    }
}
ModesGlyphHoverWidget.ID = 'editor.contrib.modesGlyphHoverWidget';
