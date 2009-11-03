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

var bespin = require("bespin");
var SC = require("sproutcore");
var TokenObject = require("bespin/util/tokenobject").TokenObject;

/**
 * A store of commands
 */
exports.Store = SC.Object.extend({

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
    addCommand: function(command) {
        if (!command) {
            return;
        }

        command.parent = this;

        // Remember the command
        this.commands[command.name] = command;

        // Allow for the default [ ] takes style by expanding it to something bigger
        if (command.takes && Array.isArray(command.takes)) {
            command = this.normalizeTakes(command);
        }

        // Add bindings
        if (command.withKey) {
            bespin.getComponent('editor', function(editor) {
                editor.bindCommand(command.name, command.withKey);
            });
        }

        // Cache all the aliases in a store wide list
        if (command.aliases) {
            command.aliases.forEach(function(alias) {
                this.aliases[alias] = command.name;
            }, this);
        }

        // TODO: It would be nice to have a class for command structures so we
        // didn't have to monkey patch in functions like this, but that needs to
        // wait until we know what plug-ins will look like.

        /**
         * This is like store.getFullCommandName() but for commands
         */
        command.getFullCommandName = function() {
            var name = this.name;
            if (this.parent) {
                name = this.parent.getFullCommandName() + " " + name;
            }
            return name.trim();
        };

        if (!command.findCompletions) {
            /**
             * Like store.findCompletions() but a default that just uses
             * command.completeText to provide a hint
             */
            command.findCompletions = function(query, callback) {
                query.hint = this.completeText;
                callback(query);
            };
        }
    },

    /**
     * Add a new command to this command store
     */
    removeCommand: function(command) {
        if (!command) {
            return;
        }

        delete this.commands[command.name];
    },

    /*
    // Do we need this?
    hasCommand: function(commandname) {
        if (this.commands[commandname]) { // yup, there she blows. shortcut
            return true;
        }

        for (var command in this.commands) { // try the aliases
            if (this.commands[command]['aliases']) {
                if (bespin.util.include(this.commands[command]['aliases'], commandname)) {
                    return true;
                }
            }
        }
        return false;
    },
    */

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
     * Find a command from this store from something the user typed at a command
     * line.
     * <p>A null return from this method implies a value that can't be matched
     * to a command, or completed in any way to a command.
     * <p>Examples:<ul>
     * <li>findCommand("") = root store
     * <li>findCommand("s") = root store
     * <li>findCommand("set") = set command
     * <li>findCommand("set ") = set command
     * <li>findCommand("set invalid params") = set command
     * <li>findCommand("sett") = null (TODO: Returns root store now)
     * <li>findCommand("vcs") = vcs store
     * <li>findCommand("vcs clon") = vcs store
     * <li>findCommand("vcs clone") = vcs clone command
     * <li>findCommand("vcs clone repo") = vcs clone command
     * </ul>
     * <p>This works by delegating to child command stored when necessary
     * having first removed any command prefixes from the matched command store.
     * e.g. rootStore.findCommand("vcs clone repo") will delegate to the vcs
     * command store, and ask vcsStore.findCommand("clone repo"). The answer to
     * this last request is the clone command, because it is not a command
     * store.
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
        if (typed.length == 0 && this.parent == null) {
            callback(query);
            return;
        }

        // Get a list of all commands and aliases. TODO: cache?
        var matches = [];
        for (var command in this.commands) {
            if (command.indexOf(typed) == 0) {
                matches.push(command);
            }
        }
        for (var alias in this.aliases) {
            if (alias.indexOf(typed) == 0) {
                matches.push(alias);
            }
        }

        if (matches.length == 1) {
            // Single match: go for autofill and hint
            var newValue = matches[0];
            command = this.commands[newValue] || this.commands[this.aliases[newValue]];
            if (this.commandTakesArgs(command)) {
                newValue = newValue + " ";
            }
            query.autofill = query.prefix + newValue;
            query.hint = command.preview;
        } else if (matches.length == 0) {
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
     * Does this command take arguments?
     */
    commandTakesArgs: function(command) {
        return command.takes != undefined;
    },

    /**
     * Calculate the args object to be passed into the command.
     * If it only takes one argument just send in that data, but if it wants
     * more, split it all up for the command and send in an object.
     */
    getArgs: function(fromUser, command) {
        if (!command.takes) {
            return undefined;
        }

        var args;
        var userString = fromUser.join(' ');

        if (command.takes['*']) {
            args = new TokenObject({ input:userString });
            args.rawinput = userString;

            args.varargs = args.pieces; // directly grab the token pieces as an array
        } else if (command.takes && command.takes.order.length < 2) {
            // One argument, so just return that
            args = userString;
        } else {
            args = new TokenObject({
                input: userString,
                options: { params: command.takes.order.join(' ') }
            });
            args.rawinput = userString;
        }
        return args;
    },

    /**
     * Convert a command that uses a plain array for its 'takes' member and
     * upgrade it
     */
    normalizeTakes: function(command) {
        // TODO: handle shorts that are the same! :)
        var takes = command.takes;
        command.takes = {
            order: takes
        };

        takes.forEach(function(item) {
            command.takes[item] = {
                "short": item[0]
            };
        });

        return command;
    },

    /**
     * Generate some help text for all commands in this store, optionally
     * filtered by a <code>prefix</code>, and with a <code>helpSuffix</code>
     * appended.
     */
    getHelp: function(prefix, options) {
        var commands = [];
        var command, name;

        if (this.commands[prefix]) { // caught a real command
            command = this.commands[prefix];
            commands.push(command.description ? command.description : command.preview);
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

            var tobesorted = [];
            for (name in this.commands) {
                tobesorted.push(name);
            }

            var sorted = tobesorted.sort();

            commands.push("<table>");
            for (var i = 0; i < sorted.length; i++) {
                name = sorted[i];
                command = this.commands[name];

                if (!showHidden && command.hidden) {
                    continue;
                }
                if (prefix && name.indexOf(prefix) != 0) {
                    continue;
                }

                var args = (command.takes) ? ' [' + command.takes.order.join('] [') + ']' : '';

                commands.push("<tr>");
                commands.push('<th>' + name + '</th>');
                commands.push('<td>' + command.preview + "</td>");
                commands.push('<td>' + args + '</td>');
                commands.push("</tr>");
            }
            commands.push("</table>");
        }

        var output = commands.join("");
        if (options && options.prefix) {
            output = options.prefix + "<br/>" + output;
        }
        if (options && options.suffix) {
            output = output + "<br/>" + options.suffix;
        }
        return output;
    }
});

/**
 * Add a root command store to the main bespin namespace
 */
exports.store = new exports.Store();

exports.executeExtensionCommand = function() {
    var args = arguments;
    var self = this;
    this.load(function(execute) {
        execute.apply(self, args);
    });
};

/**
 * Add a command to the root store on pub/sub.
 * TODO: We're trying to remove pub/sub for actions, so we should explain this
 */
bespin.subscribe("extension:loaded:bespin.command", function(ext) {
    ext.execute = exports.command.executeExtensionCommand;
    exports.store.addCommand(ext);
});

/**
 * Remove a command from the root store on pub/sub.
 * TODO: We're trying to remove pub/sub for actions, so we should explain this
 */
bespin.subscribe("extension:removed:bespin.command", function(ext) {
    exports.store.removeCommand(ext);
});

/**
 * 'help' command for the root store
 */
exports.store.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show commands',
    description: 'The <u>help</u> gives you access to the various commands in the Bespin system.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>If you pass in the magic <em>hidden</em> parameter, you will find subtle hidden commands.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(instruction, extra) {
        var output = this.parent.getHelp(extra, {
            prefix: "<h2>Welcome to Bespin - Code in the Cloud</h2><ul>" +
                "<li><a href='http://labs.mozilla.com/projects/bespin' target='_blank'>Home Page</a>" +
                "<li><a href='https://wiki.mozilla.org/Labs/Bespin' target='_blank'>Wiki</a>" +
                "<li><a href='https://wiki.mozilla.org/Labs/Bespin/UserGuide' target='_blank'>User Guide</a>" +
                "<li><a href='https://wiki.mozilla.org/Labs/Bespin/Tips' target='_blank'>Tips and Tricks</a>" +
                "<li><a href='https://wiki.mozilla.org/Labs/Bespin/FAQ' target='_blank'>FAQ</a>" +
                "<li><a href='https://wiki.mozilla.org/Labs/Bespin/DeveloperGuide' target='_blank'>Developers Guide</a>" +
                "</ul>",
            suffix: "For more information, see the <a href='https://wiki.mozilla.org/Labs/Bespin'>Bespin Wiki</a>."
        });
        instruction.addOutput(output);
    }
});

