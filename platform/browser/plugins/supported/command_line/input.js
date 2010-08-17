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

var catalog = require('bespin:plugins').catalog;
var console = require('bespin:console').console;
var Promise = require('bespin:promise').Promise;
var groupPromises = require('bespin:promise').group;
var Trace = require('bespin:util/stacktrace').Trace;
var util = require('bespin:util/util');

var types = require('types:types');
var Request = require('canon:request').Request;
var history = require('canon:history');
var keyboard = require('keyboard:keyboard');

var Hint = require('command_line:hint').Hint;
var Level = require('command_line:hint').Level;
var typehint = require('command_line:typehint');

/**
 * An object used during command line parsing to hold the various intermediate
 * data steps.
 * <p>The 'output' of the parse is held in 2 objects: input.hints which is an
 * array of hints to display to the user. In the future this will become a
 * single value.
 * <p>The other output value is input.argsPromise which gives access to an
 * args object for use in executing the final command.
 * @param typed {string} The instruction as typed by the user so far
 * @param options {object} A list of optional named parameters. Can be any of:
 * <b>flags</b>: Flags for us to check against the predicates specified with the
 * commands. Defaulted to <tt>keyboard.buildFlags({ });</tt>
 * if not specified.
 */
exports.Input = function(typed, options) {
    if (util.none(typed)) {
        throw new Error('Input requires something \'typed\' to work on');
    }
    this.typed = typed;
    this.hints = [];
    this.argsPromise = new Promise();

    options = options || {};

    options.flags = options.flags || keyboard.buildFlags({ });
    this.flags = options.flags;

    // Once tokenize() has been called, we have the #typed string cut up into
    // #_parts
    this._parts = [];

    // Once split has been called we have #_parts split into #_unparsedArgs and
    // #commandExt (if there is a matching command).
    this._unparsedArgs = undefined;

    // If #typed specifies a command to execute, this is that commands metadata
    this._commandExt = undefined;

    // Assign matches #_unparsedArgs to the params declared by the #_commandExt
    // A list of arguments in commandExt.params order
    this._assignments = undefined;

    try {
        // Go through the input checking and generating hints,
        // and if possible an arguments array.
        this._tokenize();
    } catch (ex) {
        var trace = new Trace(ex, true);
        console.group('Error calling command: ' + this.typed);
        console.error(ex);
        trace.log(3);
        console.groupEnd();

        if (!this.argsPromise.isComplete()) {
            this.argsPromise.reject(ex);
        }
    }
};

/**
 * Implementation of Input.
 * The majority of the functions in this class are called in sequence by the
 * constructor. Their task is to add to <tt>hints</tt> and to resolve
 * <tt>argsPromise</tt>.
 * <p>The general sequence is:<ul>
 * <li>_tokenize(): convert _typed into _parts
 * <li>_split(): convert _parts into _commandExt and _unparsedArgs
 * <li>_assign(): convert _unparsedArgs into _assignments
 * <li>_convertTypes(): resolve argsPromise by converting _assignments
 * </ul>
 */
