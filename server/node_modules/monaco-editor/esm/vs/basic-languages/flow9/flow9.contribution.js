/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerLanguage } from '../_.contribution.js';
registerLanguage({
    id: 'flow9',
    extensions: ['.flow'],
    aliases: ['Flow9', 'Flow', 'flow9', 'flow'],
    loader: function () { return import('./flow9.js'); }
});
