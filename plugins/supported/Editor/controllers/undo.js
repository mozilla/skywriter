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
var Patch = require('Patch:utils/patch').Patch;
var catalog = require('bespin:plugins').catalog;

// Use 2 lines of context by default.
var CONTEXT_LINES = 2;

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
exports.EditorUndoController = SC.Object.extend({
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
            throw "UndoController._beginTransaction() called with a " +
                "transaction already in place";
        }

        this._inTransaction = true;
        this._record = { patches: [] };
    },

    _endTransaction: function() {
        if (!this._inTransaction) {
            throw "UndoController._endTransaction() called without a " +
                "transaction in place";
        }

        catalog.getObject('undoManager').registerUndo(this, this._record);
        this._record = null;

        this._inTransaction = false;
    },

    _tryApplyingPatches: function(patches) {
        var textStorage = this.getPath('textView.layoutManager.textStorage');

        // Apply as many patches as possible.
        var i;
        for (i = patches.length - 1; i >= 0; i--) {
            if (!patches[i].applyTo(textStorage)) {
                break;
            }
        }

        // If any of them failed (i.e. we terminated early), then reverse what
        // we did.
        if (i >= 0) {
            while (i < patches.length) {
                patches[i].reverse().applyTo(textStorage);
                i++;
            }
            return false;
        }

        return true;
    },

    _undoOrRedo: function(patches, selection) {
        if (this._inTransaction) {
            // Can't think of any reason why this should be supported, and it's
            // often an indication that someone forgot an endTransaction()
            // call somewhere...
            throw "UndoController._undoOrRedo() called while in a transaction";
        }

        if (!this._tryApplyingPatches(patches)) {
            return false;
        }

        this.get('textView').setSelection(selection);
        return true;
    },

    init: function() {
        this._redoStack = [];
        this._undoStack = [];

        this.get('textView').addDelegate(this);
    },

    redo: function(record) {
        return this._undoOrRedo(record.patches, record.selectionAfter);
    },

    textViewBeganChangeGroup: function(sender, selection) {
        this._beginTransaction();
        this._record.selectionBefore = selection;
    },

    textViewEndedChangeGroup: function(sender, selection) {
        this._record.selectionAfter = selection;
        this._endTransaction();
    },

    textViewReplacedCharacters: function(sender, oldRange, characters) {
        if (!this._inTransaction) {
            throw "UndoController.textViewReplacedCharacters() called " +
                "outside a transaction";
        }

        var textStorage = this.getPath('textView.layoutManager.textStorage');
        var lines = textStorage.get('lines');
        var oldStartRow = oldRange.start.row, oldEndRow = oldRange.end.row;

        var leadingContextStart = Math.max(oldStartRow - CONTEXT_LINES, 0);
        var leadingContext = lines.slice(leadingContextStart, oldStartRow);
        var trailingContextEnd = Math.min(oldEndRow + CONTEXT_LINES,
            lines.length - 1);
        var trailingContext = lines.slice(oldEndRow + 1,
            trailingContextEnd + 1);

        var newRange = textStorage.resultingRangeForReplacement(oldRange,
            characters.split("\n"));
        var newEndRow = newRange.end.row;

        var inserted = lines.slice(oldStartRow, newEndRow + 1);

        var buildOperation = function(operation) {
            return function(line) {
                return { op: operation, line: line };
            };
        };

        this._record.patches.push(Patch.create({
            hunks: [
                {
                    oldRange:   {
                                    start:  leadingContextStart,
                                    end:    trailingContextEnd
                                },
                    newRange:   {
                                    start:  leadingContextStart,
                                    end:    Math.min(newEndRow + 2,
                                            lines.length - 1)
                                },
                    operations: leadingContext.map(buildOperation(' ')).
                                concat(this._deletedCharacters.
                                    map(buildOperation('-')),
                                inserted.map(buildOperation('+')),
                                trailingContext.map(buildOperation(' ')))
                }
            ]
        }));
    },

    textViewWillReplaceRange: function(sender, oldRange) {
        if (!this._inTransaction) {
            throw "UndoController.textViewWillReplaceRange() called outside " +
                "a transaction";
        }

        this._oldRange = oldRange;
        this._deletedCharacters = this.getPath('textView.layoutManager.' +
            'textStorage.lines').slice(oldRange.start.row,
            oldRange.end.row + 1);
    },

    undo: function(record) {
        return this._undoOrRedo(record.patches.map(function(patch) {
                return patch.reverse();
            }), record.selectionBefore);
    }
});

