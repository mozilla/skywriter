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
var command = require("bespin/command");
var util = require("bespin/util/util");

/**
 * Command store for the cmd commands
 * (which are subcommands of the main 'cmd' command)
 */
exports.commands = new command.Store(command.store, {
    name: 'cmd',
    preview: 'Various commands to manage commands'
});

/**
 * Display sub-command help
 */
exports.commands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show subcommands for project command',
    description: 'The <strong>help</strong> gives you access to the various subcommands in the cmd command space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(instruction, extra) {
        var output = this.parent.getHelp(extra);
        instruction.addOutput(output);
    }
});

/**
 * 'cmd load' command
 */
exports.commands.addCommand({
    name: 'load',
    takes: ['commandname'],
    preview: 'load up a new command',
    completeText: 'command name to load (required)',
    usage: '[commandname]: Command name required.',
    execute: function(instruction, commandname) {
        if (!commandname) {
            instruction.addUsageOutput(this);
            return;
        }

        if (!commandname) {
            instruction.addErrorOutput("Please pass me a command name to load.");
            return;
        }

        var path = "commands/" + commandname + ".js";
        var onSuccess = function(file) {
            try {
                var command = eval(file.content);
                // Note: This used to allow multiple commands to be stored in
                // a single file, however that meant that the file was a (more)
                // butchered version of JSON - the contents of an array.
                command.store.addCommand(command);
            } catch (e) {
                instruction.addErrorOutput("Something is wrong about the command:<br><br>" + e);
            }
        };

        var files = bespin.get('files');
        files.loadContents(files.userSettingsProject, path, onSuccess, true);
    }
});

/**
 * 'cmd edit' command
 */
exports.commands.addCommand({
    name: 'edit',
    takes: ['commandname'],
    aliases: ['add'],
    preview: 'edit the given command (force if doesn\'t exist',
    completeText: 'command name to edit (required)',
    usage: '[commandname]: Command name required.',
    execute: function(instruction, commandname) {
        if (!commandname) {
            instruction.addUsageOutput(this);
            return;
        }

        if (!commandname) {
            instruction.addErrorOutput("Please pass me a command name to edit.");
            return;
        }

        var filename = "commands/" + commandname + ".js";
        var content = "" +
            "{\n" +
            "    name: '" + commandname + "',\n" +
            "    takes: [YOUR_ARGUMENTS_HERE],\n" +
            "    preview: 'execute any editor action',\n" +
            "    execute: function(self, args) {\n" +
            "\n" +
            "    }\n" +
            "}";

        var files = bespin.get('files');
        bespin.get("editor").openFile(files.userSettingsProject, filename, {
            content: content,
            force: true
        });
    }
});

/**
 * 'cmd list' command
 */
exports.commands.addCommand({
    name: 'list',
    preview: 'list my custom commands',
    execute: function(instruction) {
        var files = bespin.get('files');
        bespin.get('server').list(files.userSettingsProject, 'commands/', function(commands) {
            var output;

            if (!commands || commands.length < 1) {
                output = "You haven't installed any custom commands.<br>Want to <a href='https://wiki.mozilla.org/Labs/Bespin/Roadmap/Commands'>learn how?</a>";
            } else {
                output = "<u>Your Custom Commands</u><br/><br/>";

                var jsCommands = commands.filter(function(file) {
                    return util.endsWith(file.name, '\\.js');
                });

                output += jsCommands.map(function(jsCommand) {
                    return jsCommand.name.replace(/\.js$/, '');
                }).join("<br>");
            }

            instruction.addOutput(output);
        });
    }
});

/**
 * 'cmd rm' command
 */
exports.commands.addCommand({
    name: 'rm',
    aliases: [ 'del', 'delete' ],
    takes: ['commandname'],
    preview: 'delete a custom command',
    completeText: 'command name to delete (required)',
    usage: '[commandname]: Command name required.',
    execute: function(instruction, commandname) {
        if (!commandname) {
            instruction.addUsageOutput(this);
            return;
        }

        var editSession = bespin.get('editSession');
        var files = bespin.get('files');

        if (!commandname) {
            instruction.addErrorOutput("Please pass me a command name to delete.");
            return;
        }

        var commandpath = "commands/" + commandname + ".js";

        var onSuccess = instruction.link(function() {
            if (editSession.checkSameFile(files.userSettingsProject, commandpath)) {
                // only clear if deleting the same file
                bespin.get('editor').model.clear();
            }
            instruction.addOutput('Removed command: ' + commandname);
        });

        var onFailure = instruction.link(function(xhr) {
            instruction.addOutput("Wasn't able to remove the command <b>" + commandname + "</b><br/><em>Error</em> (probably doesn't exist): " + xhr.responseText);
        });

        files.removeFile(files.userSettingsProject, commandpath, onSuccess, onFailure);
    }
});
