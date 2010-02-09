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

    /**
     * Called by the UI to execute a command. Assumes that #input is bound to
     * the CLI input text field.
     */
    exec: function() {
        this.executeCommand(this.get("input"));
    },

    /**
     * Logging to debug the hint
     */
    _hintChanges: function() {
        console.log("hint", this.hint);
    }.observes(".hint"),

    /**
     * We need to re-parse the CLI whenever the input changes
     */
    _inputChanges: function() {
        if (this.input == "") {
            this.set("hint", "Type a command, see 'help' for available commands.");
            return;
        }

        var input = {
            typed: this.input,
            hints: []
        };

        this._tokenize(input);
        this._split(input);

        var hintPromise;

        // 4. Move hints into _tokenize, _split, etc

        if (input.commandExt) {
            // We know what the command is.
            if (input.parts.length === 1) {
                // We've not started on any params yet, help on the command
                hintPromise = typehint.getHint({
                    type: "text",
                    description: input.commandExt.name + ": " + input.commandExt.description
                });
            } else {
                hintPromise = typehint.getHint({
                    type: "text",
                    description: "We should be able to get help on " + input.parts.join(":")
                });
            }
        }
        else if (input.commandExts.length === 0) {
            // TODO: Before we assume that this is an error, we ought to
            // search again for aliases, and then again for hidden commands

            // The prefix can't be completed into a command, so it's wrong
            hintPromise = typehint.getHint({
                type: "text",
                description: "No commands available"
            });
        }
        else {
            var options = [];
            input.commandExts.forEach(function(cmdExt) {
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
     * Execute a command manually without using the UI
     * @param typed {String} The command to turn into an Instruction and execute
     */
    executeCommand: function(typed) {
        console.log("executeCommand '" + typed + "'");

        if (!typed || typed === "") {
            return;
        }

        var input = {
            typed: typed,
            hints: []
        };

        this._tokenize(input);
        this._split(input);

        // Check that there is valid meta-data for this command
        if (!input.commandExt) {
            this.set("hint", "Unknown command");
            return;
        }

        this._assign(input);

        var self = this;
        var conversion = this._convertTypes(input);
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
                    this.set("hint", ex);

                    console.group("Error calling command: " + input.commandExt.name);
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
     * Split up the input taking into account ' and "
     */
    _tokenize: function(input) {
        var incoming = input.typed.split(" ");
        input.parts = [];

        var nextToken;
        while (nextToken = incoming.shift()) {
            if (nextToken[0] == '"' || nextToken[0] == "'") {
                // It's quoting time
                var eaten = [ nextToken.substring(1, nextToken.length) ];
                var eataway;
                while (eataway = incoming.shift()) {
                    if (eataway[eataway.length - 1] == '"' ||
                            eataway[eataway.length - 1] == "'") {
                        // End quoting time
                        eaten.push(eataway.substring(0, eataway.length - 1));
                        break;
                    } else {
                        eaten.push(eataway);
                    }
                }
                input.parts.push(eaten.join(' '));
            } else {
                input.parts.push(nextToken);
            }
        }
    },

    /**
     * Looks in the catalog for a command extension that matches what has been
     * typed at the command line.
     */
    _split: function(input) {
        // TODO: Something that doesn't assume no sub-commands:
        input.unparsedArgs = input.parts.slice(); // clone it
        var initial = input.unparsedArgs.shift();

        var commandExt = catalog.getExtensionByKey("command", initial);

        if (commandExt) {
            // We have an exact match
            input.commandExt = commandExt;
        } else {
            // Several matches
            var allCommandExts = catalog.getExtensions("command");
            input.commandExts = [];
            allCommandExts.some(function(commandExt) {
                if (this._commandMatches(commandExt, input.parts)) {
                    input.commandExts.push(commandExt);
                }
            }.bind(this));
        }
    },

    /**
     * Work out which arguments are applicable to which parameters
     */
    _assign: function(input) {
        // TODO: something smarter than just assuming that they are all in order
        input.untypedArgs = {};
        var index = 0;

        input.commandExt.params.forEach(function(param) {
            var value = this._getValueForParam(param, index, input, undefined);

            // Warning null != undefined. See docs for _getValueForParam()
            if (value !== undefined) {
                input.untypedArgs[param] = {
                    value: value,
                    param: param,
                    index: index
                };
            }

            index++;
        }.bind(this));
    },

    /**
     * Convert the passed string array into an args object as specified by the
     * command.params declaration.
     */
    _convertTypes: function(input) {
        // Use {} when there are no params
        if (!input.commandExt.params) {
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

        input.commandExt.params.forEach(function(param) {
            var value = this._getValueForParam(param, index, input, param.defaultValue);

            // Warning null != undefined. See docs for _getValueForParam()
            if (value === undefined) {
                // Add an error hint
            }
            var convertPromise = types.fromString(value, param.type);
            convertPromise.then(function(converted) {
                argOutputs[param.name] = converted;
            });
            convertPromises.push(convertPromise);

            index++;
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
     * @param param The param that we are providing a value for. This is taken
     * from the command meta-data for the commandExt in question.
     * @param index The number of the param - i.e. the index of <tt>param</tt>
     * into the original params array.
     * @param input The data from parsing the command line input
     * @param defaultValue The value to use if no data has been provided in the
     * input. This will be either <tt>param.defaultValue</tt> to use the value
     * specified in the meta-data (useful in actual command execution). Or it
     * might be <tt>undefined</tt> when we're providing hints as we go along and
     * are only interested in what the user actually typed. It is common for
     * params to specify <tt>param.defaultValue = null</tt> to denote that the
     * parameter is optional.
     * @return The value for the specified parameter or <tt>defaultValue</tt>
     * if none could be assigned.
     */
    _getValueForParam: function(param, index, input, defaultValue) {
        // TODO: something to take into account --params.
        if (input.unparsedArgs.length > index) {
            return input.unparsedArgs[index];
        } else {
            return defaultValue;
        }
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
