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

/*
We used to have 2 commands: editconfig and runconfig. This file exists only
while we refactor things and decide what to do with them.
*/

"define metadata";
({
    "provides": [
        {
            "ep": "command",
            "name": "editconfig",
            "aliases": [ "config" ],
            "preview": "load up the config file",
            "pointer": "#editconfigCommand"
        },
        {
            "ep": "command",
            "name": "runconfig",
            "preview": "run your config file",
            "pointer": "#runconfigCommand"
        }
    ]
});
"end";

var catalog = require("bespin:plugins").catalog;

var files = catalog.getObject("files");
var editor = catalog.getObject("editor");

/**
 * 'editconfig' command
 */
exports.editconfigCommand = function(instruction) {
    editor.openFile(files.userSettingsProject, "config");
};

/**
 * 'runconfig' command
 */
exports.runconfigCommand = function(instruction) {
    files.evalFile(files.userSettingsProject, "config");
};
