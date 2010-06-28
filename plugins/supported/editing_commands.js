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

"define metadata";
({
    "description": "Provides higher level commands for working with the text.",
    "objects": ["commandLine"],
    "provides": [
        {
            "ep": "command",
            "name": "find",
            "key": "ctrl_f",
            "params":
            [
                {
                    "name": "value",
                    "type": "text",
                    "description": "string to search for"
                }
            ],
            "description": "Search for text within this buffer",
            "pointer": "#findCommand"
        },
        {
            "ep": "command",
            "name": "goto",
            "key": "ctrl_l",
            "params":
            [
                {
                    "name": "line",
                    "type": "text",
                    "description": "add the line number to move to in the file"
                }
            ],
            "description": "move it! make the editor head to a line number.",
            "pointer": "#gotoCommand"
        }
    ]
});
"end";

var env = require('environment').env;

/**
 * 'find' command
 */
exports.findCommand = function(args, request) {
    if (!('value' in args)) {
        env.commandLine.setInput('find ');
        return;
    }

    var view = env.view, search = view.editor.searchController;
    var sel = view.getSelectedRange();
    var output = '';

    search.setSearchText(args.value, false);

    var match = search.findNext(sel.end, true);
    if (match) {
        view.setSelection(match, true);
        view.focus();
    } else {
        output += '<i>No matches found</i><br>';
    }

    output += 'Searching for "' + args.value + '"';
    request.done(output);
};

/**
 * Moves the cursor to the specified line.
 */
exports.gotoCommand = function(args, request) {
    if (!('line' in args)) {
        env.commandLine.setInput('goto ');
        return;
    }

    var view = env.view;
    view.moveCursorTo({ row: args.line - 1, col: 0 });
    view.focus();
};

