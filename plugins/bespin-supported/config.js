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

"define metadata";
({
    "provides":
     [
        {
            "ep": "command",
            "name": "bindkey",
            "takes": [ "modifiers", "key", "action" ],
            "preview": "Bind a key to an action, or show bindings",
            "completeText": "With no arguments show bindings, else give modifier(s), key, and action name to set",
            "pointer": "#bindkeyCommand"
        }
    ]
});
"end";

var catalog = require("bespin:plugins").catalog;

var editor = catalog.getObject("editor");

/**
 * 'bindkey' command
 */
exports.bindkeyCommand = function(instruction, args) {
    if (args.key && args.action) { // bind a new key binding
        if (args.modifiers == "none") {
            args.modifiers = '';
        }
        editor.bindKey(args.action, args.modifiers + ' ' + args.key, args.selectable);
    } else { // show me the key bindings
        var descriptions = editor.editorKeyListener.keyMapDescriptions;
        var output = "<table>";

        for (var keys in descriptions) {
            if (descriptions.hasOwnProperty(keys)) {
                var keyData = keys.split(','); // metaKey, ctrlKey, altKey, shiftKey
                var keyCode = parseInt(keyData[0], 10);

                var modifiers = [];
                if (keyData[1] === "true") {
                    modifiers.push("CMD");
                }
                if (keyData[2] === "true") {
                    modifiers.push("CTRL");
                }
                if (keyData[3] === "true") {
                    modifiers.push("ALT");
                }
                if (keyData[4] === "true") {
                    modifiers.push("SHIFT");
                }

                var modifierInfo = modifiers.length > 0 ? modifiers.join(', ') + " " : "";
                var keyInfo = modifierInfo + keys.KeyCodeToName[keyCode] || keyCode;
                output += "<tr><td style='text-align:right;'>" + keyInfo + "</td> " +
                        "<td>&#x2192;</td><td>" + descriptions[keys] + "</td></tr>";
            }
        }
        output += "</table>";
        instruction.addOutput(output);
    }
};
