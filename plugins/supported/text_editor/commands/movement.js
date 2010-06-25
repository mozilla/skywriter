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

var Range = require('rangeutils:utils/range');
var env = require('environment').env;

// TODO: These should not be using private APIs of the view.

//
// Simple movement.
//
// These simply delegate to the text view, because they take the text view's
// private virtual selection into account.
//

exports.moveDown = function(args, request) {
    var view = env.view;
    view.moveDown();
};

exports.moveLeft = function(args, request) {
    var view = env.view;
    view.moveLeft();
};

exports.moveRight = function(args, request) {
    var view = env.view;
    view.moveRight();
};

exports.moveUp = function(args, request) {
    var view = env.view;
    view.moveUp();
};

//
// Simple selection.
//

exports.selectDown = function(args, request) {
    var view = env.view;
    view.selectDown();
};

exports.selectLeft = function(args, request) {
    var view = env.view;
    view.selectLeft();
};

exports.selectRight = function(args, request) {
    var view = env.view;
    view.selectRight();
};

exports.selectUp = function(args, request) {
    var view = env.view;
    view.selectUp();
};

//
// Move or select to the end of the line or document.
//

var moveOrSelectEnd = function(shift, inLine) {
    var view = env.view, model = env.model;
    var lines = model.lines;
    var selectedRange = view.getSelectedRange(true);
    var row = inLine ? selectedRange.end.row : lines.length - 1;
    view.moveCursorTo({ row: row, col: lines[row].length }, shift);
};

exports.moveLineEnd = function(args, request) {
    moveOrSelectEnd(false, true);
};

exports.selectLineEnd = function(args, request) {
    moveOrSelectEnd(true, true);
};

exports.moveDocEnd = function(args, request) {
    moveOrSelectEnd(false, false);
};

exports.selectDocEnd = function(args, request) {
    moveOrSelectEnd(true, false);
};

//
// Move or select to the beginning of the line or document.
//

var moveOrSelectStart = function(shift, inLine) {
    var view = env.view;
    var range = view.getSelectedRange(true);
    var row = inLine ? range.end.row : 0;
    var position = { row: row, col: 0 };
    view.moveCursorTo(position, shift);
};

exports.moveLineStart = function (args, request) {
    moveOrSelectStart(false, true);
};

exports.selectLineStart = function(args, request) {
    moveOrSelectStart(true, true);
};

exports.moveDocStart = function(args, request) {
    moveOrSelectStart(false, false);
};

exports.selectDocStart = function(args, request) {
    moveOrSelectStart(true, false);
};

//
// Move or select to the next or previous word.
//

var seekNextStop = function(view, text, col, dir, rowChanged) {
    var isDelim;
    var countDelim = 0;
    var wasOverNonDelim = false;

    if (dir < 0) {
        col--;
        if (rowChanged) {
            countDelim = 1;
        }
    }

    while (col < text.length && col > -1) {
        isDelim = view.isDelimiter(text[col]);
        if (isDelim) {
            countDelim++;
        } else {
            wasOverNonDelim = true;
        }
        if ((isDelim || countDelim > 1) && wasOverNonDelim) {
            break;
        }
        col += dir;
    }

    if (dir < 0) {
        col++;
    }

    return col;
};

var moveOrSelectNextWord = function(shiftDown) {
    var view = env.view, model = env.model;
    var lines = model.lines;

    var selectedRange = view.getSelectedRange(true);
    var end = selectedRange.end;
    var row = end.row, col = end.col;

    var currentLine = lines[row];
    var changedRow = false;

    if (col >= currentLine.length) {
        row++;
        changedRow = true;
        if (row < lines.length) {
            col = 0;
            currentLine = lines[row];
        } else {
            currentLine = '';
        }
    }

    col = seekNextStop(view, currentLine, col, 1, changedRow);

    view.moveCursorTo({ row: row, col: col }, shiftDown);
};

var moveOrSelectPreviousWord = function(shiftDown) {
    var view = env.view, model = env.model;

    var lines = model.lines;
    var selectedRange = view.getSelectedRange(true);
    var end = selectedRange.end;
    var row = end.row, col = end.col;

    var currentLine = lines[row];
    var changedRow = false;

    if (col > currentLine.length) {
        col = currentLine.length;
    } else if (col == 0) {
        row--;
        changedRow = true;
        if (row > -1) {
            currentLine = lines[row];
            col = currentLine.length;
        } else {
            currentLine = '';
        }
    }

    col = seekNextStop(view, currentLine, col, -1, changedRow);

    view.moveCursorTo({ row: row, col: col }, shiftDown);
};

exports.moveNextWord = function(args, request) {
    moveOrSelectNextWord(false);
};

exports.selectNextWord = function(args, request) {
    moveOrSelectNextWord(true);
};

exports.movePreviousWord = function(args, request) {
    moveOrSelectPreviousWord(false);
};

exports.selectPreviousWord = function(args, request) {
    moveOrSelectPreviousWord(true);
};

//
// Miscellaneous.
//

/**
 * Selects all characters in the buffer.
 */
exports.selectAll = function(args, request) {
    var view = env.view;
    view.selectAll();
};
