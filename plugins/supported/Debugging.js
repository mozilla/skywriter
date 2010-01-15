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
    "provides": [
        {
            "ep": "command",
            "name": "action",
            "takes": [ "actionname" ],
            "hidden": true,
            "preview": "execute any editor action",
            "pointer": "debug#actionCommand"
        },
        {
            "ep": "command",
            "name": "echo",
            "takes": [ "message ..." ],
            "hidden": true,
            "preview": "A test echo command",
            "pointer": "#echoCommand"
        },
        {
            "ep": "command",
            "name": "insert",
            "takes": [ "text" ],
            "hidden": true,
            "preview": "insert the given text at this point.",
            "pointer": "#insertCommand"
        },
        {
            "ep": "command",
            "name": "readonly",
            "takes": [ "flag" ],
            "hidden": true,
            "preview": "Turn on and off readonly mode",
            "pointer": "#readonlyCommand"
        },
        {
            "ep": "command",
            "name": "template",
            "takes": [ "type" ],
            "hidden": true,
            "preview": "insert templates",
            "completeText": "pass in the template name",
            "pointer": "#templateCommand"
        },
        {
            "ep": "command",
            "name": "use",
            "takes": [ "type" ],
            "hidden": true,
            "preview": "use patterns to bring in code",
            "completeText": "'sound' will add sound support",
            "pointer": "#useCommand"
        },
        {
            "ep": "command",
            "name": "slow",
            "takes": [ "seconds" ],
            "hidden": true,
            "preview": "create some output, slowly, after a given time (default 5s)",
            "pointer": "#slowCommand"
        }
    ]
});
"end";

/**
 * A set of debug commands, that is, commands that could be useful in debugging
 * bespin, as opposed to commands that are useful when using bespin to do
 * debugging.
 */

var util = require("bespin:util/util");
var catalog = require("bespin:plugins").catalog;

var editor = catalog.get("editor");

/**
 * The 'action' command
 */
exports.actionCommand = function(instruction, actionname) {
    editor.ui.actions[actionname]();
};

/**
 * The 'echo' command
 */
exports.echoCommand = function(instruction, args) {
    instruction.addOutput(args);
};

/**
 * The 'insert' command
 */
exports.insertCommand = function(instruction, text) {
    editor.model.insertChunk(editor.getModelPos(), text);
};

/**
 * The 'readonly' command
 */
exports.readonlyCommand = function(instruction, flag) {
    var msg;
    if (flag === undefined || flag === '') {
        flag = !editor.readonly;
        msg = "Toggling read only to " + flag;
    } else if (flag == 'off' || flag == 'false') {
        flag = false;
        msg = "No more read-only!";
    } else {
        flag = true;
        msg = "Read only mode turned on.";
    }
    editor.setReadOnly(flag);
    instruction.addOutput(msg);
};

var templates = { 'in': "for (var key in object) {\n\n}" };

/**
 * The 'template' command
 */
exports.templateCommand = function(instruction, type) {
    var value = templates[type];
    if (value) {
        editor.model.insertChunk(editor.cursorPosition, value);
    } else {
        var names = [];
        for (var name in templates) {
            if (templates.hasOwnProperty(name)) {
                names.push(name);
            }
        }
        var complain = (!type || type === "") ? "" : "Unknown pattern '" + type + "'.<br/>";
        instruction.addErrorOutput(complain + "Known patterns: " + names.join(", "));
    }
};

var uses = {
    sound: function() {
        this.editor.model.insertChunk({ row: 3, col: 0 },
            '  <script type="text/javascript" src="soundmanager2.js"></script>\n');
        this.editor.model.insertChunk({ row: 4, col: 0 },
            "  <script>\n  var sound; \n  soundManager.onload = function() {\n    sound =  soundManager.createSound('mySound','/path/to/mysoundfile.mp3');\n  }\n  </script>\n");
    },
    jquery: function() {
        var jslib = 'http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js';
        var script = '<script type="text/javascript" src="' + jslib + '"></script>\n';
        this.editor.model.insertChunk({ row: 3, col: 0 }, script);
    }
};

/**
 * The 'use' command
 */
exports.useCommand = function(instruction, type) {
    if (util.isFunction(this.uses[type])) {
        this.uses[type]();
        instruction.addOutput("Added code for " + type + ".<br>Please check the results carefully.");
    } else {
        var names = [];
        for (var name in this.uses) {
            if (this.uses.hasOwnProperty(name)) {
                names.push(name);
            }
        }
        var complain = (!type || type === "") ? "" : "Unknown pattern '" + type + "'.<br/>";
        instruction.addErrorOutput(complain + "Known patterns: " + names.join(", "));
    }
};

/**
 * The 'slow' command
 */
exports.slowCommand = function(instruction, seconds) {
    seconds = seconds || 5;
    setTimeout(instruction.link(function() {
        instruction.addOutput("'slow' command complete");
    }), seconds * 1000);
};
