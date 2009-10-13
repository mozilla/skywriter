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

var bespin = require("bespin");
var util = require("bespin/util");
var command = require("bespin/command");
var utils = require("bespin/editor/utils");

/**
 * A set of debug commands, that is, commands that could be useful in debugging
 * bespin, as opposed to commands that are useful when using bespin to do
 * debugging.
 */

/**
 * The 'action' command
 */
command.store.addCommand({
    name: 'action',
    takes: ['actionname'],
    preview: 'execute any editor action',
    hidden: true,
    execute: function(instruction, actionname) {
        bespin.get("editor").ui.actions[actionname]();
    }
});

/**
 * The 'echo' command
 */
command.store.addCommand({
    name: 'echo',
    takes: ['message ...'],
    preview: 'A test echo command',
    execute: function(instruction, args) {
        instruction.addOutput(args);
    }
});

/**
 * The 'login' command
 */
/*
command.store.addCommand({
    name: 'login',
    // aliases: ['user'],
    // takes: ['username', 'password'],
    hidden: true,
    takes: {
        order: ['username', 'password'],
        username: { "short": 'u' },
        password: { "short": 'p', optional: true }
    },
    preview: 'login to the service',
    completeText: 'pass in your username and password',
    execute: function(instruction, args) {
        if (!args) { // short circuit if no username
            instruction.commandLine.executeCommand("status");
            return;
        }
        bespin.get('editSession').username = args.user; // TODO: normalize syncing
        bespin.get('server').login(args.user, args.pass);
    }
});
*/

/**
 * The 'logout' command
 */
/*
command.store.addCommand({
    name: 'logout',
    preview: 'log out',
    execute: function(instruction) {
        delete bespin.get('editSession').username;
        bespin.get('server').logout(function() {
            window.location.href="/";
        });
    }
});
*/

/**
 * The 'insert' command
 */
command.store.addCommand({
    name: 'insert',
    takes: ['text'],
    preview: 'insert the given text at this point.',
    hidden: true,
    execute: function(instruction, text) {
        var editor = bespin.get("editor");
        editor.model.insertChunk(editor.getModelPos(), text);
    }
});

/**
 * The 'readonly' command
 */
command.store.addCommand({
    name: 'readonly',
    takes: ['flag'],
    preview: 'Turn on and off readonly mode',
    hidden: true,
    execute: function(instruction, flag) {
        var msg;

        if (flag === undefined || flag == '') {
            flag = !bespin.get("editor").readonly;
            msg = "Toggling read only to " + flag;
        } else if (flag == 'off' || flag == 'false') {
            flag = false;
            msg = "No more read-only!";
        } else {
            flag = true;
            msg = "Read only mode turned on.";
        }
        bespin.get("editor").setReadOnly(flag);
        instruction.addOutput(msg);
    }
});

/**
 * The 'showevents' command
 */
command.store.addCommand({
    name: 'showevents',
    takes: ['arg'],
    preview: 'Display the events available via pub/sub.',
    hidden: true,
    execute: function(instruction, arg) {
        var all = typeof arg != "undefined" && arg == "all";
        var html = "<u>Showing all Bespin Events</u><br><br>";
        for (var topic in dojo._topics) {
            if (all || topic.indexOf("bespin:") == 0) {
                html += topic + "<br>";
            }
        }
        instruction.addOutput(html);
    }
});

/**
 * The 'typingtest' command
 */
command.store.addCommand({
    name: 'typingtest',
    preview: 'type in the alphabet a few times',
    hidden: true,
    execute: function(instruction) {
        var start = Date.now();

        for (var i = 0; i < 3; i++) {
            var letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
            letters.forEach(function(c) {
                var args = { pos: utils.copyPos(bespin.get('editor').getCursorPos()) };
                args.newchar = c;
                bespin.get('editor').ui.actions.insertCharacter(args);
            });
        }

        var stop = Date.now();

        instruction.addOutput("It took " + (stop - start) + " milliseconds to do this");
    }
});

/**
 * The 'template' command
 */
