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

var util = require("bespin/util/util");
var command = require("bespin/command");

/**
 * A set of debug commands, that is, commands that could be useful in debugging
 * bespin, as opposed to commands that are useful when using bespin to do
 * debugging.
 */

/**
 * The 'action' command
 */
command.rootCanon.addCommand({
    name: 'action',
    takes: ['actionname'],
    preview: 'execute any editor action',
    hidden: true,
    requires: { editor: "editor" },
    execute: function(instruction, actionname) {
        this.editor.ui.actions[actionname]();
    }
});

/**
 * The 'echo' command
 */
command.rootCanon.addCommand({
    name: 'echo',
    takes: ['message ...'],
    preview: 'A test echo command',
    execute: function(instruction, args) {
        instruction.addOutput(args);
    }
});

/**
 * The 'insert' command
 */
command.rootCanon.addCommand({
    name: 'insert',
    takes: ['text'],
    preview: 'insert the given text at this point.',
    hidden: true,
    requires: { editor: "editor" },
    execute: function(instruction, text) {
        this.editor.model.insertChunk(editor.getModelPos(), text);
    }
});

/**
 * The 'readonly' command
 */
command.rootCanon.addCommand({
    name: 'readonly',
    takes: ['flag'],
    preview: 'Turn on and off readonly mode',
    hidden: true,
    requires: { editor: "editor" },
    execute: function(instruction, flag) {
        var msg;

        if (flag === undefined || flag == '') {
            flag = !this.editor.readonly;
            msg = "Toggling read only to " + flag;
        } else if (flag == 'off' || flag == 'false') {
            flag = false;
            msg = "No more read-only!";
        } else {
            flag = true;
            msg = "Read only mode turned on.";
        }
        this.editor.setReadOnly(flag);
        instruction.addOutput(msg);
    }
});

/**
 * The 'template' command
 */
command.rootCanon.addCommand({
    name: 'template',
    takes: ['type'],
    preview: 'insert templates',
    completeText: 'pass in the template name',
    templates: { 'in': "for (var key in object) {\n\n}" },
    requires: { editor: "editor" },
    execute: function(instruction, type) {
        var value = this.templates[type];
        if (value) {
            this.editor.model.insertChunk(this.editor.cursorPosition, value);
        } else {
            var names = [];
            for (var name in this.templates) { names.push(name); }
            var complain = (!type || type == "") ? "" : "Unknown pattern '" + type + "'.<br/>";
            instruction.addErrorOutput(complain + "Known patterns: " + names.join(", "));
        }
    }
});

/**
 * The 'use' command
 */
command.rootCanon.addCommand({
    name: 'use',
    takes: ['type'],
    preview: 'use patterns to bring in code',
    completeText: '"sound" will add sound support',
    requires: { editor: "editor" },
    uses: {
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
    },
    execute: function(instruction, type) {
        if (util.isFunction(this.uses[type])) {
            this.uses[type]();
            instruction.addOutput("Added code for " + type + ".<br>Please check the results carefully.");
        } else {
            var names = [];
            for (var name in this.uses) { names.push(name); }
            var complain = (!type || type == "") ? "" : "Unknown pattern '" + type + "'.<br/>";
            instruction.addErrorOutput(complain + "Known patterns: " + names.join(", "));
        }
    }
});

/**
 * The 'slow' command
 */
command.rootCanon.addCommand({
    name: 'slow',
    takes: ['seconds'],
    preview: 'create some output, slowly, after a given time (default 5s)',
    requires: { hub: "hub" },
    execute: function(instruction, seconds) {
        seconds = seconds || 5;

        setTimeout(instruction.link(function() {
            hub.publish("session:status");
        }), seconds * 1000);
    }
});
