/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as dom from '../../dom.js';
import { RunOnceScheduler } from '../../../common/async.js';
import { CancellationTokenSource } from '../../../common/cancellation.js';
import { isMarkdownString } from '../../../common/htmlContent.js';
import { toDisposable } from '../../../common/lifecycle.js';
import { isFunction, isString } from '../../../common/types.js';
import { localize } from '../../../../nls.js';
export function setupNativeHover(htmlElement, tooltip) {
    if (isString(tooltip)) {
        htmlElement.title = tooltip;
    }
    else if (tooltip === null || tooltip === void 0 ? void 0 : tooltip.markdownNotSupportedFallback) {
        htmlElement.title = tooltip.markdownNotSupportedFallback;
    }
    else {
        htmlElement.removeAttribute('title');
    }
}
class UpdatableHoverWidget {
    constructor(hoverDelegate, target, fadeInAnimation) {
        this.hoverDelegate = hoverDelegate;
        this.target = target;
        this.fadeInAnimation = fadeInAnimation;
    }
    update(markdownTooltip, focus) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this._cancellationTokenSource) {
                // there's an computation ongoing, cancel it
                this._cancellationTokenSource.dispose(true);
                this._cancellationTokenSource = undefined;
            }
            if (this.isDisposed) {
                return;
            }
            let resolvedContent;
            if (markdownTooltip === undefined || isString(markdownTooltip) || markdownTooltip instanceof HTMLElement) {
                resolvedContent = markdownTooltip;
            }
            else if (!isFunction(markdownTooltip.markdown)) {
                resolvedContent = (_a = markdownTooltip.markdown) !== null && _a !== void 0 ? _a : markdownTooltip.markdownNotSupportedFallback;
            }
            else {
                // compute the content, potentially long-running
                // show 'Loading' if no hover is up yet
                if (!this._hoverWidget) {
                    this.show(localize('iconLabel.loading', "Loading..."), focus);
                }
                // compute the content
                this._cancellationTokenSource = new CancellationTokenSource();
                const token = this._cancellationTokenSource.token;
                resolvedContent = yield markdownTooltip.markdown(token);
                if (this.isDisposed || token.isCancellationRequested) {
                    // either the widget has been closed in the meantime
                    // or there has been a new call to `update`
                    return;
                }
            }
            this.show(resolvedContent, focus);
        });
    }
    show(content, focus) {
        const oldHoverWidget = this._hoverWidget;
        if (this.hasContent(content)) {
            const hoverOptions = {
                content,
                target: this.target,
                showPointer: this.hoverDelegate.placement === 'element',
                hoverPosition: 2 /* BELOW */,
                skipFadeInAnimation: !this.fadeInAnimation || !!oldHoverWidget // do not fade in if the hover is already showing
            };
            this._hoverWidget = this.hoverDelegate.showHover(hoverOptions, focus);
        }
        oldHoverWidget === null || oldHoverWidget === void 0 ? void 0 : oldHoverWidget.dispose();
    }
    hasContent(content) {
        if (!content) {
            return false;
        }
        if (isMarkdownString(content)) {
            return this.hasContent(content.value);
        }
        return true;
    }
    get isDisposed() {
        var _a;
        return (_a = this._hoverWidget) === null || _a === void 0 ? void 0 : _a.isDisposed;
    }
    dispose() {
        var _a, _b;
        (_a = this._hoverWidget) === null || _a === void 0 ? void 0 : _a.dispose();
        (_b = this._cancellationTokenSource) === null || _b === void 0 ? void 0 : _b.dispose(true);
        this._cancellationTokenSource = undefined;
    }
}
export function setupCustomHover(hoverDelegate, htmlElement, markdownTooltip) {
    let hoverPreparation;
    let hoverWidget;
    const hideHover = (disposeWidget, disposePreparation) => {
        var _a;
        if (disposeWidget) {
            hoverWidget === null || hoverWidget === void 0 ? void 0 : hoverWidget.dispose();
            hoverWidget = undefined;
        }
        if (disposePreparation) {
            hoverPreparation === null || hoverPreparation === void 0 ? void 0 : hoverPreparation.dispose();
            hoverPreparation = undefined;
        }
        (_a = hoverDelegate.onDidHideHover) === null || _a === void 0 ? void 0 : _a.call(hoverDelegate);
    };
    const showHoverDelayed = (delay, focus) => {
        if (hoverPreparation) {
            return;
        }
        const mouseLeaveOrDown = (e) => {
            const isMouseDown = e.type === dom.EventType.MOUSE_DOWN;
            hideHover(isMouseDown, isMouseDown || e.fromElement === htmlElement);
        };
        const mouseLeaveDomListener = dom.addDisposableListener(htmlElement, dom.EventType.MOUSE_LEAVE, mouseLeaveOrDown, true);
        const mouseDownDownListener = dom.addDisposableListener(htmlElement, dom.EventType.MOUSE_DOWN, mouseLeaveOrDown, true);
        const target = {
            targetElements: [htmlElement],
            dispose: () => { }
        };
        let mouseMoveDomListener;
        if (hoverDelegate.placement === undefined || hoverDelegate.placement === 'mouse') {
            const mouseMove = (e) => target.x = e.x + 10;
            mouseMoveDomListener = dom.addDisposableListener(htmlElement, dom.EventType.MOUSE_MOVE, mouseMove, true);
        }
        const showHover = () => __awaiter(this, void 0, void 0, function* () {
            if (hoverPreparation && (!hoverWidget || hoverWidget.isDisposed)) {
                hoverWidget = new UpdatableHoverWidget(hoverDelegate, target, delay > 0);
                yield hoverWidget.update(markdownTooltip, focus);
            }
            mouseMoveDomListener === null || mouseMoveDomListener === void 0 ? void 0 : mouseMoveDomListener.dispose();
        });
        const timeout = new RunOnceScheduler(showHover, delay);
        timeout.schedule();
        hoverPreparation = toDisposable(() => {
            timeout.dispose();
            mouseMoveDomListener === null || mouseMoveDomListener === void 0 ? void 0 : mouseMoveDomListener.dispose();
            mouseDownDownListener.dispose();
            mouseLeaveDomListener.dispose();
        });
    };
    const mouseOverDomEmitter = dom.addDisposableListener(htmlElement, dom.EventType.MOUSE_OVER, () => showHoverDelayed(hoverDelegate.delay), true);
    const hover = {
        show: focus => {
            showHoverDelayed(0, focus); // show hover immediately
        },
        hide: () => {
            hideHover(true, true);
        },
        update: (newTooltip) => __awaiter(this, void 0, void 0, function* () {
            markdownTooltip = newTooltip;
            yield (hoverWidget === null || hoverWidget === void 0 ? void 0 : hoverWidget.update(markdownTooltip));
        }),
        dispose: () => {
            mouseOverDomEmitter.dispose();
            hideHover(true, true);
        }
    };
    return hover;
}
