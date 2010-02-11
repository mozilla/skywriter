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
var catalog = require("bespin:plugins").catalog;

var env = require("Canon:environment");
var Request = require("Canon:request").Request;

var typehint = require("typehint");
var Input = require("input").Input;

/**
 * Command line controller.
 * <p>Outstanding work
 * - Move hints into tokenize(), split(), etc
 * - Sub commands
 * - Late bound types
 * - aliases
 */
exports.cliController = SC.Object.create({
    /**
     * A string containing the current contents of the command line
     */
    input: "",

    /**
     *
     */
    lastInput: null,

    /**
     * A string, DOM node or (hopefully) SproutCore component that acts as a
     * hint to completing the command line
     */
    hint: "",

    /**
     * A string which is set when there is only one thing that logically come
     * next.
     */
    completion: "",

    /**
     * Is the input in a state where it could possibly work?
     */
    error: false,

    /**
     * Called by the UI to execute a command. Assumes that #input is bound to
     * the CLI input text field.
     */
    exec: function() {
        this.executeCommand(this.get("input"));
    },

    checkInput: function(input) {
        /*
        if (false && input == this.lastInput) {
            return;
        }
        */
        this.lastInput = input;
        this._inputChanged(input);
    },

    /**
     * We need to re-parse the CLI whenever the input changes
     */
    _inputChanged: function(typed) {
        if (typed == "") {
            this.set("hint", "Type a command, see 'help' for available commands.");
            return;
        }

        var input = Input.create({ typed: typed });

        input.tokenize();
        input.split();

        var hintPromise;

        if (input.commandExt) {
            // We know what the command is.
            if (input.parts.length === 1) {
                // There are 2 cases for when there is only one option and we've
                // not started on the parameters.
                var cmdExt = input.commandExt;
                if (input.typed == cmdExt.name ||
                        cmdExt.params == null || cmdExt.params.length === 0) {
                    // Case 1: The input exactly equals the command, or there
                    // are no params to dig into. Use the command help
                    var desc = exports.describeCommandExt(cmdExt);
                    hintPromise = typehint.getHint(input, {
                        param: { type: "text", description: desc },
                        value: input.typed
                    });
                } else {
                    // Case 2: We pressed space, start thinking about the first
                    // parameter.
                    hintPromise = typehint.getHint(input, {
                        param: cmdExt.params[0],
                        value: ""
                    });
                }
            } else {
                input.assign();
                var assignment = input.getAssignmentForLastArg();
                hintPromise = typehint.getHint(input, assignment);
            }
        } else {
            // We don't know what the command is
            // TODO: We should probably cache this
            var commandExts = [];
            catalog.getExtensions("command").forEach(function(commandExt) {
                if (commandExt.description) {
                    commandExts.push(commandExt);
                }
            }.bind(this));

            hintPromise = typehint.getHint(input, {
                param: {
                    type: { name: "selection", data: commandExts },
                    description: "Commands"
                },
                value: input.typed
            });
        }

        this.set("completion", null);

        hintPromise.then(function(hint) {
            SC.run(function() {
                this.set("hint", hint.element);
                this.set("error", hint.error);
                if (hint.completion) {
                    this.set("completion", typed + hint.completion);
                }
            }.bind(this));
        }.bind(this));
    },

    /**
     * Execute a command manually without using the UI
     * @param typed {String} The command to turn into an Instruction and execute
     */
    executeCommand: function(typed) {
        console.log("executeCommand '" + typed + "'");

        if (!typed || typed === "") {
            return;
        }

        var input = Input.create({ typed: typed });

        input.tokenize();
        input.split();

        // Check that there is valid meta-data for this command
        if (!input.commandExt) {
            this.set("hint", "Unknown command");
            return;
        }

        input.assign();

        var self = this;
        var conversion = input.convertTypes();
        conversion.then(function(args) {
            input.commandExt.load(function(command) {
                // Check the function pointed to in the meta-data exists
                if (!command) {
                    self.set("hint", "Command action not found.");
                    return;
                }

                var request = Request.create({
                    command: command,
                    commandExt: input.commandExt,
                    typed: typed,
                    args: args
                });

                try {
                    command(env.global, args, request);

                    // Only clear the input if the command worked
                    self.set("input", "");
                } catch (ex) {
                    // TODO: Better UI
                    self.set("hint", ex);

                    console.group("Error calling command: " + input.commandExt.name);
                    console.log("- typed: '", typed, "'");
                    console.log("- arguments: ", args);
                    console.error(ex);
                    console.trace();
                    console.groupEnd();
                }
            });
        });
    }
});

/**
 * Quick utility to describe a commandExt
 */
exports.describeCommandExt = function(commandExt) {
    return commandExt.name + ": " + commandExt.description;
};
