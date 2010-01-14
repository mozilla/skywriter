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

var SC = require('sproutcore/runtime').SC;
var UndoManager = require('controllers/undomanager').UndoManager;
var t = require('PluginDev');

exports.testUndoAndRedo = function() {
    var undoManager = UndoManager.create();

    var redoReceived = null, undoReceived = null;
    var receiver = SC.Object.create({
        redo: function(context) {
            redoReceived = context;
            return true;
        },

        undo: function(context) {
            undoReceived = context;
            return true;
        }
    });

    undoManager.registerUndo(receiver, 'foo');
    t.equal(undoManager._undoStack.length, 1, "the size of the undo stack " +
        "after one action and 1");
    t.equal(undoManager._redoStack.length, 0, "the size of the redo stack " +
        "after one action and 0");

    undoManager.registerUndo(receiver, 'bar');
    t.equal(undoManager._undoStack.length, 2, "the size of the undo stack " +
        "after two actions and 2");
    t.equal(undoManager._redoStack.length, 0, "the size of the redo stack " +
        "after two actions and 0");

    undoManager.undo();
    t.equal(undoReceived, 'bar', "the context received after undoing 'bar' " +
        "and 'bar'");
    t.equal(undoManager._undoStack.length, 1, "the size of the undo stack " +
        "after two actions and one undo and 1");
    t.equal(undoManager._redoStack.length, 1, "the size of the redo stack " +
        "after two actions and one undo and 1");

    undoManager.undo();
    t.equal(undoReceived, 'foo', "the context received after undoing 'foo' " +
        "and 'foo'");
    t.equal(undoManager._undoStack.length, 0, "the size of the undo stack " +
        "after undoing two actions and 0");
    t.equal(undoManager._redoStack.length, 2, "the size of the redo stack " +
        "after undoing two actions and 2");

    undoManager.redo();
    t.equal(redoReceived, 'foo', "the context received after redoing 'foo' " +
        "and 'foo'");
    t.equal(undoManager._undoStack.length, 1, "the size of the undo stack " +
        "after redoing 'foo' and 1");
    t.equal(undoManager._redoStack.length, 1, "the size of the redo stack " +
        "after redoing 'foo' and 1");

    undoManager.registerUndo(receiver, 'baz');
    t.equal(undoManager._undoStack.length, 2, "the size of the undo stack " +
        "after undoing twice, redoing once, and performing an action; and 2");
    t.equal(undoManager._redoStack.length, 0, "the size of the redo stack " +
        "after undoing twice, redoing once, and performing an action; and 0");
};

