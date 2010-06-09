/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Various methods on Input return a set of hints, each of which includes an
 * indicator of the severity of the hint.
 */
exports.Level = {
    /**
     * This means that the user has typed something wrong, and needs to go back
     * to correct it. The input field should indicate the error, and we should
     * prevent the action of Return.
     */
    Error: 3,

    /**
     * The command won't work, and we should prevent the action of Return, but
     * not because of anything the user has done. The problem is that they've
     * not finished yet.
     */
    Incomplete: 2,

    /**
     * The command can be executed, however we want to warn the user of
     * something before they press Return. It is likely that this will result
     * in a visual indicator.
     */
    Warning: 1,

    /**
     * We think we can help the user by displaying this hint, but it's
     * existence does not imply anything that the user has done wrong.
     */
    Info: 0
};

/**
 * A Quick wrapper for a Hint, data about something we show to the user as part
 * of typing at the command line.
 * @param element {Element|string} The thing to display
 * @param level {number} See exports.Level
 * @param completion {string} Describes how the command line should look if the
 * user presses TAB
 */
exports.Hint = function(level, element, completion) {
    this.level = level;
    this.element = element;
    this.completion = completion;
};
