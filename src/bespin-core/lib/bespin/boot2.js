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

var embed = require("bespin/embed");

/**
 * We need an HTML element to turn into a Bespin component. This can be either
 * a string that references an HTML element id, or an HTMLElement itself (e.g.
 * from a call to document.getElementById)
 */
var id = "editor";

/**
 * Bespin initialization can be customized in a number of ways. For a complete
 * list of options, see TODO
 */
var options = {
    language: "js",
    loadFromDiv: true,
    setOptions: { strictlines: 'on' }
};

// Fire up Bespin on the given element ID
window.editorComponent = embed.useBespin(id, options);
