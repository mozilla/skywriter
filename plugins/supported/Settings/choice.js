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

var catalog = require("bespin:plugins").catalog;
var settings = catalog.getObject("settings");

/**
 * Our store of the choices that we accept.
 */
var choices = {};

/**
 * Function to add to the list of available choices.
 * <p>Example usage:
 * <pre>
 * var choice = require("Settings:choice");
 * choice.addChoice({
 *     name: "tabsize", // For use in settings.values.X
 *     type: "number",  // To allow value checking.
 *     defaultValue: 4  // Default value for use when none is directly set
 * });
 * </pre>
 * @param {object} choice Object containing name/type/defaultValue members.
 */
exports.addChoice = function(choice) {
    if (!choice.name) {
        throw "Settings need 'name' members";
    }

    var typeExt = catalog.getExtensionByKey("type", choice.type);
    if (!typeExt) {
        // Make a list of the valid type names
        var typeNames = [];
        catalog.getExtensions("type").forEach(function(type) {
            typeNames.push(type.name);
        });
        throw "choice.type should be one of [" + typeNames.join("|") + "]. " +
        		"Got " + choice.type;
    }

    if (!choice.defaultValue === undefined) {
        throw "Settings need 'defaultValue' members";
    }

    // Load the type so we can check the validator
    typeExt.load(function(type) {
        if (!type.validator(choice.defaultValue)) {
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
    });
};
