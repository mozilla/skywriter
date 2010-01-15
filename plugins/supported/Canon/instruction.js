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

var SC = require("sproutcore/runtime").SC;

/**
 * Wrapper for a command execution that the user typed
 */
exports.Instruction = SC.Object.extend({
    output: "",
    _outstanding: 0,
    _callbacks: [],
    completed: false,
    historical: false,

    /**
     *
     */
    init: function() {
        // It is valid to not know the commandLine when we are filling the
        // history from disk, but in that case we don't need to parse it
        if (!this.historical) {
            this.start = new Date();
        } else {
            this.completed = true;
        }
    },

    /**
     * Execute the command
     */
    exec: function() {
        try {
            if (this._parseError) {
                this.addErrorOutput(this._parseError);
            } else {
                this.command.execute(this, this.args, this.command);
            }
        }
        catch (ex) {
            if (ex instanceof TypeError) {
                console.error(ex);
            }
            this.addErrorOutput(ex);
        }
        finally {
            if (this._outstanding == 0) {
                this.completed = true;
                this._callbacks.forEach(function(callback) {
                    callback();
                });
            }
        }
    },

    /**
     * Link Function to Instruction
     * Make a function be part of the thread of execution of an instruction
     */
    link: function(action, context) {
        this._outstanding++;

        return function() {
            try {
                action.apply(context || window, arguments);
            } finally {
                this._outstanding--;

                if (this._outstanding === 0) {
                    this.completed = true;
                    this._callbacks.forEach(function(callback) {
                        callback();
                    });
                }
            }
        }.bind(this);
    },

    /**
     * A hack to allow an instruction that has called link to forget all the
     * linked functions.
     */
    unlink: function() {
        this._outstanding = 0;
        this.completed = true;
        this._callbacks.forEach(function(callback) {
            callback();
        });
    },

    /**
     * A string version of this Instruction suitable for serialization
     */
    toString: function() {
        return JSON.stringify({
            output: this.output,
            start: this.start ? this.start.getTime() : -1,
            end: this.end ? this.end.getTime() : -1
        });
    },

    /**
     * Complete the currently executing command with successful output
     */
    addOutput: function(html) {
        if (html && html !== "") {
            if (this.output !== "") {
                this.output += "<br/>";
            }
            this.output += html;
        }

        this.element = null;
        this.hideOutput = false;
        this.end = new Date();

        this._callbacks.forEach(function(callback) {
            callback(html);
        });
    },

    /**
     * Complete the currently executing command with error output
     */
    addErrorOutput: function(html) {
        this.error = true;
        this.addOutput(html);
    },

    /**
     * Complete the currently executing command with usage output
     * TODO: Why do we need to pass the command in?
     */
    addUsageOutput: function(command) {
        this.error = true;
        var usage = command.usage || "no usage information found for " + command.name;
        this.addOutput("Usage: " + command.name + " " + usage);
    },

    /**
     * Monitor output that goes to an instruction
     */
    onOutput: function(callback) {
        // Catch-up on the output so far
        callback.call(null, this.output);

        this._callbacks.push(callback);

        // TODO: return an element to allow us to unregister the listener
    },

    /**
     * Instead of doing output by appending strings, commands can pass in a
     * DOM node that they update. It is assumed that commands doing this will
     * provide their own progress indicators.
     */
    setElement: function(element) {
        this.element = element;
        this.end = new Date();
        this.hideOutput = false;
        this.error = false;

        this._callbacks.forEach(function(callback) {
            callback();
        });
    }
});
