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

var SC = require('sproutcore/runtime').SC;
var catalog = require("bespin:plugins").catalog;
var Request = require("Canon:request").Request;
var env = require("Canon:environment");

/**
 * The canon, or the repository of commands, contains functions to process
 * events and dispatch command messages to targets.
 * @class
 */
var KeyboardManager = SC.Object.extend({
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
        var commandExt = this._findCommandExtension(symbolicName, flags);
        if (commandExt != null) {
            commandExt.load(function(command) {
                var request = Request.create({
                    command: command,
                    commandExt: commandExt
                });

                try {
                    command(env.global, {}, request);
                    return true;
                } catch (ex) {
                    // TODO: Some UI?
                    console.group("Error calling command: " + commandExt.name);
                    console.error(ex);
                    console.trace();
                    console.groupEnd();
                    return false;
                }
            });
            return true;
        }
        return false;
    },

    /**
     * Loop through the commands in the canon, looking for something that
     * matches according to #_commandMatches, and return that.
     */
    _findCommandExtension: function(symbolicName, flags) {
        var commandExts = catalog.getExtensions("command");
        var reply = null;
        commandExts.some(function(commandExt) {
            if (this._commandMatches(commandExt, symbolicName, flags)) {
                reply = commandExt;
                return true;
            }
            return false;
        }.bind(this));
        return reply;
    },

    /**
     * Check that the given command fits the given key name and flags.
     */
    _commandMatches: function(commandExt, symbolicName, flags) {
        // Check predicates
        var predicates = commandExt.predicates;
        if (!SC.none(predicates)) {
            if (SC.none(flags)) {
                return false;
            }

            for (var flagName in predicates) {
                if (flags[flagName] !== predicates[flagName]) {
                    return false;
                }
            }
        }
        
        var mappedKeys = commandExt.key;
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
            commandExt.key = mappedKeys;
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
            
            predicates = keymap.predicates;
            
            if (!predicates) {
                return true;
            }
            
            for (flagName in predicates) {
                if (!flags || flags[flagName] != predicates[flagName]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
});

/**
 * The global exported KeyboardManager
 */
exports.keyboardManager = KeyboardManager.create();
