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
 * TODO: make this automatic
 */
exports.helpCommand = function(instruction, extra) {
    var output = this.parent.getHelp(extra, {
        prefix: "<h2>Welcome to Bespin - Code in the Cloud</h2><ul>" +
            "<li><a href='http://labs.mozilla.com/projects/bespin' target='_blank'>Home Page</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin' target='_blank'>Wiki</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/UserGuide' target='_blank'>User Guide</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/Tips' target='_blank'>Tips and Tricks</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/FAQ' target='_blank'>FAQ</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/DeveloperGuide' target='_blank'>Developers Guide</a>" +
            "</ul>",
        suffix: "For more information, see the <a href='https://wiki.mozilla.org/Labs/Bespin'>Bespin Wiki</a>."
    });
    instruction.addOutput(output);
};
