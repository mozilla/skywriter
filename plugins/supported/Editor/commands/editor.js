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
