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

var SC = require("sproutcore/runtime").SC;

/**
 * Store command line history, and keep a pointer to the current command so
 * we can use arrow keys to navigate through the history.
 */
exports.InMemoryHistory = SC.Object.extend({
    instructions: [],
    pointer: 0,
    maxEntries: 50,

    /**
     * It's too complex to observe the internals of this class right now, so
     * instead you should observe this, and only update it via the udpate()
     * function.
     */
    version: 0,

    /**
     * When the history has changed in any way, call this to update the views
     */
    update: function() {
        // The Sproutcore way of doing this.version++
        this.set("version", this.get("version") + 1);
    },

    /**
     * Keep the history to settings.maxEntries
     */
    trim: function() {
        if (this.instructions.length > this.maxEntries) {
            this.instructions.splice(0, this.instructions.length - this.maxEntries);
        }
    },

    /**
     * Add an instruction to our list of things that have been executed
     */
    add: function(instruction) {
        // We previously de-duped here, by comparing what was typed, but that
        // should really be done as a UI sugar on up/down.
        this.instructions.push(instruction);
        this.trim();
        // also make it one past the end so you can go back to it
        this.pointer = this.instructions.length;
        this.save(this.instructions);
    },

    /**
     * Remove an instruction
     */
    remove: function(instruction) {
        var index = this.instructions.indexOf(instruction);
        if (index != -1) {
            this.instructions.splice(index, 1);
        }
    },

    /**
     * Increment the 'current entry' pointer
     */
    next: function() {
        if (this.pointer < this.instructions.length - 1) {
            this.pointer++;
            return this.instructions[this.pointer];
        }
    },

    /**
     * Decrement the 'current entry' pointer
     */
    previous: function() {
        if (this.pointer > 0) {
            this.pointer--;
            return this.instructions[this.pointer];
        }
    },

    /**
     * Move the 'current entry' pointer to the end of the list
     */
    last: function() {
        return this.instructions[this.instructions.length - 1];
    },

    /**
     * Move the 'current entry' pointer to the start of the list
     */
    first: function() {
        return this.instructions[0];
    },

    /**
     * Mutator for our list of instructions
     */
    setInstructions: function(instructions) {
        if (instructions) {
            this.instructions = instructions;
            this.trim();
        } else {
            this.instructions = [];
        }

        // Set the pointer to one past the end so you can go back and hit the
        // last one not the one before last
        this.pointer = this.instructions.length;
    },

    /**
     * Accessor for our store of previous instructions
     */
    getInstructions: function() {
        return this.instructions;
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
 * Store the history in BespinSettings/command.history
 */
exports.ServerHistory = exports.InMemoryHistory.extend({
    requires: {
        hub: "hub",
        files: "files"
    },

    init: function() {
        this.hub.fireAfter([ "authenticated" ], function() {
            // load last 50 instructions from history
            var project = this.files.userSettingsProject;
            this.files.loadContents(project, "command.history", function(file) {
                var typings = file.content.split(/\n/);
                var instructions = [];

                typings.forEach(function(typed) {
                    if (typed && typed !== "") {
                        var instruction = exports.Instruction.create({
                            typed: typed,
                            historical: true
                        });
                        instructions.push(instruction);
                    }
                });

                this.setInstructions(instructions);
            });
        }.bind(this));
    },

    save: function(instructions) {
        var content = "";
        instructions.forEach(function(instruction) {
            if (instruction.typed && instruction.typed !== "") {
                content += instruction.typed + "\n";
            }
        });
        // save instructions back to server asynchronously
        this.files.saveFile(this.files.userSettingsProject, {
            name: "command.history",
            content: content,
            autosave: true,
            timestamp: new Date().getTime()
        });
    }
});

/**
 * Store the history using browser globalStorage
 */
exports.LocalStorageHistory = exports.InMemoryHistory.extend({
    requires: {
        hub: "hub"
    },

    init: function() {
        this.hub.fireAfter([ "authenticated" ], function() {
            if (window.globalStorage) {
                var data = globalStorage[location.hostname].history;
                var instructions = JSON.parse(data);
                this.setInstructions(instructions);
            }
        }.bind(this));
    },

    save: function(instructions) {
        var data = JSON.stringify(instructions);
        if (window.globalStorage) {
            globalStorage[location.hostname].history = data;
        }
    }
});
