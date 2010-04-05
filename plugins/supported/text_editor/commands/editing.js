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

var settings = require('settings').settings;
var m_range = require('rangeutils:utils/range');

/*
 * Commands that delete text.
 */

var _performBackspaceOrDelete = function(env, isBackspace) {
    var view = env.get('view');
    var model = env.get('model');

    var lines = model.get('lines');
    var range = view.getSelectedRange();

    if (m_range.isZeroLength(range)) {
        if (isBackspace) {
            var start = range.start;
            var tabstop = settings.get('tabstop');
            var row = start.row, column = start.column;
            var line = lines[row];

            if (column > 0 && column % tabstop === 0 &&
                    new RegExp("^\\s{" + column + "}").test(line)) {
                // "Smart tab" behavior: delete a tab worth of whitespace.
                range = {
                    start:  { row: row, column: column - tabstop },
                    end:    range.end
                };
            } else {
                // Just one character.
                range = {
                    start:  model.displacePosition(range.start, -1),
                    end:    range.end
                };
            }
        } else {
            // Extend the selection forward by one character.
            range = {
                start:  range.start,
                end:    model.displacePosition(range.end, 1)
            };
        }
    }

    view.groupChanges(function() {
        view.replaceCharacters(range, "");

        // Position the insertion point at the start of all the ranges that
        // were just deleted.
        view.moveCursorTo(range.start);
    });
};

/**
 * Deletes the selection or the previous character, if the selection is an
 * insertion point.
 */
exports.backspace = function(env, args, request) {
    _performBackspaceOrDelete(env, true);
};

/**
 * Deletes the selection or the next character, if the selection is an
 * insertion point.
 */
exports.deleteCommand = function(env, args, request) {
    _performBackspaceOrDelete(env, false);
};

/*
 * Commands that insert text.
 */

/**
 * Replaces the selection with the given text and updates the selection
 * boundaries appropriately.
 */
exports.insertText = function(env, args, request) {
    var view = env.get('view');
    var text = args.text;
    view.insertText(text);
};

/**
 * Inserts a newline at the insertion point.
 */
exports.newline = function(env, args, request) {
    // Insert a newline, and copy the spaces at the beginning of the
    // current row to autoindent.
    var model = env.get('model'), view = env.get('view');

    var selection = view.getSelectedRange();
    var position = selection.start;
    var row = position.row, col = position.column;

    var lines = model.get('lines');
    var prefix = lines[row].substring(0, col);

    var spaces = /^\s*/.exec(prefix);
    view.insertText("\n" + spaces);
};

exports.tab = function(env, args, request) {
    var view = env.get('view');
    var tabstop = settings.get('tabstop');
    var selection = view.getSelectedRange();
    var count = tabstop - selection.start.column % tabstop;

    var str = "";
    for (var i = 0; i < count; i++) {
        str += " ";
    }

    view.insertText(str);
};

