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

var Promise = require("bespin:promise").Promise;
var groupPromises = require("bespin:promise").group;
var types = require("Types:types");
var env = require("Canon:environment");
var Request = require("Canon:request").Request;

var typehint = require("typehint");
var tokenizer = require("tokenizer").tokenizer;

/**
 * Command line controller.
 */
exports.cliController = SC.Object.create({
    /**
     * A string containing the current contents of the command line
     */
    input: "",

    /**
     * A string, DOM node or (hopefully) SproutCore component that acts as a
     * hint to completing the command line
     */
    hint: "",

    hintChanges: function() {
        console.log("hint", this.hint);
    }.observes(".hint"),

    /**
     * We need to re-parse the CLI whenever the input changes
     */
    inputChanges: function() {
        if (this.input == "") {
            this.set("hint", "Type a command, see 'help' for available commands.");
            return;
        }

        var parts = tokenizer(this.input);
        var cmdExts = this._findMatchingCommandExtensions(parts);
        var hintPromise;

        if (cmdExts.length === 0) {
            // TODO: Before we assume that this is an error, we ought to
            // search again for aliases, and then again for hidden commands

            // The prefix can't be completed into a command, so it's wrong
            hintPromise = typehint.getHint({
                type: "text",
                description: "No commands available"
            });
        }
        else if (cmdExts.length === 1) {
            hintPromise = typehint.getHint({
                type: "text",
                description: "Only option: " + cmdExts[0].name
            });
        }
        else {
            var options = [];
            cmdExts.forEach(function(cmdExt) {
                options.push(cmdExt.name);
            }.bind(this));

            hintPromise = typehint.getHint({
                type: { name: "selection", data: options },
                description: "Commands: "
            });
        }

        hintPromise.then(function(hint) {
            this.set("hint", hint);
        }.bind(this));
    }.observes(".input"),

    /**
     * Called by the UI to execute a command. Assumes that #input is bound to
     * the CLI input text field.
     */
    exec: function() {
        this.executeCommand(this.get("input"));
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

        var parts = tokenizer(typed);
        var cmdArgs = this._splitCommandAndArgs(parts);

        // Check that there is valid meta-data for this command
        if (!cmdArgs.commandExt) {
            this.set("hint", "Unknown command");
            return;
        }

        var self = this;
        var conversion = this._convertTypes(cmdArgs.commandExt, cmdArgs.remainder);
        conversion.then(function(args) {
            cmdArgs.commandExt.load(function(command) {
                // Check the function pointed to in the meta-data exists
                if (!command) {
                    self.set("hint", "Command action not found.");
                    return;
                }

                var request = Request.create({
                    command: command,
                    commandExt: cmdArgs.commandExt,
                    typed: typed,
                    args: args
                });

                try {
                    command(env.global, args, request);

                    // Only clear the input if the command worked
                    self.set("input", "");
                } catch (ex) {
                    // TODO: Better UI
                    this.set("hint", ex);

                    console.group("Error calling command: " + cmdArgs.commandExt.name);
                    console.log("- typed: '", typed, "'");
                    console.log("- arguments: ", args);
                    console.error(ex);
                    console.trace();
                    console.groupEnd();
                }
            });
        });
    },

    /**
     * Convert the passed string array into an args object as specified by the
     * command.params declaration.
     */
    _convertTypes: function(commandExt, argInputs) {
        // Use {} when there are no params
        if (!commandExt.params) {
            var promise = new Promise();
            promise.resolve({});
            return promise;
        }

        // The data we pass to the command
        var argOutputs = {};
        // Which arg are we converting
        var index = 0;
        // Cache of promises, because we're only done when they're done
        var convertPromises = [];

        commandExt.params.forEach(function(param) {
            var argInput = this._getValueForParam(param, index, argInputs);

            var convertPromise = types.fromString(argInput, param.type);
            convertPromise.then(function(converted) {
                argOutputs[param.name] = converted;
            });
            convertPromises.push(convertPromise);
        }.bind(this));

        var reply = new Promise();
        var group = groupPromises(convertPromises);
        group.then(function() {
            reply.resolve(argOutputs);
        });
        return reply;
    },

    /**
     * Extract a value from the set of inputs for a given param.
     */
    _getValueForParam: function(param, index, argInputs) {
        var defaultValue = (param.defaultValue !== undefined)
                ? param.defaultValue : null;
        var argInput = argInputs.length > index ? argInputs[index] : defaultValue;
        return argInput;
    },

    /**
     * Looks in the catalog for a command extension that matches what has been
     * typed at the command line.
     */
    _splitCommandAndArgs: function(parts) {
        // TODO: Something that doesn't assume no sub-commands:
        parts = parts.slice();
        var initial = parts.shift();
        return {
            commandExt: catalog.getExtensionByKey("command", initial),
            remainder: parts
        };
    },

    /**
     * Loop through the commands in the canon, looking for something that
     * matches according to #_commandMatches, and return that.
     */
    _findMatchingCommandExtensions: function(parts) {
        var commandExts = catalog.getExtensions("command");
        var matches = [];
        commandExts.some(function(commandExt) {
            if (this._commandMatches(commandExt, parts)) {
                matches.push(commandExt);
            }
        }.bind(this));
        return matches;
    },

    /**
     * Does the typed command match this command extension.
     * TODO: upgrade for sub-commands
     */
    _commandMatches: function(commandExt, parts) {
        if (!commandExt.description) {
            return false;
        }

        if (commandExt.hidden) {
            return false;
        }

        var prefix = commandExt.name.substring(0, parts[0].length);
        if (prefix !== parts[0]) {
            return false;
        }

        return true;
    }
});
