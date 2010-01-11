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

When we come to write a growl system, there are many places in the code where
we do showHint or hideHint that need replacing with whatever API the growl
system uses.

*/

/**
 * Show a command line hint
 * TODO: Implement this once to have some UI space for it
 */
exports.showHint = function(message, timeout) {
    console.log(message);
};

/**
 * Hide a previously displayed command line hint. This normally happens
 * automatically, but sometimes we may wish it to go faster.
 * TODO: (once implemented) check to see if the only uses of this are from the
 * UI in which case it shouldn't be an exported function.
 */
exports.hideHint = function() {
    // ignore until showHint is implemented
};
