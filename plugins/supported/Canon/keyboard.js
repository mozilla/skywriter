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

var SC = require('sproutcore/runtime').SC;
var Instruction = require("instruction").Instruction;

var canon = require("directory").rootCanon;

/**
 * The canon, or the repository of commands, contains functions to process
 * events and dispatch command messages to targets.
 * @class
 */
var KeyboardManager = SC.Object.extend({
    _commandMatches: function(command, symbolicName, flags) {
        var mappedKeys = command.key;
        if (!mappedKeys) {
            return false;
        }
        if (typeof(mappedKeys) == "string") {
            if (mappedKeys != symbolicName) {
                return false;
            }
            return true;
        }
        
        if (!mappedKeys.isArray) {
            mappedKeys = [mappedKeys];
            command.key = mappedKeys;
        }
        
        for (var i = 0; i < mappedKeys.length; i++) {
            var keymap = mappedKeys[i];
            if (typeof(keymap) == "string") {
                if (keymap == symbolicName) {
                    return true;
                }
                continue;
            }
            
            if (keymap.key != symbolicName) {
                continue;
            }
            
            var predicates = keymap.predicates;
            
            if (!predicates) {
                return true;
            }
            
            for (var flagName in predicates) {
                if (!flags || flags[flagName] != predicates[flagName]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    },

    /**
     * Searches through the command canon for an event matching the given flags
     * with a key equivalent matching the given SproutCore event, and, if the
     * command is found, sends a message to the appropriate target.
     * 
     * This will get a couple of upgrades in the not-too-distant future:
     * 1. caching in the Canon for fast lookup based on key
     * 2. there will be an extra layer in between to allow remapping via
     *    user preferences and keyboard mapping plugins
     *
     * @return True if a matching command was found, false otherwise.
     */
    processKeyEvent: function(evt, sender, flags) {
        var symbolicName = evt.commandCodes()[0];
        var commands = canon.get("commands");
        for (var commandName in commands) {
            var command = commands[commandName];
            if (this._commandMatches(command, symbolicName, flags)) {
                command.getArgs([], function(args) {
                    var instruction = Instruction.create({
                        command: command,
                        args: args
                    });
                    instruction.exec();
                });
                return true;
            }
        }
        return false;
    }
});

/**
 * The global exported KeyboardManager
 */
exports.keyboardManager = KeyboardManager.create();
