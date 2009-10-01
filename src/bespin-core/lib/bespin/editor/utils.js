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

/**
 * Mess with positions mainly
 */
exports.buildArgs = function(oldPos) {
    return {
        pos: exports.copyPos(oldPos || bespin.get('editor').getCursorPos())
    };
};

exports.changePos = function(args, pos) {
    return {
        pos: exports.copyPos(pos || bespin.get('editor').getCursorPos())
    };
};

exports.copyPos = function(oldPos) {
    return {
        row: oldPos.row,
        col: oldPos.col
    };
};

exports.posEquals = function(pos1, pos2) {
    if (pos1 == pos2) {
        return true;
    }
    if (!pos1 || !pos2) {
        return false;
    }
    return (pos1.col == pos2.col) && (pos1.row == pos2.row);
};

exports.diffObjects = function(o1, o2) {
    var diffs = {};

    if (!o1 || !o2) {
        return undefined;
    }

    for (var key in o1) {
        if (o2[key]) {
            if (o1[key] != o2[key]) {
                diffs[key] = o1[key] + " => " + o2[key];
            }
        } else {
            diffs[key] = "o1: " + key + " = " + o1[key];
        }
    }

    for (var key2 in o2) {
        if (!o1[key2]) {
            diffs[key2] = "o2: " + key2 + " = " + o2[key2];
        }
    }
    return diffs;
};
