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

var UndoManager = require('index').UndoManager;
var t = require('plugindev');

exports.testUndoAndRedo = function() {
    var undoManager = new UndoManager();

    var redoReceived = null;
    var undoReceived = null;

    var receiver = {
        redo: function(context) {
            redoReceived = context;
            return true;
        },

        undo: function(context) {
            undoReceived = context;
            return true;
        }
    };

    undoManager.registerUndo(receiver, 'foo');
    t.equal(undoManager._undoStack.length, 1, 'the size of the undo stack ' +
        'after one action and 1');
    t.equal(undoManager._redoStack.length, 0, 'the size of the redo stack ' +
        'after one action and 0');

    undoManager.registerUndo(receiver, 'bar');
    t.equal(undoManager._undoStack.length, 2, 'the size of the undo stack ' +
        'after two actions and 2');
    t.equal(undoManager._redoStack.length, 0, 'the size of the redo stack ' +
        'after two actions and 0');

    undoManager.undo();
    t.equal(undoReceived, 'bar', 'the context received after undoing \'bar\' ' +
        'and \'bar\'');
    t.equal(undoManager._undoStack.length, 1, 'the size of the undo stack ' +
        'after two actions and one undo and 1');
    t.equal(undoManager._redoStack.length, 1, 'the size of the redo stack ' +
        'after two actions and one undo and 1');

    undoManager.undo();
    t.equal(undoReceived, 'foo', 'the context received after undoing \'foo\' ' +
        'and \'foo\'');
    t.equal(undoManager._undoStack.length, 0, 'the size of the undo stack ' +
        'after undoing two actions and 0');
    t.equal(undoManager._redoStack.length, 2, 'the size of the redo stack ' +
        'after undoing two actions and 2');

    undoManager.redo();
    t.equal(redoReceived, 'foo', 'the context received after redoing \'foo\' ' +
        'and \'foo\'');
    t.equal(undoManager._undoStack.length, 1, 'the size of the undo stack ' +
        'after redoing \'foo\' and 1');
    t.equal(undoManager._redoStack.length, 1, 'the size of the redo stack ' +
        'after redoing \'foo\' and 1');

    undoManager.registerUndo(receiver, 'baz');
    t.equal(undoManager._undoStack.length, 2, 'the size of the undo stack ' +
        'after undoing twice, redoing once, and performing an action; and 2');
    t.equal(undoManager._redoStack.length, 0, 'the size of the redo stack ' +
        'after undoing twice, redoing once, and performing an action; and 0');
};

