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
 * The undo controller is a delegate of the text view that records all change
 * groups into a log. The transactions can be replayed with undo() and redo().
 *
 * This object does not assume that it has exclusive write access to the text
 * storage object, and as such it tries to maintain sensible behavior in the
 * presence of direct modification to the text storage by other objects. This
 * is important for collaboration.
 */
exports.UndoController = SC.Object.extend({
    _inTransaction: false,
    _patches: null,
    _redoStack: null,
    _selectionAfter: null,
    _selectionBefore: null,
    _undoStack: null,

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
        this._patches = [];
    },

    _endTransaction: function() {
        if (!this._inTransaction) {
            throw "UndoController._endTransaction() called without a " +
                "transaction in place";
        }

        this._undoStack.push({
            patches:            this._patches,
            selectionAfter:     this._selectionAfter,
            selectionBefore:    this._selectionBefore
        });

        this._patches = null;
        this._selection = null;

        var thisUndoController = this;
        catalog.getObject('undoManager').registerUndo(function() {
            thisUndoController.undo();
        }, "Typing");

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

    _undoOrRedo: function(op) {
        if (this._inTransaction) {
            // Can't think of any reason why this should be supported, and it's
            // often an indication that someone forgot an endTransaction()
            // call somewhere...
            throw "UndoController._undoOrRedo() called while in a transaction";
        }

        var stack, otherStack, reverseOp, selection;
        switch (op) {
        case 'undo':
            otherStack = this._redoStack;
            reverseOp = 'redo';
            selection = 'selectionBefore';
            stack = this._undoStack;
            break;
        case 'redo':
            otherStack = this._undoStack;
            reverseOp = 'undo';
            selection = 'selectionAfter';
            stack = this._redoStack;
            break;
        }

        if (stack.length === 0) {
            throw "UndoController._undoOrRedo() called with an empty stack";
        }

        var record = stack.pop();

        var patches = op === 'undo' ?
            record.patches.map(function(patch) { return patch.reverse(); }) :
            record.patches;

        if (!this._tryApplyingPatches(patches)) {
            return;
        }

        this.get('textView').setSelection(record[selection]);

        otherStack.push(record);

        var thisUndoController = this;
        catalog.getObject('undoManager').registerUndo(function() {
            thisUndoController[reverseOp]();
        });
    },

    init: function() {
        this._redoStack = [];
        this._undoStack = [];

        this.get('textView').addDelegate(this);
    },

    redo: function() {
        this._undoOrRedo('redo');
    },

    textViewBeganChangeGroup: function(sender, selection) {
        this._beginTransaction();
        this._selectionBefore = selection;
    },

    textViewEndedChangeGroup: function(sender, selection) {
        this._selectionAfter = selection;
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

        this._patches.push(Patch.create({
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

    undo: function() {
        this._undoOrRedo('undo');
    }
});

