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

var catalog = require("bespin:plugins").catalog;

var settings = catalog.getObject("settings");

/**
 * 'set' command
 */
exports.setCommand = function(instruction, setting) {
    var output;

    if (!setting.key) {
        var settings = settings.list();
        output = "";
        // first sort the settings based on the key
        settings.sort(function(a, b) {
            if (a.key < b.key) {
                return -1;
            } else if (a.key == b.key) {
                return 0;
            } else {
                return 1;
            }
        });
        // now add to output unless hidden settings (start with a _)
        settings.forEach(function(setting) {
            if (setting.key[0] != '_') {
                output += "<a class='setting' href='https://wiki.mozilla.org/Labs/Bespin/Settings#" + setting.key + "' title='View external documentation on setting: " + setting.key + "' target='_blank'>" + setting.key + "</a> = " + setting.value + "<br/>";
            }
        });
    } else {
        var key = setting.key;
        if (setting.value === undefined) { // show it
            var value = settings.values[key];
            if (value) {
                output = "<strong>" + key + "</strong> = " + value;
            } else {
                output = "You do not have a setting for '" + key + "'";
            }
        } else {
            output = "Saving setting: <strong>" + key + "</strong> = " + setting.value;
            settings.values[key] = setting.value;
        }
    }
    instruction.addOutput(output);
};

/**
 * Auto-completion for 'set'
 */
exports.setCompleter = function(query, callback) {
    var key = query.action[0];
    var val = settings.getValue(key);

    if (query.action.length == 1) {
        // Check if this is an exact match
        if (val) {
            query.hint = "Current value of " + key + " is '" + val + "'. Enter a new value, or press enter to display in the console.";
            callback(query);
            return;
        }

        // So no exact matches, we're looking for options
        var list = settings.list().map(function(entry) {
            return entry.key;
        });
        var matches = this.parent.filterOptionsByPrefix(list, key);

        if (matches.length == 1) {
            // Single match: go for autofill and hint
            query.autofill = "set " + matches[0];
            val = settings.getValue(matches[0]);
            query.hint = "Current value of " + matches[0] + " is '" + val + "'. Enter a new value, or press enter to display in the console.";
        } else if (matches.length === 0) {
            // No matches, cause an error
            query.error = "No matching settings";
        } else {
            // Multiple matches, present a list
            matches.sort(function(a, b) {
                return a.localeCompare(b);
            });
            query.options = matches;
        }

        callback(query);
        return;
    }

    if (val) {
        query.hint = "Current value of " + key + " is '" + val + "'. Enter a new value, or press enter to display in the console.";
        callback(query);
        return;
    }

    query.error = "No setting for '" + key + "'";
    callback(query);
    return;
};

/**
 * 'unset' command
 */
exports.unsetCommand = function(instruction, key) {
    if (!settings.values[key]) {
        instruction.addErrorOutput("No setting for " + key + ".");
    } else {
        settings.resetValue(key);
        instruction.addOutput("Unset the setting for " + key + ".");
    }
};

/**
 * Auto-completion for 'unset'
 */
exports.unsetCompleter = function(query, callback) {
    var key = query.action[0];
    var val = settings.values[key];

    // Multiple params are an error
    if (query.action.length > 1) {
        query.error = "Can only unset one setting at a time";
        callback(query);
        return;
    }

    // Exact match
    if (val) {
        query.hint = "Current value of " + key + " is '" + val + "'. Press enter to remove the setting.";
        callback(query);
        return;
    }

    // So no exact matches, we're looking for options
    var list = settings.list().map(function(entry) {
        return entry.key;
    });
    var matches = this.parent.filterOptionsByPrefix(list, key);

    if (matches.length == 1) {
        // Single match: go for autofill and hint
        query.autofill = "set " + matches[0];
        val = settings.getValue(matches[0]);
        query.hint = "Current value of " + matches[0] + " is '" + val + "'. Press enter to remove the setting.";
    } else if (matches.length === 0) {
        // No matches, cause an error
        query.error = "No matching settings";
    } else {
        // Multiple matches, present a list
        matches.sort(function(a, b) {
            return a.localeCompare(b);
        });
        query.options = matches;
    }

    callback(query);
    return;
};