command.store.addCommand({
    name: 'template',
    takes: ['type'],
    preview: 'insert templates',
    completeText: 'pass in the template name',
    templates: { 'in': "for (var key in object) {\n\n}" },
    execute: function(instruction, type) {
        var value = this.templates[type];
        if (value) {
            var editor = bespin.get("editor");
            editor.model.insertChunk(editor.cursorPosition, value);
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
command.store.addCommand({
    name: 'use',
    takes: ['type'],
    preview: 'use patterns to bring in code',
    completeText: '"sound" will add sound support',
    uses: {
        sound: function() {
            bespin.get("editor").model.insertChunk({ row: 3, col: 0 },
                '  <script type="text/javascript" src="soundmanager2.js"></script>\n');
            bespin.get("editor").model.insertChunk({ row: 4, col: 0 },
                "  <script>\n  var sound; \n  soundManager.onload = function() {\n    sound =  soundManager.createSound('mySound','/path/to/mysoundfile.mp3');\n  }\n  </script>\n");
        },
        jquery: function() {
            var jslib = 'http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js';
            var script = '<script type="text/javascript" src="' + jslib + '"></script>\n';
            bespin.get("editor").model.insertChunk({ row: 3, col: 0 }, script);
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
 * The 'codecomplete' command
 */
command.store.addCommand({
    name: 'complete',
    preview: 'auto complete a piece of code',
    completeText: 'enter the start of the string',
    withKey: "SHIFT SPACE",
    execute: function(instruction, args) {
        console.log("Complete");
    }
});

/**
 * The 'slow' command
 */
command.store.addCommand({
    name: 'slow',
    takes: ['seconds'],
    preview: 'create some output, slowly, after a given time (default 5s)',
    execute: function(instruction, seconds) {
        seconds = seconds || 5;

        setTimeout(instruction.link(function() {
            bespin.publish("session:status");
        }), seconds * 1000);
    }
});
var cursor = require("bespin/editor/cursor");
var cursor = require("bespin/cursor");

/**
 * A set of debug commands, that is, commands that could be useful in debugging
 * bespin, as opposed to commands that are useful when using bespin to do
 * debugging.
 */

/**
 * The 'action' command
 */
command.store.addCommand({
    name: 'action',
    takes: ['actionname'],
    preview: 'execute any editor action',
    hidden: true,
    execute: function(instruction, actionname) {
        bespin.get("editor").ui.actions[actionname]();
    }
});

/**
 * The 'echo' command
 */
command.store.addCommand({
    name: 'echo',
    takes: ['message ...'],
    preview: 'A test echo command',
    execute: function(instruction, args) {
        instruction.addOutput(args);
    }
});

/**
 * The 'login' command
 */
/*
command.store.addCommand({
    name: 'login',
    // aliases: ['user'],
    // takes: ['username', 'password'],
    hidden: true,
    takes: {
        order: ['username', 'password'],
        username: { "short": 'u' },
        password: { "short": 'p', optional: true }
    },
    preview: 'login to the service',
    completeText: 'pass in your username and password',
    execute: function(instruction, args) {
        if (!args) { // short circuit if no username
            instruction.commandLine.executeCommand("status");
            return;
        }
        bespin.get('editSession').username = args.user; // TODO: normalize syncing
        bespin.get('server').login(args.user, args.pass);
    }
});
*/

/**
 * The 'logout' command
 */
/*
command.store.addCommand({
    name: 'logout',
    preview: 'log out',
    execute: function(instruction) {
        delete bespin.get('editSession').username;
        bespin.get('server').logout(function() {
            window.location.href="/";
        });
    }
});
*/

/**
 * The 'insert' command
 */
command.store.addCommand({
    name: 'insert',
    takes: ['text'],
    preview: 'insert the given text at this point.',
    hidden: true,
    execute: function(instruction, text) {
        var editor = bespin.get("editor");
        editor.model.insertChunk(editor.getModelPos(), text);
    }
});

/**
 * The 'readonly' command
 */
command.store.addCommand({
    name: 'readonly',
    takes: ['flag'],
    preview: 'Turn on and off readonly mode',
    hidden: true,
    execute: function(instruction, flag) {
        var msg;

        if (flag === undefined || flag == '') {
            flag = !bespin.get("editor").readonly;
            msg = "Toggling read only to " + flag;
        } else if (flag == 'off' || flag == 'false') {
            flag = false;
            msg = "No more read-only!";
        } else {
            flag = true;
            msg = "Read only mode turned on.";
        }
        bespin.get("editor").setReadOnly(flag);
        instruction.addOutput(msg);
    }
});

/**
 * The 'showevents' command
 */
command.store.addCommand({
    name: 'showevents',
    takes: ['arg'],
    preview: 'Display the events available via pub/sub.',
    hidden: true,
    execute: function(instruction, arg) {
        var all = typeof arg != "undefined" && arg == "all";
        var html = "<u>Showing all Bespin Events</u><br><br>";
        for (var topic in dojo._topics) {
            if (all || topic.indexOf("bespin:") == 0) {
                html += topic + "<br>";
            }
        }
        instruction.addOutput(html);
    }
});

/**
 * The 'typingtest' command
 */
command.store.addCommand({
    name: 'typingtest',
    preview: 'type in the alphabet a few times',
    hidden: true,
    execute: function(instruction) {
        var start = Date.now();

        for (var i = 0; i < 3; i++) {
            var letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
            letters.forEach(function(c) {
                var args = { pos: cursor.copyPos(bespin.get('editor').getCursorPos()) };
                args.newchar = c;
                bespin.get('editor').ui.actions.insertCharacter(args);
            });
        }

        var stop = Date.now();

        instruction.addOutput("It took " + (stop - start) + " milliseconds to do this");
    }
});

/**
 * The 'template' command
 */
command.store.addCommand({
    name: 'template',
    takes: ['type'],
    preview: 'insert templates',
    completeText: 'pass in the template name',
    templates: { 'in': "for (var key in object) {\n\n}" },
    execute: function(instruction, type) {
        var value = this.templates[type];
        if (value) {
            var editor = bespin.get("editor");
            editor.model.insertChunk(editor.cursorPosition, value);
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
command.store.addCommand({
    name: 'use',
    takes: ['type'],
    preview: 'use patterns to bring in code',
    completeText: '"sound" will add sound support',
    uses: {
        sound: function() {
            bespin.get("editor").model.insertChunk({ row: 3, col: 0 },
                '  <script type="text/javascript" src="soundmanager2.js"></script>\n');
            bespin.get("editor").model.insertChunk({ row: 4, col: 0 },
                "  <script>\n  var sound; \n  soundManager.onload = function() {\n    sound =  soundManager.createSound('mySound','/path/to/mysoundfile.mp3');\n  }\n  </script>\n");
        },
        jquery: function() {
            var jslib = 'http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js';
            var script = '<script type="text/javascript" src="' + jslib + '"></script>\n';
            bespin.get("editor").model.insertChunk({ row: 3, col: 0 }, script);
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
 * The 'codecomplete' command
 */
command.store.addCommand({
    name: 'complete',
    preview: 'auto complete a piece of code',
    completeText: 'enter the start of the string',
    withKey: "SHIFT SPACE",
    execute: function(instruction, args) {
        console.log("Complete");
    }
});

/**
 * The 'slow' command
 */
command.store.addCommand({
    name: 'slow',
    takes: ['seconds'],
    preview: 'create some output, slowly, after a given time (default 5s)',
    execute: function(instruction, seconds) {
        seconds = seconds || 5;

        setTimeout(instruction.link(function() {
            bespin.publish("session:status");
        }), seconds * 1000);
    }
});
var util = require("bespin/util/util");
var command = require("bespin/command");
var cursor = require("bespin/cursor");

/**
 * A set of debug commands, that is, commands that could be useful in debugging
 * bespin, as opposed to commands that are useful when using bespin to do
 * debugging.
 */

/**
 * The 'action' command
 */
command.store.addCommand({
    name: 'action',
    takes: ['actionname'],
    preview: 'execute any editor action',
    hidden: true,
    execute: function(instruction, actionname) {
        bespin.get("editor").ui.actions[actionname]();
    }
});

/**
 * The 'echo' command
 */
command.store.addCommand({
    name: 'echo',
    takes: ['message ...'],
    preview: 'A test echo command',
    execute: function(instruction, args) {
        instruction.addOutput(args);
    }
});

/**
 * The 'login' command
 */
/*
command.store.addCommand({
    name: 'login',
    // aliases: ['user'],
    // takes: ['username', 'password'],
    hidden: true,
    takes: {
        order: ['username', 'password'],
        username: { "short": 'u' },
        password: { "short": 'p', optional: true }
    },
    preview: 'login to the service',
    completeText: 'pass in your username and password',
    execute: function(instruction, args) {
        if (!args) { // short circuit if no username
            instruction.commandLine.executeCommand("status");
            return;
        }
        bespin.get('editSession').username = args.user; // TODO: normalize syncing
        bespin.get('server').login(args.user, args.pass);
    }
});
*/

/**
 * The 'logout' command
 */
/*
command.store.addCommand({
    name: 'logout',
    preview: 'log out',
    execute: function(instruction) {
        delete bespin.get('editSession').username;
        bespin.get('server').logout(function() {
            window.location.href="/";
        });
    }
});
*/

/**
 * The 'insert' command
 */
command.store.addCommand({
    name: 'insert',
    takes: ['text'],
    preview: 'insert the given text at this point.',
    hidden: true,
    execute: function(instruction, text) {
        var editor = bespin.get("editor");
        editor.model.insertChunk(editor.getModelPos(), text);
    }
});

/**
 * The 'readonly' command
 */
command.store.addCommand({
    name: 'readonly',
    takes: ['flag'],
    preview: 'Turn on and off readonly mode',
    hidden: true,
    execute: function(instruction, flag) {
        var msg;

        if (flag === undefined || flag == '') {
            flag = !bespin.get("editor").readonly;
            msg = "Toggling read only to " + flag;
        } else if (flag == 'off' || flag == 'false') {
            flag = false;
            msg = "No more read-only!";
        } else {
            flag = true;
            msg = "Read only mode turned on.";
        }
        bespin.get("editor").setReadOnly(flag);
        instruction.addOutput(msg);
    }
});

/**
 * The 'showevents' command
 */
command.store.addCommand({
    name: 'showevents',
    takes: ['arg'],
    preview: 'Display the events available via pub/sub.',
    hidden: true,
    execute: function(instruction, arg) {
        var all = typeof arg != "undefined" && arg == "all";
        var html = "<u>Showing all Bespin Events</u><br><br>";
        for (var topic in dojo._topics) {
            if (all || topic.indexOf("bespin:") == 0) {
                html += topic + "<br>";
            }
        }
        instruction.addOutput(html);
    }
});

/**
 * The 'typingtest' command
 */
command.store.addCommand({
    name: 'typingtest',
    preview: 'type in the alphabet a few times',
    hidden: true,
    execute: function(instruction) {
        var start = Date.now();

        for (var i = 0; i < 3; i++) {
            var letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
            letters.forEach(function(c) {
                var args = { pos: cursor.copyPos(bespin.get('editor').getCursorPos()) };
                args.newchar = c;
                bespin.get('editor').ui.actions.insertCharacter(args);
            });
        }

        var stop = Date.now();

        instruction.addOutput("It took " + (stop - start) + " milliseconds to do this");
    }
});

/**
 * The 'template' command
 */
command.store.addCommand({
    name: 'template',
    takes: ['type'],
    preview: 'insert templates',
    completeText: 'pass in the template name',
    templates: { 'in': "for (var key in object) {\n\n}" },
    execute: function(instruction, type) {
        var value = this.templates[type];
        if (value) {
            var editor = bespin.get("editor");
            editor.model.insertChunk(editor.cursorPosition, value);
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
command.store.addCommand({
    name: 'use',
    takes: ['type'],
    preview: 'use patterns to bring in code',
    completeText: '"sound" will add sound support',
    uses: {
        sound: function() {
            bespin.get("editor").model.insertChunk({ row: 3, col: 0 },
                '  <script type="text/javascript" src="soundmanager2.js"></script>\n');
            bespin.get("editor").model.insertChunk({ row: 4, col: 0 },
                "  <script>\n  var sound; \n  soundManager.onload = function() {\n    sound =  soundManager.createSound('mySound','/path/to/mysoundfile.mp3');\n  }\n  </script>\n");
        },
        jquery: function() {
            var jslib = 'http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js';
            var script = '<script type="text/javascript" src="' + jslib + '"></script>\n';
            bespin.get("editor").model.insertChunk({ row: 3, col: 0 }, script);
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
 * The 'codecomplete' command
 */
command.store.addCommand({
    name: 'complete',
    preview: 'auto complete a piece of code',
    completeText: 'enter the start of the string',
    withKey: "SHIFT SPACE",
    execute: function(instruction, args) {
        console.log("Complete");
    }
});

/**
 * The 'slow' command
 */
command.store.addCommand({
    name: 'slow',
    takes: ['seconds'],
    preview: 'create some output, slowly, after a given time (default 5s)',
    execute: function(instruction, seconds) {
        seconds = seconds || 5;

        setTimeout(instruction.link(function() {
            bespin.publish("session:status");
        }), seconds * 1000);
    }
});
