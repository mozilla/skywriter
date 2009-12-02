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

var bespin = require("index");
var SC = require("sproutcore/runtime").SC;

/**
 * Handle the undo/redo queues for the editor
 */
exports.HistoryManager = SC.Object.extend({
    history: [],
    historyPosition: -1,
    disableAdding: false,

    clear: function() {
        this.history = [];
        this.historyPosition = -1;
        this.disableAdding = false;
    },

    /**
     * returns a range of items. You may then replace them with a bundle that
     * calls them all.
     */
    getRange: function(start, end) {
    },

    /**
     * allows you to replace a range of items with another
     */
    replaceRange: function(start, end, withWhat) {
        this.history.splice(start, end - start + 1, withWhat);
    },

    /**
     * removes every entry AFTER the given entry (keeps that entry)
     */
    truncate: function(keepUntil) {
        this.history.length = keepUntil + 1;
        this.historyPosition = Math.min(this.historyPosition, this.history.length - 1);
    },

    getCurrent: function() {
        return this.historyPosition;
    },

    undo: function() {
        if (this.historyPosition < 0) {
            return; //cannot undo
        }

        //undo current action, and decrement position
        var current = this.history[this.historyPosition];

        // don't let others add
        this.disableAdding = true;

        // DO IT! But carefully, as we don't want a crash to permanently disable add()
        try {
            current.undo();
        } catch (e) {
            console.error("There was an error in an undo action: ");
            console.error(e);
        }

        // allow them to add again
        this.disableAdding = false;

        //and decrement
        this.historyPosition--;
    },

    redo: function() {
        if (this.historyPosition >= this.history.length - 1) {
            return; // cannot redo
        }

        // redo next action, and increment count
        var next = this.history[this.historyPosition + 1];

        // don't let others add
        this.disableAdding = true;

        // DO IT! But carefully, as we don't want a crash to permanently disable add()
        try {
            next.redo();
        } catch (e) {
            console.error("There was an error in an undo action: ");
            console.error(e);
        }

        // allow them to add again
        this.disableAdding = false;

        //and increment
        this.historyPosition++;
    },

    add: function(item) {
        if (this.disableAdding) {
            return;
        }

        // make sure we truncate any newer items
        this.history.length = this.historyPosition + 1;
        this.history.push(item);
        this.historyPosition++;
    },

    canUndo: function() {
        return this.historyPosition > -1;
    },

    canRedo: function() {
        return this.historyPosition < this.history.length - 1;
    }
});

/**
 *
 */
bespin.subscribe("editor:openfile:opensuccess", function() {
    bespin.get('editor').historyManager.clear();
});
