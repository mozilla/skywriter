/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the 'License'); you may not use this file except in compliance with
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

var SC = require("sproutcore/runtime").SC;

var history = require("canon:request").history;

/**
 * Store command line history, and keep a pointer to the current command so
 * we can use arrow keys to navigate through the history.
 */
exports.InMemoryHistory = SC.Object.extend({
    pointer: 0,

    /**
     * Add an instruction to our list of things that have been executed
     */
    requestsChanged: function() {
        this.pointer = history.requests.length;
    }.observes("canon:request#history.requests.[]"),

    /**
     * Increment the 'current entry' pointer
     */
    next: function() {
        if (this.pointer < history.requests.length) {
            this.pointer++;
        }

        if (this.pointer == history.requests.length) {
            return "";
        } else {
            return history.requests[this.pointer].typed;
        }
    },

    /**
     * Decrement the 'current entry' pointer
     */
    previous: function() {
        if (this.pointer > 0) {
            this.pointer--;
        }

        if (this.pointer == history.requests.length) {
            return "";
        } else {
            return history.requests[this.pointer].typed;
        }
    },

    /**
     * Mutator for our list of instructions
     */
    setInstructions: function(instructions) {
        if (instructions) {
            history.requests = instructions;
        } else {
            history.requests = [];
        }

        // Set the pointer to one past the end so you can go back and hit the
        // last one not the one before last
        this.pointer = history.requests.length;
    },

    /**
     * Accessor for our store of previous instructions
     */
    getInstructions: function() {
        return history.requests;
    },

    /**
     * Persist the instruction history.
     * <p>Does nothing in this implementation. See a subclass for an
     * implementation of this method.
     */
    save: function(instructions) {
        // Don't save in the basic implementation
    }
});

/**
 * Store the history using browser globalStorage
 */
exports.LocalStorageHistory = exports.InMemoryHistory.extend({
    init: function() {
        if (window.globalStorage) {
            var data = globalStorage[location.hostname].history;
            var instructions = JSON.parse(data);
            this.setInstructions(instructions);
        }
    },

    save: function(instructions) {
        var data = JSON.stringify(instructions);
        if (window.globalStorage) {
            globalStorage[location.hostname].history = data;
        }
    }
});
