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
 * Our store of the choices that we accept.
 */
var choices = {};

/**
 * These are the types that we accept. They are vaguely based on the Jetpack
 * settings system (https://wiki.mozilla.org/Labs/Jetpack/JEP/24) although
 * clearly more restricted.
 * <p>In addition to these types, Jetpack also accepts range, member, password
 * that we are thinking of adding in the short term.
 * <p>In theory we could make this list extensible, however we're going to leave
 * that until we see a need.
 */
var types = {
    number: {
        validator: function(value) { return typeof value == "number"; },
        toString: function(value) { return "" + value; },
        fromString: function(value) { return 0 + value; }
    },
    "boolean": {
        validator: function(value) { return typeof value == "boolean"; },
        toString: function(value) { return "" + value; },
        fromString: function(value) { return !!value; }
    },
    text: {
        validator: function(value) { return typeof value == "string"; },
        toString: function(value) { return value; },
        fromString: function(value) { return value; }
    },
    object: {
        validator: function(value) { return typeof value == "object"; },
        toString: function(value) { return JSON.stringify(value); },
        fromString: function(value) { return JSON.parse(value); }
    }
};

// Make a list of the valid type names
var typeNames = [];
for (valid in types) {
    if (types.hasOwnProperty(valid)) {
        typeNames.push(valid);
    }
}
var typeDescr = "[" + typeNames.join("|") + "]";

/**
 * Function to add to the list of available choices.
 * <p>Example usage:
 * <pre>
 * var choice = require("Settings:choice");
 * choice.addChoice({
 *     name: "tabsize", // For use in settings.values.X
 *     type: "number",  // To allow value checking. See #types
 *     defaultValue: 4  // Default value for use when none is directly set
 * });
 * </pre>
 * @param {object} choice Object containing name/type/defaultValue members.
 */
exports.addChoice = function(choice) {
    if (!choice.name) {
        throw "Settings need 'name' members";
    }

    if (!types[choice.type]) {
        throw "choice.type should be one of " + typeDescr + ". Got " + choice.type;
    }

    if (!choice.defaultValue === undefined) {
        throw "Settings need 'defaultValue' members";
    }

    if (!types[choice.type].validator(choice.defaultValue)) {
        throw "Default value " + choice.defaultValue +
                " is not a valid " + choice.type;
    }

    // Recall the choice
    choices[choice.name] = choice;

    // Set the default value up. We do this before __defineSetter__ because
    // we don't want to publish the change to everyone. This might not be
    // the correct behavior. Need experience to tell.
    settings.values["_" + choice.name] = choice.defaultValue;

    // Add a setter to values so subclasses can save, and we can publish
    // This also remaps name to _name so we need the getter below too
    settings.values.__defineSetter__(choice.name, function(value) {
        settings.values["_" + choice.name] = value;
        settings._changeValue(choice.name, value);
    }.bind(settings));

    // Add a getter to values we can remap to the _name version
    settings.values.__defineGetter__(choice.name, function(value) {
        settings.values["_" + choice.name] = value;
    }.bind(settings));
};
