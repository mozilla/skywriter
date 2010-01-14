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
var catalog = require('bespin:plugins').catalog;

/**
 * The canon, or the repository of commands, contains functions to process
 * events and dispatch command messages to targets.
 * @class
 */
var KeyboardManager = SC.Object.extend({
    _commandMatches: function(command, flags) {
        var predicates = command.predicates;
        if (predicates !== undefined) {
            for (var i = 0; i < predicates.length; i += 2) {
                if (flags[predicates[i]] !== predicates[i + 1]) {
                    return false;
                }
            }
        }
        return true;
    },

    /**
     * Searches through the command canon for an event matching the given flags
     * with a key equivalent matching the given SproutCore event, and, if the
     * command is found, sends a message to the appropriate target.
     *
     * @return True if a matching command was found, false otherwise.
     */
    processKeyEvent: function(evt, sender, flags) {
        var symbolicName = evt.commandCodes()[0];
        var commands = catalog.getExtensions('command');
        for (var i = 0; i < commands.length; i++) {
            var command = commands[i];
            if (command.key === symbolicName &&
                    this._commandMatches(command, flags)) {
                var targetID = command.target;
                var target = SC.none(targetID) ? sender :
                    catalog.getObject(targetID);
                target[command.action]();
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