exports.Input.prototype = {
    /**
     * Split up the input taking into account ' and "
     */
    _tokenize: function() {
        if (!this.typed || this.typed === '') {
            // We would like to put some initial help here, but for anyone but
            // a complete novice a 'type help' message is very annoying, so we
            // need to find a way to only display this message once, or for
            // until the user click a 'close' button or similar
            this.hints.push(new Hint(Level.Incomplete));
            this.argsPromise.resolve({});
            return;
        }

        // replace(/^\s\s*/, '') = trimLeft()
        var incoming = this.typed.replace(/^\s\s*/, '').split(/\s+/);

        var nextToken;
        while (true) {
            nextToken = incoming.shift();
            if (util.none(nextToken)) {
                break;
            }
            if (nextToken[0] == '"' || nextToken[0] == '\'') {
                // It's quoting time
                var eaten = [ nextToken.substring(1, nextToken.length) ];
                var eataway;
                while (true) {
                    eataway = incoming.shift();
                    if (!eataway) {
                        break;
                    }
                    if (eataway[eataway.length - 1] == '"' ||
                            eataway[eataway.length - 1] == '\'') {
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

        // Split the command from the args
        this._split();
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
            initial += ' ' + this._unparsedArgs.shift();
        }

        this._commandExt = commandExt;

        // Do we know what the command is.
        var hintSpec = null;
        var message;
        if (this._commandExt) {
            // Load the command to check that it will load
            var loadPromise = new Promise();
            commandExt.load().then(function(command) {
                if (command) {
                    loadPromise.resolve(null);
                } else {
                    message = 'Failed to load command ' + commandExt.name +
                            ': Pointer ' + commandExt.pluginName +
                            ':' + commandExt.pointer + ' is null.';
                    loadPromise.resolve(new Hint(Level.Error, message));
                }
            }, function(ex) {
                message = 'Failed to load command ' + commandExt.name +
                        ': Pointer ' + commandExt.pluginName +
                        ':' + commandExt.pointer + ' failed to load.' + ex;
                loadPromise.resolve(new Hint(Level.Error, message));
            });
            this.hints.push(loadPromise);

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
            this.hints.push(hintPromise);
        }

        if (util.none(this._commandExt)) {
            this.argsPromise.resolve({});
            return;
        }

        // Assign input to declared parameters
        this._assign();
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
     * TODO: _unparsedArgs should be a list of objects that contain the
     * following values: name, param (when assigned) and maybe hints?
     */
    _assign: function() {
        // TODO: something smarter than just assuming that they are all in order
        this._assignments = [];
        var params = this._commandExt.params;
        var unparsedArgs = this._unparsedArgs;
        var message;

        // Create an error if the command does not take parameters, but we have
        // been given them ...
        if (!params || params.length === 0) {
            // No problem if we're passed nothing or an empty something
            var argCount = 0;
            unparsedArgs.forEach(function(unparsedArg) {
                if (unparsedArg.trim() !== '') {
                    argCount++;
                }
            });

            if (argCount !== 0) {
                message = this._commandExt.name + ' does not take any parameters';
                this.hints.push(new Hint(Level.Error, message));
            }

            this.argsPromise.resolve({});
            return;
        }

        // Special case: if there is only 1 parameter, and that's of type
        // text we put all the params into the first param
        if (params.length == 1 && params[0].type == 'text') {
            // Warning: There is some potential problem here if spaces are
            // significant. It might be better to chop the command of the
            // start of this.typed? But that's not easy because there could
            // be multiple spaces in the command if we're doing sub-commands
            this._assignments[0] = {
                value: unparsedArgs.length === 0 ? null : unparsedArgs.join(' '),
                param: params[0]
            };
        } else {
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
                    message = 'Parameter \'' + unparsedArg + '\' makes no sense.';
                    this.hints.push(new Hint(Level.Error, message));
                    unparsed = true;
                }
            }.bind(this));

            if (unparsed) {
                this.argsPromise.resolve({});
                return;
            }
        }

        // Show a hint for the last parameter
        if (this._parts.length > 1) {
            var assignment = this._getAssignmentForLastArg();

            // HACK! deferred types need to have some parameters
            // by which to determine which type they should defer to
            // so we hack in the assignments so the deferrer can work
            assignment.param.type.assignments = this._assignments;

            if (assignment) {
                this.hints.push(typehint.getHint(this, assignment));
            }
        }

        // Convert input into declared types
        this._convertTypes();
    },

    /**
     * Extract a value from the set of inputs for a given param.
     * @param param The param that we are providing a value for. This is taken
     * from the command meta-data for the commandExt in question.
     * @param index The number of the param - i.e. the index of <tt>param</tt>
     * into the original params array.
     */
    _assignParam: function(param, index, used) {
        var message;
        // Look for '--param X' style inputs
        for (var i = 0; i < this._unparsedArgs.length; i++) {
            var unparsedArg = this._unparsedArgs[i];

            if ('--' + param.name == unparsedArg) {
                used.push(unparsedArg);
                // boolean parameters don't have values, they default to false
                if (types.equals(param.type, 'boolean')) {
                    this._assignments[index] = {
                        value: true,
                        param: param
                    };
                } else {
                    if (i + 1 < this._unparsedArgs.length) {
                        message = 'Missing parameter: ' + param.name;
                        // Missing value for this param
                        this.hints.push(new Hint(Level.Incomplete, message));
                    } else {
                        used.push(this._unparsedArgs[i + 1]);
                    }
                }
                return;
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
                message = 'Missing parameter: ' + param.name;
                this.hints.push(new Hint(Level.Incomplete, message));
            }
        }
    },

    /**
     * Get the parameter, index and value for the last thing the user typed
     * @see _assign()
     */
    _getAssignmentForLastArg: function() {
        var highestAssign = null;
        this._assignments.forEach(function(assignment) {
            if (!highestAssign || !util.none(assignment.value)) {
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
            this.argsPromise.resolve({});
            return;
        }

        // The data we pass to the command
        var argOutputs = {};
        // Cache of promises, because we're only done when they're done
        var convertPromises = [];

        this._assignments.forEach(function(assignment) {
            // HACK! deferred types need to have some parameters
            // by which to determine which type they should defer to
            // so we hack in the assignments so the deferrer can work
            assignment.param.type.assignments = this._assignments;

            var promise = this._convertType(assignment, argOutputs);

            promise.then(function(converted) {
                assignment.converted = converted;
                argOutputs[assignment.param.name] = converted;
            }, function(ex) {
                var message = 'Can\'t convert \'' + assignment.value +
                        '\' to a ' + param.type + ': ' + ex;
                this.hints.push(new Hint(Level.Error, message));
            }.bind(this));

            convertPromises.push(promise);
        }.bind(this));

        groupPromises(convertPromises).then(function() {
            this.argsPromise.resolve(argOutputs);
        }.bind(this));
    },

    /**
     * Return a promise which will be resolved on type conversion of the given
     * assignment. The argOutputs object will be filled out with the converted
     * type so the promise is only needed to indicate completion of a group of
     * type conversions.
     */
    _convertType: function(assignment, argOutputs) {
        if (assignment.value !== null) {
            return types.fromString(assignment.value, assignment.param.type);
        } else {
            return new Promise().resolve(assignment.param.defaultValue);
        }
    },

    /**
     * Take the results of a parseInput, wait for the argsPromise to resolve
     * load the command and then execute it.
     */
    execute: function() {
        // Debug to the console
        var loadError = function(ex) {
            var trace = new Trace(ex, true);
            console.group('Error executing: ' + this.typed);
            console.error(ex);
            trace.log(3);
            console.groupEnd();
        }.bind(this);

        this.argsPromise.then(function(args) {
            this._commandExt.load().then(function(command) {
                var request = new Request({
                    command: command,
                    commandExt: this._commandExt,
                    typed: this.typed,
                    args: args
                });
                history.execute(args, request);
            }.bind(this), loadError);
        }.bind(this), loadError);
    }
};

/**
 * Provide some documentation for a command
 */
exports.documentCommand = function(cmdExt, typed) {
    var docs = [];
    docs.push('<h1>' + cmdExt.name + '</h1>');
    docs.push('<h2>Summary</h2>');
    docs.push('<p>' + cmdExt.description + '</p>');

    if (cmdExt.manual) {
        docs.push('<h2>Description</h2>');
        docs.push('<p>' + cmdExt.description + '</p>');
    }

    if (cmdExt.params && cmdExt.params.length > 0) {
        docs.push('<h2>Synopsis</h2>');
        docs.push('<pre>');
        docs.push(cmdExt.name);
        var optionalParamCount = 0;
        cmdExt.params.forEach(function(param) {
            if (param.defaultValue === undefined) {
                docs.push(' <i>');
                docs.push(param.name);
                docs.push('</i>');
            } else if (param.defaultValue === null) {
                docs.push(' <i>[');
                docs.push(param.name);
                docs.push(']</i>');
            } else {
                optionalParamCount++;
            }
        });
        if (optionalParamCount > 3) {
            docs.push(' [options]');
        } else if (optionalParamCount > 0) {
            cmdExt.params.forEach(function(param) {
                if (param.defaultValue) {
                    docs.push(' [--<i>');
                    docs.push(param.name);
                    if (types.equals(param.type, 'boolean')) {
                        docs.push('</i>');
                    } else {
                        docs.push('</i> ' + types.getSimpleName(param.type));
                    }
                    docs.push(']');
                }
            });
        }
        docs.push('</pre>');

        docs.push('<h2>Parameters</h2>');
        cmdExt.params.forEach(function(param) {
            docs.push('<h3 class="cmd_body"><i>' + param.name + '</i></h3>');
            docs.push('<p>' + param.description + '</p>');
            if (types.defaultValue) {
                docs.push('<p>Default: ' + types.defaultValue + '</p>');
            }
        });
    }

    return {
        param: { type: 'text', description: docs.join('') },
        value: typed
    };
};
