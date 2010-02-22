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
        this._hints = [];
        this._argsPromise = new Promise();
        this._alive = true;
    },

    /**
     * Go through the input checking and generating hints, and if possible an
     * arguments array.
     * @return An object that contains a set of hints and hintPromises, and
     * a promise of a argument object if the parse succeeds.
     */
    parse: function() {
        var success = false;

        // Cut up the input into parts
        if (this._tokenize()) {
            // Split the command from the args
            if (this._split()) {
                // Assign input to declared parameters
                if (this._assign()) {
                    // Convert input into declared types
                    if (this._convertTypes()) {
                        success = true;
                    }
                }
            }
        }

        // Something failed, so the argsPromise wont complete. Kill it
        if (!success) {
            this._argsPromise.reject();
        }

        return {
            hints: this._hints,
            argsPromise: this._argsPromise
        };
    },

    /**
     * Request early termination - the results of the current parse will not
     * be used.
     */
    cancel: function() {
        this._alive = false;
    },

    /**
     * Split up the input taking into account ' and "
     */
    _tokenize: function() {
        if (this.typed == "") {
            this._hints.push(hint.Hint.create({
                level: hint.Level.Incomplete,
                element: "Type a command, see 'help' for available commands."
            }));
            return false;
        }

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

        return true;
    },

    /**
     * Looks in the catalog for a command extension that matches what has been
     * typed at the command line.
     */
    _split: function() {
        // TODO: Something that doesn't assume no sub-commands:
        this.unparsedArgs = this.parts.slice(); // clone it
        var initial = this.unparsedArgs.shift();

        var commandExt = catalog.getExtensionByKey("command", initial);

        if (commandExt) {
            // We have an exact match
            this.commandExt = commandExt;
        }

        var hintSpec;

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
                    hintSpec = {
                        param: {
                            type: "text",
                            description: exports.describeCommandExt(cmdExt)
                        },
                        value: this.typed
                    };
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

            hintSpec = {
                param: {
                    type: { name: "selection", data: commandExts },
                    description: "Commands"
                },
                value: this.typed
            };
        }

        if (hintSpec) {
            var hintPromise = typehint.getHint(this, hintSpec);
            this._hints.push(hintPromise);
        }

        return this.commandExt != null;
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
    _assign: function() {
        // TODO: something smarter than just assuming that they are all in order
        this.assignments = {};
        var params = this.commandExt.params;

        if (!params || params.length == 0) {
            // This command does not take parameters
            if (this.unparsedArgs.length != 0) {
                this._hints.push(hint.Hint.create({
                    level: hint.Level.Error,
                    element: this.commandExt.name + " does not take any parameters."
                }));
                return false;
            }
            params = [];
        }

        var index = 0;
        var used = [];
        params.forEach(function(param) {
            this._assignParam(param, index++, used);
        }.bind(this));

        // Check there are no params that don't fit
        var unparsed = false;
        this.unparsedArgs.forEach(function(unparsedArg) {
            if (used.indexOf(unparsedArg) == -1) {
                this._hints.push(hint.Hint.create({
                    level: hint.Level.Error,
                    element: "Parameter '" + unparsedArg + "' makes no sense."
                }));
                unparsed = true;
            }
        }.bind(this));
        if (unparsed) {
            return false;
        }

        var assignment = this._getAssignmentForLastArg();
        if (assignment) {
            var hintPromise = typehint.getHint(this, assignment);
            this._hints.push(hintPromise);
        }

        return true;
    },

    /**
     * Extract a value from the set of inputs for a given param.
     * @param param The param that we are providing a value for. This is taken
     * from the command meta-data for the commandExt in question.
     * @param index The number of the param - i.e. the index of <tt>param</tt>
     * into the original params array.
     */
    _assignParam: function(param, index, used) {
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
                used.push(unparsedArg);
            });

            return true;
        }

        // TODO: something to take into account --params.
        // 1.  Do we have any --params specifiers for this param?
        //     If so use it and ignore everything else. Done.
        // 2a. Remove all --params
        // 2b. Use the index to get at the param we want
        // 3.  How do we special case the last param?

        var value;
        if (this.unparsedArgs.length > index) {
            value = this.unparsedArgs[index];
            used.push(this.unparsedArgs[index]);
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
                this._hints.push(hint.Hint.create({
                    level: hint.Level.Incomplete,
                    element: "Missing parameter: " + param.name
                }));
            }
        }

        return true;
    },

    /**
     * Get the parameter, index and value for the last thing the user typed
     * @see _assign()
     */
    _getAssignmentForLastArg: function() {
        var highestAssign;
        for (var name in this.assignments) {
            var assign = this.assignments[name];
            if (!highestAssign || assign.value) {
                highestAssign = assign;
            }
        }
        return highestAssign;
    },

    /**
     * Convert the passed string array into an args object as specified by the
     * command.params declaration.
     */
    _convertTypes: function() {
        // Use {} when there are no params
        if (!this.commandExt.params) {
            return;
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

                var hintPromise = new Promise();
                this._hints.push(hintPromise);

                if (value !== undefined) {
                    var convertPromise = types.fromString(value, param.type);
                    convertPromise.then(function(converted) {
                        assignment.converted = converted;
                        argOutputs[param.name] = converted;
                        hintPromise.resolve(null);
                    }, function(error) {
                        hintPromise.resolve(hint.Hint.create({
                            level: hint.Level.Error,
                            element: "Can't convert '" + value + "' to a " +
                                param.type + ": " + error
                        }));
                    });
                    convertPromises.push(convertPromise);

                    index++;
                }
            }
        }

        groupPromises(convertPromises).then(function() {
            this._argsPromise.resolve(argOutputs);
        }.bind(this));

        return true;
    }
});

/**
 * Quick utility to describe a commandExt
 */
exports.describeCommandExt = function(commandExt) {
    return commandExt.name + ": " + commandExt.description;
};
