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

// ---plugin.json---
var metadata = {
    "depends": ["CommandLine"],
    "provides": [ {
        "ep": "command",
        "name": "eval",
        "takes": [ "js-code" ],
        "preview": "evals given js code and show the result",
        "completeText": "evals given js code and show the result",
        "usage": "",
        "pointer": ""
    }, {
        "ep": "command",
        "name": "version",
        "takes": [ "command" ],
        "preview": "show the version for Bespin or a command",
        "completeText": "optionally, a command name",
        "usage": "",
        "pointer": ""
    }, {
        "ep": "command",
        "name": "",
        "takes": [ "" ],
        "aliases": [ "" ],
        "preview": "",
        "completeText": "",
        "usage": "",
        "pointer": ""
    }, {
        "ep": "command",
        "name": "bespin",
        "preview": "has",
        "hidden": true,
        "usage": "",
        "pointer": ""
    } ]
};
// ---

var util = require("bespin:util/util");
var command = require("CommandLine:command");

/**
 * 'eval' command
 */
exports.evalCommand = function(instruction, jscode) {
    var result;
    try {
        result = eval(jscode);
    } catch (e) {
        result = '<b>Error: ' + e.message + '</b>';
    }

    var msg = '';
    var type = '';
    var x;

    if (util.isFunction(result)) {
        // converts the function to a well formated string
        msg = (result + '').replace(/\n/g, '<br>').replace(/ /g, '&#160');
        type = 'function';
    } else if (util.isObject(result)) {
        if (Array.isArray(result)) {
            type = 'array';
        } else {
            type = 'object';
        }

        var items = [];
        var value;

        for (x in result) {
            if (result.hasOwnProperty(x)) {
                if (util.isFunction(result[x])) {
                    value = "[function]";
                } else if (util.isObject(result[x])) {
                    value = "[object]";
                } else {
                    value = result[x];
                }

                items.push({name: x, value: value});
            }
        }

        items.sort(function(a,b) {
            return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
        });

        for (x = 0; x < items.length; x++) {
            msg += '<b>' + items[x].name + '</b>: ' + items[x].value + '<br>';
        }

    } else {
        msg = result;
        type = typeof result;
    }

    instruction.addOutput("Result for eval <b>\"" + jscode + "\"</b>" +
            " (type: "+ type+"): <br><br>"+ msg);
};

/**
 * 'version' command
 */
exports.versionCommand = function(instruction, command) {
    var version = 'Your Bespin is at version ' + bespin.versionNumber +
            ', Code name: "' + bespin.versionCodename + '"';
    instruction.addOutput(version);
};

var messages = [
    "really wants you to trick it out in some way.",
    "is your Web editor.",
    "would love to be like Emacs on the Web.",
    "is written on the Web platform, so you can tweak it."
];

/**
 * 'bespin' command
 */
exports.bespinCommand = function(instruction) {
    var index = Math.floor(Math.random() * this.messages.length);
    instruction.addOutput("Bespin " + this.messages[index]);
};
