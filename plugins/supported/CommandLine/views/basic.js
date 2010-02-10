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

var SC = require("sproutcore/runtime").SC;
var cliController = require("controller").cliController;

/**
 * A really basic UI hint for when someone is entering something from a
 * selection.
 */
exports.selection = {
    /**
     * @see typehint#getHint()
     */
    getHint: function(input, assignment, typeExt) {
        var filter = assignment.value;

        var data = typeExt.data;
        if (!data) {
            console.error("Missing data for selection type");
            data = [];
        }

        // How many matches do we have?
        var matches = [];
        data.forEach(function(option) {
            if (filter && option.name.substring(0, filter.length) != filter) {
                return;
            }
            matches.push(option);
        }.bind(this));

        if (matches.length === 0) {
            // So this is an error - nothing matches
            // TODO: suggest typo fixes?
            return {
                element: "Nothing matches.",
                error: true
            };
        } else if (matches.length === 1) {
            var match = matches[0];
            var compl = match.name.substring(filter.length, match.name.length);
            var desc = match.name + ": " + match.description;
            return {
                element: desc + " (\u2192 to accept)",
                completion: compl + " "
            };
        } else {
            var parent = document.createElement("div");
            parent.appendChild(document.createTextNode(assignment.param.description));

            var index = 0;
            matches.forEach(function(option) {
                if (index === 0) {
                    parent.appendChild(document.createTextNode(": "));
                } else {
                    parent.appendChild(document.createTextNode(", "));
                }
                var link = document.createElement("a");
                link.setAttribute("href", "javascript:;");
                link.appendChild(document.createTextNode(option.name));
                link.addEventListener("click", function(ev) {
                    SC.run(function() {
                        cliController.set("input", option.name + " ");
                    });
                }, false);
                parent.appendChild(link);
                index++;
            }.bind(this));

            return { element: parent };
        }
    }
};
