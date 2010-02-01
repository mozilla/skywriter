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
var Command = require("command").Command;

/**
 * Register new commands as they are discovered in plugins.
 * A command is a JSON structure that looks something like this:
 * <pre>
 * {
 *     "ep": "command",
 *     "name": ...,
 *     "description": ...,
 *     "params": [{ "name":.., "type":.., "description":.., "defaultValue":.. }, ... ],
 *     "pointer": ...,
 *
 *     "hidden": true,
 *     "parent": "git",        // Optional - Parent command, e.g. "git checkout"
 *     "takes": [ "revision" ],
 *     "completeText": "",
 *     "usage": "",
 *     "aliases": [ "co" ]
 * }
 * </pre>
 */
exports.newCommandHandler = function(command) {
    exports.rootCanon.addCommand(command);
};

/**
 * A Canon is a set of commands
 */
exports.Canon = SC.Object.extend({

    commands: {},
    aliases: {},

    /**
     * TODO: this is perhaps misnamed - it's really here just for the benefit
     * of the SproutCore init function. Perhaps init should remove it from this
     * once it has been added to the parent store
     */
    command: null,
    parent: null,

    /**
     * To create a root command store, call with no parameters.
     * To create a sub-command store, pass the parent store in first, and a
     * single command into the second parameter
     */
    init: function() {
        // If there is a parent, then this is a store for a command with subcommands
        if (this.parent) {
            // save the fact that we are a subcommand for this chap
            this.containerCommand = this.command;

            // implicit that it takes something
            this.command.takes = ['*'];

            // link back to this store
            this.command.subcommands = this;

            // add the sub command to the parent store
            this.parent.addCommand(this.command);
        }
    },

    /**
     * Add a new command to this command store
     */
    addCommand: function(extension) {
        if (!extension) {
            return;
        }

        var command = Command.create(extension);

        command.set("parent", this);
        command.set("extension", extension);

        // Remember the command
        this.commands[command.get("name")] = command;

        // Cache all the aliases in a store wide list
        if (command.aliases) {
            command.aliases.forEach(function(alias) {
                this.aliases[alias] = command.name;
            }, this);
        }
    },


    /**
     * Add a new command to this canon
     */
    removeCommand: function(command) {
        if (!command) {
            return;
        }

        delete this.commands[command.name];
    },

    /**
     * Commands can contain sub commands, this gets us the full name of this
     * command. e.g. This may be a 'commit' command that is part of the 'vcs'
     * command, so this will return "vcs commit"
     */
    getFullCommandName: function() {
        var name = this.containerCommand ? this.containerCommand.name : "";
        if (this.parent) {
            name = this.parent.getFullCommandName() + " " + name;
        }
        return name.trim();
    },

    /**
     * Returns the subset of the options input array where the string values
     * begin with the given prefix
     */
    filterOptionsByPrefix: function(options, prefix) {
        return options.filter(function(option) {
            return option.substr(0, prefix.length) === prefix;
        });
    },

    /**
     * Find a command from this canon from something the user typed at a command
     * line.
     * <p>A null return from this method implies a value that can't be matched
     * to a command, or completed in any way to a command.
     * <p>Examples:<ul>
     * <li>findCommand("") = root canon
     * <li>findCommand("s") = root canon
     * <li>findCommand("set") = set command
     * <li>findCommand("set ") = set command
     * <li>findCommand("set invalid params") = set command
     * <li>findCommand("sett") = null (TODO: Returns root canon now)
     * <li>findCommand("vcs") = vcs canon
     * <li>findCommand("vcs clon") = vcs canon
     * <li>findCommand("vcs clone") = vcs clone command
     * <li>findCommand("vcs clone repo") = vcs clone command
     * </ul>
     * <p>This works by delegating to child command canons when necessary
     * having first removed any command prefixes from the matched canon.
     * e.g. rootCanon.findCommand("vcs clone repo") will delegate to the vcs
     * canon, and ask vcsStore.findCommand("clone repo"). The answer to
     * this last request is the clone command, because it is not a canon.
     */
    findCommand: function(value) {
        var parts = value.trim().split(/\s+/);
        var first = parts.shift();
        var command = this.commands[first] || this.commands[this.aliases[first]];
        if (!command) {
            if (parts.length > 0) {
                return null;
            } else {
                // TODO: We really should be doing some matching on this
                return this;
            }
        }
        if (command.subcommands) {
            return command.subcommands.findCommand(parts.join(" "));
        } else {
            return command;
        }
    },

    /**
     * Find the commands that could work, given the value typed
     * @see commandLine._findCompletions(e) for how this is called
     * @param query Values to be used in completion
     * @param callback Function to be called with the results
     */
    findCompletions: function(query, callback) {
        // Multiple args implies that we've failed to route to a child command
        if (query.action.length > 1) {
            query.error = "No matches";
            callback(query);
            return;
        }

        // Find the text that we're working on.
        var typed = query.action[0];

        // No hints for a blank command line
        if (typed.length === 0 && this.parent) {
            callback(query);
            return;
        }

        // Get a list of all commands and aliases. TODO: cache?
        var matches = [];
        for (var command in this.commands) {
            if (command.indexOf(typed) === 0) {
                matches.push(command);
            }
        }
        for (var alias in this.aliases) {
            if (alias.indexOf(typed) === 0) {
                matches.push(alias);
            }
        }

        if (matches.length == 1) {
            // Single match: go for autofill and hint
            var newValue = matches[0];
            command = this.commands[newValue] || this.commands[this.aliases[newValue]];
            if (command.get("takesArgs")) {
                newValue = newValue + " ";
            }
            query.autofill = query.prefix + newValue;
            query.hint = command.description;
        } else if (matches.length === 0) {
            // No matches, cause an error
            query.error = "No matches";
        } else {
            // Multiple matches, present a list
            matches.sort(function(a, b) {
                return a.localeCompare(b);
            });
            query.options = matches;
        }

        callback(query);
        return;
    },

    /**
     * Generate some help text for all commands in this canon, optionally
     * filtered by a <code>prefix</code>, and with a <code>helpSuffix</code>
     * appended.
     */
    getHelp: function(prefix, options) {
        var commands = [];
        var command, name;

        if (this.commands[prefix]) { // caught a real command
            command = this.commands[prefix];
            commands.push(command.description);
        } else {
            var showHidden = false;

            var subcmdprefix = "";
            if (this.containerCommand) {
                subcmdprefix = " for " + this.containerCommand.name;
            }

            if (prefix) {
                if (prefix == "hidden") { // sneaky, sneaky.
                    prefix = "";
                    showHidden = true;
                }
                commands.push("<h2>Commands starting with '" + prefix + "':</h2>");
            } else {
                commands.push("<h2>Available Commands:</h2>");
            }

            var toBeSorted = [];
            for (name in this.commands) {
                toBeSorted.push(name);
            }

            var sorted = toBeSorted.sort();

            commands.push("<table>");
            for (var i = 0; i < sorted.length; i++) {
                name = sorted[i];
                command = this.commands[name];

                if (!showHidden && command.hidden) {
                    continue;
                }
                if (command.description === undefined) {
                    // Ignore editor actions
                    continue;
                }
                if (prefix && name.indexOf(prefix) !== 0) {
                    continue;
                }

                var args = (command.takes) ? ' [' + command._paramList.split(' ').join('] [') + ']' : '';

                commands.push("<tr>");
                commands.push('<th>' + name + '</th>');
                commands.push('<td>' + command.description + "</td>");
                commands.push('<td>' + args + '</td>');
                commands.push("</tr>");
            }
            commands.push("</table>");
        }

        var output = commands.join("");
        if (options && options.prefix) {
            output = options.prefix + output;
        }
        if (options && options.suffix) {
            output = output + options.suffix;
        }
        return output;
    }
});

/**
 * Create the root that all commands will be added to
 */
exports.rootCanon = new exports.Canon();
