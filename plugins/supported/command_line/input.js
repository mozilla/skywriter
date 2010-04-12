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
var catalog = require("bespin:plugins").catalog;
var console = require('bespin:console').console;
var Promise = require("bespin:promise").Promise;
var groupPromises = require("bespin:promise").group;
var Trace = require('bespin:util/stacktrace').Trace;

var types = require("types:types");
var keyboard = require('canon:keyboard');

var hint = require("command_line:hint");
var typehint = require("command_line:typehint");

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
    typed: undefined,

    /**
     * The global environment (as passed to the commands) to be passed to the
     * various completion systems.
     */
    env: undefined,

    /**
     * Flags for us to check against the predicates specified with the commands
     */
    flags: undefined,

    /**
     * Once tokenize() has been called, we have the #typed string cut up into
     * #_parts
     */
    _parts: undefined,

    /**
     * Once split has been called we have #_parts split into #_unparsedArgs and
     * #commandExt (if there is a matching command).
     */
    _unparsedArgs: undefined,

    /**
     * If #typed specifies a command to execute, this is that commands metadata
     */
    _commandExt: undefined,

    /**
     * Assign matches #_unparsedArgs to the params declared by the #_commandExt
     * A list of arguments in commandExt.params order
     */
    _assignments: undefined,

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

        try {
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
                this._argsPromise.reject(new Error("Parse error"));
            }
        } catch (ex) {
            var trace = new Trace(ex, true);
            console.group('Error calling command: ' + this.typed);
            console.error(ex);
            trace.log(3);
            console.groupEnd();
            this._argsPromise.reject(ex);
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
        if (!this.typed || this.typed === "") {
            /*
            // We would like to put some initial help here, but for anyone but
            // a complete novice a "type help" message is very annoying, so we
            // need to find a way to only display this message once, or for
            // until the user click a 'close' button or similar
            this._hints.push(hint.Hint.create({
                level: hint.Level.Incomplete,
                element: "Type a command, see 'help' for available commands."
            }));
            */
            return false;
        }

        var incoming = this.typed.trimLeft().split(/\s+/);
        this._parts = [];

        var nextToken;
        while (true) {
            nextToken = incoming.shift();
            if (SC.none(nextToken)) {
                break;
            }
            if (nextToken[0] == '"' || nextToken[0] == "'") {
                // It's quoting time
                var eaten = [ nextToken.substring(1, nextToken.length) ];
                var eataway;
                while (true) {
                    eataway = incoming.shift();
                    if (!eataway) {
                        break;
                    }
                    if (eataway[eataway.length - 1] == '"' ||
                            eataway[eataway.length - 1] == "'") {
                        // End quoting time
                        eaten.push(eataway.substring(0, eataway.length - 1));
                        break;
                    } else {
                        eaten.push(eataway);
                    }
                }
                this._parts.push(eaten.join(' '));
            } else {
                this._parts.push(nextToken);
            }
        }

        return true;
    },

    /**
     * Looks in the catalog for a command extension that matches what has been
     * typed at the command line.
     */
    _split: function() {
        this._unparsedArgs = this._parts.slice(); // aka clone()
        var initial = this._unparsedArgs.shift();
        var commandExt;

        while (true) {
            commandExt = catalog.getExtensionByKey('command', initial);

            if (!commandExt) {
                // Not found. break with commandExt == null
                break;
            }

            if (!keyboard.flagsMatch(commandExt.predicates, this.flags)) {
                // If the predicates say 'no match' then go LA LA LA
                commandExt = null;
                break;
            }

            if (commandExt.pointer) {
                // Valid command, break with commandExt valid
                break;
            }

            // commandExt, but no pointer - this must be a sub-command
            initial += " " + this._unparsedArgs.shift();
        }

        this._commandExt = commandExt;

        // Do we know what the command is.
        var hintSpec = null;
        if (this._commandExt) {
            // Load the command to check that it will load
            var loadPromise = new Promise();
            commandExt.load().then(function(command) {
                if (command) {
                    loadPromise.resolve(null);
                } else {
                    loadPromise.resolve(hint.Hint.create({
                        level: hint.Level.Error,
                        element: "Failed to load command " + commandExt.name +
                            ": Pointer " + commandExt._pluginName + ":" + commandExt.pointer + " is null."
                    }));
                    console.log(commandExt);
                }
            }, function(ex) {
                loadPromise.resolve(hint.Hint.create({
                    level: hint.Level.Error,
                    element: "Failed to load command " + commandExt.name +
                        ": Pointer " + commandExt._pluginName + ":" + commandExt.pointer + " failed to load." + ex
                }));
            });
            this._hints.push(loadPromise);

            // The user hasn't started to type any params
            if (this._parts.length === 1) {
                var cmdExt = this._commandExt;
                if (this.typed == cmdExt.name ||
                        !cmdExt.params || cmdExt.params.length === 0) {
                    hintSpec = exports.documentCommand(cmdExt, this.typed);
                }
            }
        } else {
            // We don't know what the command is
            // TODO: We should probably cache this
            var commandExts = [];
            catalog.getExtensions('command').forEach(function(commandExt) {
                if (keyboard.flagsMatch(commandExt.predicates, this.flags) &&
                        commandExt.description) {
                    commandExts.push(commandExt);
                }
            }.bind(this));

            hintSpec = {
                param: {
                    type: { name: 'selection', data: commandExts },
                    description: 'Commands'
                },
                value: this.typed
            };
        }

        if (hintSpec) {
            var hintPromise = typehint.getHint(this, hintSpec);
            this._hints.push(hintPromise);
        }

        return !SC.none(this._commandExt);
    },

    /**
     * Work out which arguments are applicable to which parameters.
     * <p>This takes #_commandExt.params and #_unparsedArgs and creates a map of
     * param names to 'assignment' objects, which have the following properties:
     * <ul>
     * <li>param - The matching parameter.
     * <li>index - Zero based index into where the match came from on the input
     * <li>value - The matching input
     * </ul>
     * The resulting #_assignments member created by this function is a list of
     * assignments of arguments in commandExt.params order.
     * TODO: _unparsedArgs should be a list of objects that contain the following
     * values: name, param (when assigned) and maybe hints?
     */
    _assign: function() {
        // TODO: something smarter than just assuming that they are all in order
        this._assignments = [];
        var params = this._commandExt.params;
        var unparsedArgs = this._unparsedArgs;

        // If this command does not take parameters
        if (!params || params.length === 0) {
            if (unparsedArgs.length === 0) {
                return true;
            }
            // Also no problem if there is a blank parameter
            if (unparsedArgs.length === 1 && unparsedArgs[0].trim() === '') {
                return true;
            }

            this._hints.push(hint.Hint.create({
                level: hint.Level.Error,
                element: this._commandExt.name + " does not take any parameters"
            }));
            return false;
        }

        // Special case: if there is only 1 parameter, and that's of type text
        // we put all the params into the first param
        if (params.length == 1 && params[0].type == 'text') {
            // Warning: There is some potential problem here if spaces are
            // significant. It might be better to chop the command of the
            // start of this.typed? But that's not easy because there could be
            // multiple spaces in the command if we're doing sub-commands
            this._assignments[0] = {
                value: unparsedArgs.length === 0 ? null : unparsedArgs.join(" "),
                param: params[0]
            };
            return true;
        }

        // The normal case where we have to assign params individually
        var index = 0;
        var used = [];
        params.forEach(function(param) {
            this._assignParam(param, index++, used);
        }.bind(this));

        // Check there are no params that don't fit
        var unparsed = false;
        unparsedArgs.forEach(function(unparsedArg) {
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

        // Show a hint for the last parameter
        if (this._parts.length > 1) {
            var assignment = this._getAssignmentForLastArg();

            // HACK! deferred types need to have some parameters
            // by which to determine which type they should defer to
            // so we hack in the assignments so the deferrer can work
            assignment.param.type.assignments = this._assignments;

            if (assignment) {
                this._hints.push(typehint.getHint(this, assignment));
            }
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
        // Look for '--param X' style inputs
        for (var i = 0; i < this._unparsedArgs.length; i++) {
            var unparsedArg = this._unparsedArgs[i];

            if ("--" + param.name == unparsedArg) {
                used.push(unparsedArg);
                // boolean parameters don't have values, they default to false
                if (types.equals(param.type, 'boolean')) {
                    this._assignments[index] = {
                        value: true,
                        param: param
                    };
                } else {
                    if (i + 1 < this._unparsedArgs.length) {
                        // Missing value for this param
                        this._hints.push(hint.Hint.create({
                            level: hint.Level.Incomplete,
                            element: "Missing parameter: " + param.name
                        }));
                    } else {
                        used.push(this._unparsedArgs[i + 1]);
                    }
                }
                return true;
            }
        }

        var value = null;
        if (this._unparsedArgs.length > index) {
            value = this._unparsedArgs[index];
            used.push(this._unparsedArgs[index]);
        }

        // null is a valid default value, and common because it identifies an
        // parameter that is optional. undefined means there is no value from
        // the command line
        if (value !== undefined) {
            this._assignments[index] = { value: value, param: param };
        } else {
            this._assignments[index] = { param: param };

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
        var highestAssign = null;
        this._assignments.forEach(function(assignment) {
            if (!highestAssign || !SC.none(assignment.value)) {
                highestAssign = assignment;
            }
        });
        return highestAssign;
    },

    /**
     * Convert the passed string array into an args object as specified by the
     * command.params declaration.
     */
    _convertTypes: function() {
        // Use {} when there are no params
        if (!this._commandExt.params) {
            this._argsPromise.resolve({});
            return true;
        }

        // The data we pass to the command
        var argOutputs = {};
        // Cache of promises, because we're only done when they're done
        var convertPromises = [];

        this._assignments.forEach(function(assignment) {
            var promise = this._convertType(assignment, argOutputs);
            if (promise) {
                convertPromises.push(promise);
            }
        }.bind(this));

        groupPromises(convertPromises).then(function() {
            this._argsPromise.resolve(argOutputs);
        }.bind(this));

        return true;
    },

    /**
     * Return a promise which will be resolved on type conversion of the given
     * assignment. The argOutputs object will be filled out with the converted
     * type so the promise is only needed to indicate completion of a group of
     * type conversions.
     */
    _convertType: function(assignment, argOutputs) {
        var param = assignment.param;
        var value = assignment.value || param.defaultValue;
        if (value === undefined) {
            return null;
        }

        // HACK! deferred types need to have some parameters
        // by which to determine which type they should defer to
        // so we hack in the assignments so the deferrer can work
        param.type.assignments = this._assignments;

        var convertPromise = types.fromString(value, param.type);
        convertPromise.then(function(converted) {
            assignment.converted = converted;
            argOutputs[param.name] = converted;
        }, function(ex) {
            this._hints.push(hint.Hint.create({
                level: hint.Level.Error,
                element: "Can't convert '" + value + "' to a " +
                    param.type + ": " + ex
            }));
        }.bind(this));

        return convertPromise;
    }
});

/**
 * Provide some documentation for a command
 */
exports.documentCommand = function(cmdExt, typed) {
    var docs = [];
    docs.push("<h1>" + cmdExt.name + "</h1>");
    docs.push("<h2>Summary</h2>");
    docs.push("<p>" + cmdExt.description + "</p>");

    if (cmdExt.manual) {
        docs.push("<h2>Description</h2>");
        docs.push("<p>" + cmdExt.description + "</p>");
    }

    if (cmdExt.params && cmdExt.params.length > 0) {
        docs.push("<h2>Synopsis</h2>");
        docs.push("<pre>");
        docs.push(cmdExt.name);
        var optionalParamCount = 0;
        cmdExt.params.forEach(function(param) {
            if (param.defaultValue === undefined) {
                docs.push(" <i>");
                docs.push(param.name);
                docs.push("</i>");
            } else if (param.defaultValue === null) {
                docs.push(" <i>[");
                docs.push(param.name);
                docs.push("]</i>");
            } else {
                optionalParamCount++;
            }
        });
        if (optionalParamCount > 3) {
            docs.push(" [options]");
        } else if (optionalParamCount > 0) {
            cmdExt.params.forEach(function(param) {
                if (param.defaultValue) {
                    docs.push(" [--<i>");
                    docs.push(param.name);
                    if (types.equals(param.type, 'boolean')) {
                        docs.push("</i>");
                    } else {
                        docs.push("</i> " + types.getSimpleName(param.type));
                    }
                    docs.push("]");
                }
            });
        }
        docs.push("</pre>");

        docs.push("<h2>Parameters</h2>");
        cmdExt.params.forEach(function(param) {
            docs.push("<h3 class='cmd_body'><i>" + param.name + "</i></h3>");
            docs.push("<p>" + param.description + "</p>");
            if (types.defaultValue) {
                docs.push("<p>Default: " + types.defaultValue + "</p>");
            }
        });
    }

    return {
        param: { type: 'text', description: docs.join("") },
        value: typed
    };
};
