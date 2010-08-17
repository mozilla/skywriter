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

var console = require('bespin:console').console;
var env = require('environment').env;

/**
 * @class
 *
 * The editor undo controller is a delegate of the text view that groups
 * changes into patches and saves them with the undo manager.
 *
 * This object does not assume that it has exclusive write access to the text
 * storage object, and as such it tries to maintain sensible behavior in the
 * presence of direct modification to the text storage by other objects. This
 * is important for collaboration.
 */
exports.EditorUndoController = function(editor) {
    this.editor = editor;
    var textView = this.textView = editor.textView;

    textView.beganChangeGroup.add(function(sender, selection) {
        this._beginTransaction();
        this._record.selectionBefore = selection;
    }.bind(this));

    textView.endedChangeGroup.add(function(sender, selection) {
        this._record.selectionAfter = selection;
        this._endTransaction();
    }.bind(this));

    textView.replacedCharacters.add(function(sender, oldRange, characters) {
        if (!this._inTransaction) {
            throw new Error('UndoController.textViewReplacedCharacters()' +
                ' called outside a transaction');
        }

        this._record.patches.push({
            oldCharacters:  this._deletedCharacters,
            oldRange:       oldRange,
            newCharacters:  characters,
            newRange:       this.editor.layoutManager.textStorage.
                            resultingRangeForReplacement(oldRange,
                            characters.split('\n'))
        });

        this._deletedCharacters = null;
    }.bind(this));

    textView.willReplaceRange.add(function(sender, oldRange) {
        if (!this._inTransaction) {
            throw new Error('UndoController.textViewWillReplaceRange() called' +
                ' outside a transaction');
        }

        this._deletedCharacters = this.editor.layoutManager.textStorage.
                            getCharacters(oldRange);
    }.bind(this));
};

exports.EditorUndoController.prototype = {
    _inTransaction: false,
    _record: null,

    /**
     * @property{TextView}
     *
     * The view object to forward changes to. This property must be set upon
     * instantiating the undo controller.
     */
    textView: null,

    _beginTransaction: function() {
        if (this._inTransaction) {
            console.trace();
            throw new Error('UndoController._beginTransaction() called with a ' +
                'transaction already in place');
        }

        this._inTransaction = true;
        this._record = { patches: [] };
    },

    _endTransaction: function() {
        if (!this._inTransaction) {
            throw new Error('UndoController._endTransaction() called without a ' +
                'transaction in place');
        }

        this.editor.buffer.undoManager.registerUndo(this, this._record);
        this._record = null;

        this._inTransaction = false;
    },

    _tryApplyingPatches: function(patches) {
        var textStorage = this.editor.layoutManager.textStorage;
        patches.forEach(function(patch) {
            textStorage.replaceCharacters(patch.oldRange, patch.newCharacters);
        });
        return true;
    },

    _undoOrRedo: function(patches, selection) {
        if (this._inTransaction) {
            // Can't think of any reason why this should be supported, and it's
            // often an indication that someone forgot an endTransaction()
            // call somewhere...
            throw new Error('UndoController._undoOrRedo() called while in a transaction');
        }

        if (!this._tryApplyingPatches(patches)) {
            return false;
        }

        this.textView.setSelection(selection, true);
        return true;
    },

    redo: function(record) {
        var patches = record.patches.concat();
        patches.reverse();
        return this._undoOrRedo(patches, record.selectionAfter);
    },

    undo: function(record) {
        return this._undoOrRedo(record.patches.map(function(patch) {
                return {
                    oldCharacters:  patch.newCharacters,
                    oldRange:       patch.newRange,
                    newCharacters:  patch.oldCharacters,
                    newRange:       patch.oldRange
                };
            }), record.selectionBefore);
    }
};

exports.undoManagerCommand = function(args, request) {
    var editor = env.editor;
    editor.buffer.undoManager[request.commandExt.name]()
};
