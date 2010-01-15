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

var BaseInstruction = require("Canon:instruction").Instruction;

/**
 * Wrapper for something that the user typed
 */
exports.Instruction = BaseInstruction.extend({
    typed: null,
    canon: null,

    /**
     *
     */
    init: function() {
        this.typed = this.typed.trim();

        // It is valid to not know the commandLine when we are filling the
        // history from disk, but in that case we don't need to parse it
        if (!this.historical) {
            this.start = new Date();
            var ca = this._splitCommandAndArgs(this.canon, this.typed);
            if (ca) {
                this.command = ca[0];
                this.argList = ca[1];
            }
        } else {
            this.completed = true;
        }
    },

    /**
     * A string version of this Instruction suitable for serialization
     */
    toString: function() {
        return JSON.stringify({
            typed: this.typed,
            output: this.output,
            start: this.start ? this.start.getTime() : -1,
            end: this.end ? this.end.getTime() : -1
        });
    },

    /**
     * Split Command and Args
     * Private method to chop up the typed command
     */
    _splitCommandAndArgs: function(canon, typed, parent) {
        var data = typed.split(/\s+/);
        var commandname = data.shift();

        var command;
        var argstr = data.join(' ');

        if (canon.commands[commandname]) {
            command = canon.commands[commandname];
        } else if (canon.aliases[commandname]) {
            var alias = canon.aliases[commandname].split(' ');
            var aliascmd = alias.shift();
            if (alias.length > 0) {
                argstr = alias.join(' ') + ' ' + argstr;
            }
            command = canon.commands[aliascmd];
        } else {
            if (commandname == "") {
                this._parseError = "Missing " + (parent == null ? "command" : "subcommand") + ".<br/>";
            } else {
                this._parseError = "Sorry, no " + (parent == null ? "command" : "subcommand") + " '" + commandname + "'.<br/>";
            }

            // Sometime I hate JavaScript ...
            var length = 0;
            for (command in canon.commands) {
                length++;
            }

            // TODO: consider promoting this somewhere
            var linkup = function(exec) {
                var script = "bespin.get(\"commandLine\").executeCommand(\"" + exec + "\");";
                return "<a href='javascript:" + script + "'>" + exec + "</a>";
            };

            if (length <= 30) {
                this._parseError += "Try one of: ";
                for (command in canon.commands) {
                    this._parseError += canon.commands[command].name + ", ";
                }
                if (parent != null) {
                    this._parseError += "<br/>Or use '" + linkup(parent.name + " help") + "'.";
                } else {
                    this._parseError += "<br/>Or use '" + linkup("help") + "'.";
                }
            } else {
                if (parent != null) {
                    this._parseError += "Use '" + linkup(parent.name + " help") + "' to enumerate commands.";
                } else {
                    this._parseError += "Use '" + linkup("help") + "' to enumerate commands.";
                }
            }

            return null;
        }

        if (command.subcommands) {
            if (data.length < 1 || !data[0]) {
                argstr = command.subcommanddefault || 'help';
            }
            return this._splitCommandAndArgs(command.subcommands, argstr, command);
        }

        return [command, argstr.split(' ')];
    }
});
