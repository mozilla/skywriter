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

var util = require("bespin:util/util");
var settings = require("bespin:plugins").catalog.getObject("settings");

/**
 * 'goto' command
 */
exports.gotoCommand = function(instruction, value) {
    if (value) {
        var linenum = parseInt(value, 10);
        editor.moveAndCenter(linenum);
        editor.focus();
    }
};

/**
 * 'replace' command
 */
exports.replaceCommand = function(instruction, args) {
    editor.replace(args);
};

/**
 * 'sort' command
 */
exports.sortCommand = function(instruction, direction) {
    var buffer = editor.getDocument().split(/\n/);
    buffer.sort();
    if (direction && /^desc/.test(direction.toLowerCase())) {
        buffer.reverse();
    }
    editor.insertDocument(buffer.join("\n"));
};

/**
 * 'entab' command
 */
exports.entabCommand = function(instruction, tabsize) {
    if (!tabsize) {
        tabsize = settings.values.tabsize;
    }

    editor.replace({
        search: ' {' + tabsize + '}',
        replace: '\t'
    });
};

/**
 * 'detab' command
 */
exports.detabCommand = function(instruction, tabsize) {
    if (!tabsize) {
        tabsize = settings.values.tabsize;
    }

    editor.replace({
        search: '\t',
        replace: util.repeatString(' ', tabsize)
    });
};

/**
 * 'trim' command
 */
exports.trimCommand = function(instruction, side) {
    if (!side) {
        side = "right";
    }
    var replaceArgs = {
        replace: ''
    };

    if (util.include(["left", "both"], side)) {
        replaceArgs.search = "^\\s+";
        editor.replace(replaceArgs);
    }

    if (util.include(["right", "both"], side)) {
        replaceArgs.search = "\\s+$";
        editor.replace(replaceArgs);
    }
};

/**
 * 'uc' command
 */
exports.ucCommand = function(instruction) {
    editor.selectionChangeCase({ stringCase: 'u' });
};

/**
 * 'lc' command
 */
exports.lcCommand = function(instruction) {
    editor.selectionChangeCase({ stringCase: 'l' });
};
