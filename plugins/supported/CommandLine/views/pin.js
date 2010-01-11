/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Push Pin button.
 * @class
 * @extends SC.ButtonView
 */
exports.PinView = SC.ButtonView.extend({

    classNames: ['sc-pin-view'],

    theme: 'pin',

    // TODO: Find a way to make this work
    // layout: { height: 16, width: 16 },

    titleMinWidth: 0,

    isSelected: false,

    buttonBehavior: SC.TOGGLE_BEHAVIOR,

    /**
     * This is the value that will be set when the pin is in
     */
    toggleOnValue: YES,

    /**
     * This is the value that will be set when the pin is out
     */
    toggleOffValue: NO,

    /** @private */
    valueBindingDefault: SC.Binding.bool(),

    /** @private */
    render: function(context, firstTime) {
        context.push('<img src="',
                SC.BLANK_IMAGE_URL,
                '" class="button" alt="" />');
    }
});
