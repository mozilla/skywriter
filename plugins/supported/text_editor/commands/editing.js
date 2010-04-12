/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the 'License'); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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
 * either the GNU General Public License Version 2 or later (the 'GPL'), or
 * the GNU Lesser General Public License Version 2.1 or later (the 'LGPL'),
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

/**
 * Deletes the selection or the previous character, if the selection is an
 * insertion point.
 */
exports.backspace = function(env, args, request) {
    var view = env.get('view');
    view.performBackspaceOrDelete(true);
};

/**
 * Deletes the selection or the next character, if the selection is an
 * insertion point.
 */
exports.deleteCommand = function(env, args, request) {
    var view = env.get('view');
    view.performBackspaceOrDelete(false);
};

/**
 * Deletes all lines that are partially or fully selected, and position the
 * insertion point at the end of the deleted range.
 */
exports.deleteLines = function(env, args, request) {
    var view = env.get('view');
    var range = view.getSelectedRange();

    view.groupChanges(function() {
        var startPos = { column: 0, row: range.start.row };
        view.replaceCharacters({
            start: startPos,
            end: { column: 0, row: range.end.row + 1 }
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
    var row = position.row, col = position.column;

    var lines = model.get('lines');
    var prefix = lines[row].substring(0, col);

    var spaces = /^\s*/.exec(prefix);
    view.insertText('\n' + spaces);
};

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
    var model = env.get('model'), view = env.get('view');
    newline(model, view);
};

/**
 * Creates a new, empty line below the current one, and places the insertion
 * point there.
 */
exports.openLine = function(env, args, request) {
    var model = env.get('model'), view = env.get('view');

    var selection = view.getSelectedRange();
    var row = selection.end.row;
    var lines = model.get('lines');
    view.moveCursorTo({ row: row, column: lines[row].length });

    newline(model, view);
};

exports.tab = function(env, args, request) {
    var view = env.get('view');
    var tabstop = settings.get('tabstop');
    var selection = view.getSelectedRange();
    var count = tabstop - selection.start.column % tabstop;

    var str = '';
    for (var i = 0; i < count; i++) {
        str += ' ';
    }

    view.insertText(str);
};

