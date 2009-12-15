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
var command = require("command");

/**
 * Wrapper for something that the user typed
 */
exports.Instruction = SC.Object.extend({
    typed: null,
    output: "",
    _outstanding: 0,
    _callbacks: [],
    completed: false,
    historical: false,
    canon: null,

    /**
     *
     */
    init: function() {
        this.typed = this.typed.trim();

        // It is valid to not know the commandLine when we are filling the
        // history from disk, but in that case we don't need to parse it
        if (!this.historical) {
            this.start = new Date();
            var ca = this._splitCommandAndArgs(command.rootCanon, this.typed);
            if (ca) {
                this.command = ca[0];
                this.args = ca[1];
            }
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

                if (this._outstanding == 0) {
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
            typed: this.typed,
            output: this.output,
            start: this.start ? this.start.getTime() : -1,
            end: this.end ? this.end.getTime() : -1
        });
    },

    /**
     * Complete the currently executing command with successful output
     */
    addOutput: function(html) {
        if (html && html != "") {
            if (this.output != "") {
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
    },

    /**
     * Split Command and Args
     * Private method to chop up the typed command
     */
    _splitCommandAndArgs: function(canon, typed, parent) {
        var data = typed.split(/\s+/);
        var commandname = data.shift();

        var command;
        var argstr = data.join(' ');

        if (canon.commands[commandname]) {
            command = canon.commands[commandname];
        } else if (canon.aliases[commandname]) {
            var alias = canon.aliases[commandname].split(' ');
            var aliascmd = alias.shift();
            if (alias.length > 0) {
                argstr = alias.join(' ') + ' ' + argstr;
            }
            command = canon.commands[aliascmd];
        } else {
            if (commandname == "") {
                this._parseError = "Missing " + (parent == null ? "command" : "subcommand") + ".<br/>";
            } else {
                this._parseError = "Sorry, no " + (parent == null ? "command" : "subcommand") + " '" + commandname + "'.<br/>";
            }

            // Sometime I hate JavaScript ...
            var length = 0;
            for (command in canon.commands) {
                length++;
            }

            // TODO: consider promoting this somewhere
            var linkup = function(exec) {
                var script = "bespin.get(\"commandLine\").executeCommand(\"" + exec + "\");";
                return "<a href='javascript:" + script + "'>" + exec + "</a>";
            };

            if (length <= 30) {
                this._parseError += "Try one of: ";
                for (command in canon.commands) {
                    this._parseError += canon.commands[command].name + ", ";
                }
                if (parent != null) {
                    this._parseError += "<br/>Or use '" + linkup(parent.name + " help") + "'.";
                } else {
                    this._parseError += "<br/>Or use '" + linkup("help") + "'.";
                }
            } else {
                if (parent != null) {
                    this._parseError += "Use '" + linkup(parent.name + " help") + "' to enumerate commands.";
                } else {
                    this._parseError += "Use '" + linkup("help") + "' to enumerate commands.";
                }
            }

            return null;
        }

        if (command.subcommands) {
            if (data.length < 1 || !data[0]) {
                argstr = command.subcommanddefault || 'help';
            }
            return this._splitCommandAndArgs(command.subcommands, argstr, command);
        }

        return [command, canon.getArgs(argstr.split(' '), command)];
    }
});
