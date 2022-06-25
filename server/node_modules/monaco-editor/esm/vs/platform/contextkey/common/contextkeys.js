/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { RawContextKey } from './contextkey.js';
export const IsWindowsContext = new RawContextKey('isWindows', isWindows, localize('isWindows', "Whether the operating system is Windows"));
export const InputFocusedContextKey = 'inputFocus';
