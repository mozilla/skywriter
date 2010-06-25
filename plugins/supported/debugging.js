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
    "description": "Commands that may be useful in working on Bespin",
    "dependencies":
    {
        "canon": "0.0"
    },
    "provides":
    [
        {
            "ep": "command",
            "name": "action",
            "params":
            [
                {
                    "name": "actionname",
                    "type": "text",
                    "description": ""
                }
            ],
            "hidden": true,
            "description": "execute any editor action",
            "pointer": "#actionCommand"
        },
        {
            "ep": "command",
            "name": "echo",
            "params":
            [
                {
                    "name": "message",
                    "type": "text",
                    "description": "The text to echo to the command line"
                }
            ],
            "hidden": true,
            "description": "A test echo command",
            "pointer": "#echoCommand"
        },
        {
            "ep": "command",
            "name": "insert",
            "params":
            [
                {
                    "name": "text",
                    "type": "text",
                    "description": "???"
                }
            ],
            "hidden": true,
            "description": "insert the given text at this point.",
            "pointer": "#insertCommand"
        },
        {
            "ep": "command",
            "name": "readonly",
            "params":
            [
                {
                    "name": "flag",
                    "type": "text",
                    "description": "???"
                }
            ],
            "hidden": true,
            "description": "Turn on and off readonly mode",
            "pointer": "#readonlyCommand"
        },
        {
            "ep": "command",
            "name": "template",
            "params":
            [
                {
                    "name": "type",
                    "type": "text",
                    "description": "pass in the template name"
                }
            ],
            "hidden": true,
            "description": "insert templates",
            "pointer": "#templateCommand"
        },
        {
            "ep": "command",
            "name": "use",
            "params":
            [
                {
                    "name": "type",
                    "type": "text",
                    "description": "'sound' will add sound support"
                }
            ],
            "hidden": true,
            "description": "use patterns to bring in code",
            "pointer": "#useCommand"
        },
        {
            "ep": "command",
            "name": "slow",
            "params":
            [
                {
                    "name": "seconds",
                    "type": "text",
                    "description": "How long do we wait before creating output"
                }
            ],
            "hidden": true,
            "description": "create some output, slowly, after a given time (default 5s)",
            "pointer": "#slowCommand"
        },
        {
            "ep": "command",
            "name": "promise",
            "params":
            [
                {
                    "name": "which",
                    "type":
                    {
                        "name": "selection",
                        "data": [ "outstanding", "recent" ]
                    },
                    "description": "Do we display <tt>outstanding</tt> or <tt>recent</tt> promises?"
                }
            ],
            "hidden": true,
            "description": "Display a list of outstanding or recently completed promises",
            "pointer": "#promiseCommand"
        },
        {
            "ep": "command",
            "name": "error",
            "params":
            [
                {
                    "name": "type",
                    "type":
                    {
                        "name": "selection",
                        "data": [ "throw", "request" ]
                    },
                    "defaultValue": "throw",
                    "description": "Do we cause the error by throwing or using request.doneWithError()?"
                },
                {
                    "name": "async",
                    "type": "boolean",
                    "defaultValue": false,
                    "description": "Do we become asyncronous before causing the error?"
                },
                {
                    "name": "message",
                    "type": "string",
                    "defaultValue": "Error",
                    "description": "What message should we report?"
                }
            ],
            "hidden": true,
            "description": "Create an error",
            "pointer": "#errorCommand"
        }
    ]
});
"end";

/**
 * A set of debug commands, that is, commands that could be useful in debugging
 * bespin, as opposed to commands that are useful when using bespin to do
 * debugging.
 */

var util = require('bespin:util/util');
var catalog = require('bespin:plugins').catalog;
var promiseMod = require('bespin:promise');
var env = require('environment').env;

/**
 * The 'action' command
 */
exports.actionCommand = function(args, request) {
    editor.ui.actions[args.actionname]();
};

/**
 * The 'echo' command
 */
exports.echoCommand = function(args, request) {
    request.done(args.message);
};

/**
 * The 'insert' command
 */
exports.insertCommand = function(args, request) {
    editor.model.insertChunk(editor.getModelPos(), args.text);
};

/**
 * The 'readonly' command
 */
exports.readonlyCommand = function(args, request) {
    var msg;
    var flag = args.flag;
    if (flag === undefined || flag === '') {
        flag = !editor.readonly;
        msg = 'Toggling read only to ' + flag;
    } else if (flag == 'off' || flag == 'false') {
        flag = false;
        msg = 'No more read-only!';
    } else {
        flag = true;
        msg = 'Read only mode turned on.';
    }
    editor.setReadOnly(flag);
    request.done(msg);
};

var templates = { 'in': 'for (var key in object) {\n\n}' };

/**
 * The 'template' command
 */
exports.templateCommand = function(args, request) {
    var type = args.type;
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
        var complain = (!type || type === '') ? '' : 'Unknown pattern \'' + type + '\'.<br/>';
        request.doneWithError(complain + 'Known patterns: ' + names.join(", "));
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
exports.useCommand = function(args, request) {
    var type = args.type;
    if (util.isFunction(this.uses[type])) {
        this.uses[type]();
        request.done('Added code for ' + type + '.<br>Please check the results carefully.');
    } else {
        var names = [];
        for (var name in this.uses) {
            if (this.uses.hasOwnProperty(name)) {
                names.push(name);
            }
        }
        var complain = (!type || type === '') ? '' : 'Unknown pattern \'' + type + '\'.<br/>';
        request.doneWithError(complain + 'Known patterns: ' + names.join(', '));
    }
};

/**
 * The 'slow' command
 */
exports.slowCommand = function(args, request) {
    var seconds = args.seconds || 5;
    var start = new Date().getTime();

    var parent = document.createElement('div');
    var prefix = document.createTextNode('Working (');
    parent.appendChild(prefix);
    var counter = document.createElement('span');
    parent.appendChild(counter);
    var suffix = document.createTextNode('%) ...');
    parent.appendChild(suffix);

    var tick = document.createElement('img');
    tick.setAttribute('src', 'https://bespin.mozillalabs.com/images/splash_icn_register.png');

    var interval = setInterval(function() {
        var actual = (new Date().getTime() - start) / 1000;
        var percent = actual * 100 / seconds;
        counter.innerHTML = '' + Math.round(percent);
    }, 100);

    setTimeout(function() {
        clearInterval(interval);
        counter.innerHTML = '100';
        request.output(tick);
        request.done('Completed');
    }, seconds * 1000);

    request.output(parent);
    request.async();
};

/**
 * The 'promise' command
 */
exports.promiseCommand = function(args, request) {
    var dig = (args.which === 'outstanding') ?
        promiseMod._outstanding :
        promiseMod._recent;

    var count = 0;
    dig.forEach(function(promise) {
        count++;
        console.log('- Promise ' + count + ': ', promise);
    });
    request.done(count + ' ' + args.which + ' promises. Details logged to console.');
};

/**
 * The 'error' command
 */
exports.errorCommand = function(args, request) {
    request.output('Some output before we die');
    var die = function() {
        if (args.type === 'throw') {
            throw new Error(args.message);
        } else {
            request.doneWithError(args.message);
        }
    };
    if (args.async) {
        setTimeout(die, 100);
        request.async();
    } else {
        die();
    }
};
