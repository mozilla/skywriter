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

var hint = require("hint");
var typehint = require("typehint");

/**
 * An object used during command line parsing to hold the various intermediate
 * data steps.
 * <p>Part of the contract of Input objects is that they NOT be observed. This
 * is a temporary object and we don't want the overhead of using get() and set()
 */
exports.Input = SC.Object.extend({
    /**
     * The instruction as typed by the user so far
     */
    typed: null,

    /**
     * Once tokenize() has been called, we have the #typed string cut up into
     * #parts
     */
    parts: null,

    /**
     * Once split has been called we have #parts split into #unparsedArgs and
     * #commandExt (if there is a matching command).
     */
    unparsedArgs: null,

    /**
     * If #typed specifies a command to execute, this is that commands metadata
     */
    commandExt: null,

    /**
     * Assign matches #unparsedArgs to the params declared by the #commandExt
     */
    assignments: null,

    /**
     * Check 'typed' input. Possibly overkill.
     */
    init: function() {
        if (this.typed === null) {
            throw new Error("Input requires something 'typed' to work on");
        }
    },

    /**
     * Split up the input taking into account ' and "
     */
    tokenize: function() {
        var incoming = this.typed.split(" ");
        this.parts = [];

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
                this.parts.push(eaten.join(' '));
            } else {
                this.parts.push(nextToken);
            }
        }
    },

    /**
     * Looks in the catalog for a command extension that matches what has been
     * typed at the command line.
     */
    split: function() {
        // TODO: Something that doesn't assume no sub-commands:
        this.unparsedArgs = this.parts.slice(); // clone it
        var initial = this.unparsedArgs.shift();

        var commandExt = catalog.getExtensionByKey("command", initial);

        if (commandExt) {
            // We have an exact match
            this.commandExt = commandExt;
        }

        var hintPromise = new Promise();

        if (this.commandExt) {
            // We know what the command is.
            if (this.parts.length === 1) {
                // There are 2 cases for when there is only one option and we've
                // not started on the parameters.
                var cmdExt = this.commandExt;
                if (this.typed == cmdExt.name ||
                        !cmdExt.params || cmdExt.params.length === 0) {
                    // Case 1: The input exactly equals the command, or there
                    // are no params to dig into. Use the command help
                    var desc = exports.describeCommandExt(cmdExt);
                    hintPromise = typehint.getHint(this, {
                        param: { type: "text", description: desc },
                        value: this.typed
                    });
                } else {
                    // Case 2: We pressed space, start thinking about the first
                    // parameter.
                    hintPromise = typehint.getHint(this, {
                        param: cmdExt.params[0],
                        value: ""
                    });
                }
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

            hintPromise = typehint.getHint(this, {
                param: {
                    type: { name: "selection", data: commandExts },
                    description: "Commands"
                },
                value: this.typed
            });
        }

        return hintPromise;
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
    },

    /**
     * Work out which arguments are applicable to which parameters.
     * <p>This takes #commandExt.params and #unparsedArgs and creates a map of
     * param names to 'assignment' objects, which have the following properties:
     * <ul>
     * <li>param - The matching parameter.
     * <li>index - Zero based index into where the match came from on the input
     * <li>value - The matching input
     * </ul>
     * The resulting #assignments member created by this function is a map of
     * assignment.param.name to assignment
     */
    assign: function() {
        // TODO: something smarter than just assuming that they are all in order
        this.assignments = {};
        var params = this.commandExt.params;

        if (!params || params.length == 0) {
            // This command does not take parameters
            if (this.unparsedArgs.length != 0) {
                return [hint.Hint.create({
                    level: hint.Level.Error,
                    element: this.commandExt.name + " does not take any parameters."
                })];
            }
            return [];
        }

        var hints = [];
        var index = 0;
        params.forEach(function(param) {
            var localHints = this._assignParam(param, index++);

            localHints.forEach(function(hint) {
                hints.push(hint);
            });
        }.bind(this));

        this.unparsedArgs.forEach(function(unparsedArg) {
            if (!unparsedArg.used) {
                hints.push(hint.Hint.create({
                    level: hint.Level.Error,
                    element: "Parameter '" + unparsedArg + "' makes no sense."
                }));
            }
        });

        return hints;
    },

    /**
     * Extract a value from the set of inputs for a given param.
     * @param param The param that we are providing a value for. This is taken
     * from the command meta-data for the commandExt in question.
     * @param index The number of the param - i.e. the index of <tt>param</tt>
     * into the original params array.
     */
    _assignParam: function(param, index) {
        var params = this.commandExt.params;

        // Special case: there is only 1 parameter, and that's of type text
        // so we can put all the params into the first param
        if (index == 0 && params.length == 1 && params[0].type == "text") {
            // Warning: There is some potential problem here if spaces are
            // significant. It might be better to chop the command of the
            // start of this.typed?
            this.assignments[params[0].name] = {
                value: this.unparsedArgs.join(" "),
                param: params[0],
                index: 0
            };

            this.unparsedArgs.forEach(function(unparsedArg) {
                unparsedArg.used = true;
            });

            return [];
        }

        var hints = [];

        // TODO: something to take into account --params.
        // 1.  Do we have any --params specifiers for this param?
        //     If so use it and ignore everything else. Done.
        // 2a. Remove all --params
        // 2b. Use the index to get at the param we want
        // 3.  How do we special case the last param?

        var value;
        if (this.unparsedArgs.length > index) {
            value = this.unparsedArgs[index];
        } else {
            value = defaultValue;
        }

        // Warning null != undefined. See docs for _assignParam()
        if (value !== undefined) {
            this.assignments[param.name] = {
                value: value,
                param: param,
                index: index
            };
        } else {
            this.assignments[param.name] = {
                param: param,
                index: index
            };

            if (param.defaultValue === undefined) {
                // There is no default, and we've not supplied one so far
                hints.push(hint.Hint.create({
                    level: hint.Level.Incomplete,
                    element: "Missing parameter: " + param.name
                }));
            }
        }

        return hints;
    },

    /**
     * Get the parameter, index and value for the last thing the user typed
     * @see _assign()
     */
    getAssignmentForLastArg: function() {
        var highestAssign;
        for (var name in this.assignments) {
            var assign = this.assignments[name];
            if (!highestAssign || assign.index > highestAssign.index) {
                highestAssign = assign;
            }
        }
        return highestAssign;
    },

    /**
     * Convert the passed string array into an args object as specified by the
     * command.params declaration.
     */
    convertTypes: function() {
        // Use {} when there are no params
        if (!this.commandExt.params) {
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

        for (var name in this.assignments) {
            if (this.assignments.hasOwnProperty(name)) {
                var assignment = this.assignments[name];
                var param = assignment.param;

                var value = assignment.value;
                if (value === undefined) {
                    value = param.defaultValue;
                }

                if (value !== undefined) {
                    var convertPromise = types.fromString(value, param.type);
                    convertPromise.then(function(converted) {
                        assignment.converted = converted;
                        argOutputs[param.name] = converted;
                    }, function(error) {
                        assignment.hint = hint.Hint.create({
                            level: hint.Level.Error,
                            element: "Can't convert '" + value + "' to a " +
                                param.type + ": " + error
                        });
                    });
                    convertPromises.push(convertPromise);

                    index++;
                }
            }
        }

        var reply = new Promise();
        var group = groupPromises(convertPromises);
        group.then(function() {
            reply.resolve(argOutputs);
        });
        return reply;
    }
});

/**
 * Quick utility to describe a commandExt
 */
exports.describeCommandExt = function(commandExt) {
    return commandExt.name + ": " + commandExt.description;
};
