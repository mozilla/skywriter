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
var env = require('environment').env;
var m_range = require('rangeutils:utils/range');

/*
 * Commands that delete text.
 */

/**
 * Deletes the selection or the previous character, if the selection is an
 * insertion point.
 */
exports.backspace = function(args, request) {
    var view = env.view;
    view.performBackspaceOrDelete(true);
};

/**
 * Deletes the selection or the next character, if the selection is an
 * insertion point.
 */
exports.deleteCommand = function(args, request) {
    var view = env.view;
    view.performBackspaceOrDelete(false);
};

/**
 * Deletes all lines that are partially or fully selected, and position the
 * insertion point at the end of the deleted range.
 */
exports.deleteLines = function(args, request) {
    if (env.model.readOnly) {
        return;
    }

    // In the case of just one line, do nothing.
    if (env.model.lines.length == 1) {
        return;
    }

    var view = env.view;
    view.groupChanges(function() {
        var range = view.getSelectedRange();
        var lines = env.model.lines;
        var lastLine = lines.length - 1;
        var startPos, endPos;

        // Last row gets special treatment.
        if (range.start.row == lastLine) {
            startPos = { col: lines[lastLine - 1].length, row: lastLine - 1 };
        } else {
            startPos = { col: 0, row: range.start.row };
        }

        // Last row gets special treatment.
        if (range.end.row == lastLine) {
            endPos = { col: lines[lastLine].length, row: lastLine};
        } else {
            endPos = { col: 0, row: range.end.row + 1 };
        }

        view.replaceCharacters({
            start: startPos,
            end:   endPos
        }, '');

        view.moveCursorTo(startPos);
    });
};

/*
 * Commands that insert text.
 */

// Inserts a newline, and copies the spaces at the beginning of the current row
// to autoindent.
var newline = function(model, view) {
    var selection = view.getSelectedRange();
    var position = selection.start;
    var row = position.row, col = position.col;

    var lines = model.lines;
    var prefix = lines[row].substring(0, col);

    var spaces = /^\s*/.exec(prefix);
    view.insertText('\n' + spaces);
};

/**
 * Replaces the selection with the given text and updates the selection
 * boundaries appropriately.
 */
exports.insertText = function(args, request) {
    var view = env.view;
    var text = args.text;
    view.insertText(text);
};

/**
 * Inserts a newline at the insertion point.
 */
exports.newline = function(args, request) {
    var model = env.model, view = env.view;
    newline(model, view);
};

/**
 * Join the following line with the current one. Removes trailing whitespaces.
 */
exports.joinLines = function(args, request) {
    var model = env.model;
    if (model.readOnly) {
        return;
    }

    var view = env.view;
    var selection = view.getSelectedRange();
    var lines = model.lines;
    var row = selection.end.row;

    // Last line selected, which can't get joined.
    if (lines.length == row) {
        return;
    }

    view.groupChanges(function() {
        var endCol = lines[row].length;

        view.replaceCharacters({
            start: {
                col: endCol,
                row: row
            },
            end: {
                col: /^\s*/.exec(lines[row + 1])[0].length,
                row: row + 1
        }}, '');
    });
};

/**
 * Creates a new, empty line below the current one, and places the insertion
 * point there.
 */
exports.openLine = function(args, request) {
    if (env.model.readOnly) {
        return;
    }

    var model = env.model, view = env.view;

    var selection = view.getSelectedRange();
    var row = selection.end.row;
    var lines = model.lines;
    view.moveCursorTo({ row: row, col: lines[row].length });

    newline(model, view);
};

/**
 * Inserts a new tab. This is smart about the current inserted whitespaces and
 * the current position of the cursor. If some text is selected, the selected
 * lines will be indented by tabstop spaces.
 */
exports.tab = function(args, request) {
    var view = env.view;

    view.groupChanges(function() {
        var tabstop = settings.get('tabstop');
        var selection = view.getSelectedRange();
        var str = '';

        if (m_range.isZeroLength(selection)){
            var line = env.model.lines[selection.start.row];
            var trailspaces = line.substring(selection.start.col).
                                            match(/^\s*/)[0].length;
            var count = tabstop - (selection.start.col + trailspaces) % tabstop;

            for (var i = 0; i < count; i++) {
                str += ' ';
            }

            view.replaceCharacters({
                 start: selection.start,
                 end:   selection.start
             }, str);

            view.moveCursorTo({
                col: selection.start.col + count + trailspaces,
                row: selection.end.row
            });
        } else {
            for (var i = 0; i < tabstop; i++) {
                str += ' ';
            }

            var startCol;
            var row = selection.start.row - 1;
            while (row++ < selection.end.row) {
                startCol = row == selection.start.row ? selection.start.col : 0;

                view.replaceCharacters({
                    start: { row:  row, col: startCol},
                    end:   { row:  row, col: startCol}
                }, str);
            }

            view.setSelection({
                start: selection.start,
                end: {
                    col: selection.end.col + tabstop,
                    row:  selection.end.row
                }
            });
        }
    }.bind(this));
};

/**
 * Removes a tab of whitespaces. If there is no selection, whitespaces in front
 * of the cursor will be removed. The number of removed whitespaces depends on
 * the setting tabstop and the current cursor position. If there is a selection,
 * then the selected lines are unindented by tabstop spaces.
 */
exports.untab = function(args, request) {
    var view = env.view;

    view.groupChanges(function() {
        var tabstop = settings.get('tabstop');
        var selection = view.getSelectedRange();
        var lines = env.model.lines;
        var count = 0;

        if (m_range.isZeroLength(selection)){
            count = Math.min(
                lines[selection.start.row].substring(0, selection.start.col).
                                                    match(/\s*$/)[0].length,
                (selection.start.col - tabstop) % tabstop || tabstop);

            view.replaceCharacters({
                start: {
                    col: selection.start.col - count,
                    row: selection.start.row
                },
                end: selection.start
            }, '');

            view.moveCursorTo({
                row:  selection.start.row,
                col: selection.end.col - count
            });
        } else {
            var startCol;
            var row = selection.start.row - 1;
            while (row++ < selection.end.row) {
                startCol = row == selection.start.row ? selection.start.col : 0;

                count = Math.min(
                    lines[row].substring(startCol).match(/^\s*/)[0].length,
                    tabstop);

                view.replaceCharacters({
                     start: { row: row, col: startCol},
                     end:   { row: row, col: startCol + count}
                 }, '');
            }

             view.setSelection({
                 start: { row:  selection.start.row, col: selection.start.col},
                 end:   { row:  selection.end.row, col: selection.end.col - count}
             });
       }
    }.bind(this));
};
