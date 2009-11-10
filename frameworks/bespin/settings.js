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

/**
 * This module manages settings.
 * <p>It provides an API for controlling the known settings. This allows us to
 * provide better GUI/CLI support
 * <p>It provides 3 implementations of a setting store:<ul>
 * <li>InMemorySettings: i.e. temporary, non-persistent. Useful in textarea
 * replacement type scenarios.
 * <li>CookieSettings: Stores the data in a cookie. Generally not practical as
 * it slows client server communication (if any)
 * <li>ServerSettings: Stores data on a server using the <tt>server</tt> API.
 * </ul>
 * <p>It is expected that an HTML5 storage option will be developed soon. This
 * module did contain a prototype Gears implementation, however this was never
 * maintained, and has been deleted due to bit-rot.
 *
 * <p>TODO:<ul>
 * <li>Check what happens when we alter settings from the UI
 * <li>Remove the typed access methods like isSettingOn and allow typed data to
 * be stored, converting to string on save.
 * <li>Ensure that values can be bound in a SC sense
 * <li>Convert all subscriptions to bindings.
 * <li>Implement HTML5 storage option
 * <li>Make all settings have a 'description' member and use that in set|unset
 * commands.
 * <li>When the command system is re-worked to include more GUI interaction,
 * expose data in settings to that system.
 * </ul>
 */

var bespin = require("package");
var util = require("util/util");
var themes = require("theme");
var SC = require("sproutcore/runtime:package").SC;

/**
 * Our store of the settings that we accept.
 */
var settings = [];

/**
 * These are the types that we accept. They are vaguely based on the Jetpack
 * settings system (https://wiki.mozilla.org/Labs/Jetpack/JEP/24) although
 * clearly more restricted.
 * <p>If you alter this list, remember to alter the error message in
 * #addSetting() to reflect the altered list of types.
 * In addition to these types, Jetpack also accepts range, member, password
 * that we are thinking of adding in the short term.
 */
var validators = {
    number: function(value) {
        return typeof value == "number";
    },
    boolean: function(value) {
        return typeof value == "boolean";
    },
    text: function(value) {
        return typeof value == "string";
    }
};

/**
 * Function to add to the list of available settings.
 * <p>Example usage:
 * <pre>
 * settings.addSetting({
 *     name: "tabsize", // For use in 'set|unset' commands
 *     type: "number",  // The type to allow value checking. See #validators()
 *     defaultValue: 4  // The default value for use when none is directly set
 * });
 * </pre>
 */
exports.addSetting = function(setting) {
    if (!setting.name) {
        throw "Settings need 'name' members";
    }
    if (!validators[setting.type]) {
        throw "setting.type should be one of [number|boolean|string]";
    }
    if (!setting.defaultValue === undefined) {
        throw "Settings need 'defaultValue' members";
    }
    if (!validators[setting.type](setting.defaultValue)) {
        throw "Default value " + setting.defaultValue + " is not a valid " + setting.type;
    }
    settings.push(setting);
};

/**
 * The default initial settings
 */
function defaultSettings() {
    var defaultSettings = {};
    settings.forEach(function(setting) {
        defaultSettings[setting.name] = setting.defaultValue;
    });
    return defaultSettings;
}

/**
 * A base class for all the various methods of storing settings.
 */
exports.InMemorySettings = SC.Object.extend({
    /**
     * We cache the current settings. We are likely to expose this to bindings
     */
    values: {},

    /**
     * Setup the default settings
     */
    init: function() {
        // We delay this because publishing to a bunch of things can cause lots
        // of objects to be created, and it's a bad idea to do that while a core
        // component (i.e. settings) is being created.
        setTimeout(function() {
            this._loadInitialValues();
        }.bind(this), 10);
    },

    /**
     * Change the value of the <code>key</code> setting to <code>value</code>.
     */
    setValue: function(key, value) {
        this.values[key] = value;
        this._changeValue(key, value);
        bespin.publish("settings:set:" + key, { value: value });
    },

    /**
     * Retrieve the value of the <code>key</code> setting.
     */
    getValue: function(key) {
        return this.values[key];
    },

    /**
     * Reset the value of the <code>key</code> setting to it's default
     */
    resetValue: function(key) {
        // TODO: implement this properly
        delete this.values[key];
    },

    /**
     * Retrieve a list of the known settings and their values
     */
    list: function() {
        var settings = [];
        for (var prop in this.values) {
            if (this.values.hasOwnProperty(prop)) {
                settings.push({ 'key': prop, 'value': this.values[prop] });
            }
        }
        return settings;
    },

    /**
     * Checks to see if the passed value is "on" or "true" (case sensitive).
     * NOTE: This DOES NOT use settings it just does a string comparison. To
     * test a setting you probably need #isSettingOn() and #isSettingOff().
     */
    isValueOn: function(value) {
        return value == 'on' || value == 'true';
    },

    /**
     * Checks to see if the passed value is "off" or "false" (case sensitive) or
     * <code>undefined</code>.
     * NOTE: This DOES NOT use settings it just does a string comparison. To
     * test a setting you probably need #isSettingOn() and #isSettingOff().
     */
    isValueOff: function(value) {
        return value == 'off' || value == 'false' || value === undefined;
    },

    /**
     * Check to see if the given setting is on (using #isValueOn())
     */
    isSettingOn: function(key) {
        return this.isValueOn(this.getValue(key));
    },

    /**
     * Check to see if the given setting is off (using #isValueOff())
     */
    isSettingOff: function(key) {
        return this.isValueOff(this.getValue(key));
    },

    /**
     * Like #setValue() except that the value is assumed to be an object that
     * should be converted to JSON.
     */
    setObject: function(key, value) {
        this.setValue(key, JSON.stringify(value));
    },

    /**
     * Like #getValue() except that the value is assumed to be an object that
     * should be converted from JSON before being returned.
     */
    getObject: function(key) {
        try {
            return JSON.parse(this.getValue(key));
        } catch(e) {
            console.log("Error in getObject: " + e);
            return {};
        }
    },

    /**
     * Subclasses should overload this.
     * Called whenever a value changes, which allows persistent subclasses to
     * take action to persist the new value
     */
    _changeValue: function(key, value) {
    },

    /**
     * Subclasses should overload this, probably calling _loadDefaultValues()
     * as part of the process before user values are included.
     */
    _loadInitialValues: function() {
        this._loadDefaultValues();
    },

    /**
     * Prime the local cache with the defaults.
     */
    _loadDefaultValues: function() {
        this._loadFromObject(defaultSettings());
    },

    /**
     * Utility to load settings from an object
     */
    _loadFromObject: function(data) {
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                this.setValue(key, data[key]);
            }
        }
    },

    /**
     * Utility to grab all the settings and export them into an object
     */
    _saveToObject: function() {
        var reply = {};
        for (var key in this.values) {
            if (this.values.hasOwnProperty(key)) {
                reply[key] = this.values[key];
            }
        }
        return reply;
    }
});

/**
 * Save the settings in a cookie
 * This code has not been tested since reboot
 */
exports.CookieSettings = exports.InMemorySettings.extend({
    _loadInitialValues: function() {
        this.sc_super();
        var data = cookie.get("settings");
        this._loadFromObject(JSON.parse(data));
    },

    _changeValue: function(key, value) {
        var data = JSON.stringify(this._saveToObject());
        cookie.set("settings", data);
    }
});

/**
 * Save the settings using the server.
 * This code has not been tested since reboot
 */
exports.ServerSettings = exports.InMemorySettings.extend({
    _loadInitialValues: function() {
        this.sc_super();
        bespin.get('server').listSettings(function(settings) {
            this._loadFromObject(settings);
        }.bind(this));

        var onLoad = function(file) {
            // Strip \n\n from the end of the file and insert into this.settings
            file.content.split(/\n/).forEach(function(setting) {
                if (setting.match(/^\s*#/)) {
                    return; // if comments are added ignore
                }
                if (setting.match(/\S+\s+\S+/)) {
                    var pieces = setting.split(/\s+/);
                    this.setValue(pieces[0].trim(), pieces[1].trim());
                }
            });
        };

        bespin.get('files').loadContents(bespin.userSettingsProject, "settings", onLoad);
    },

    _changeValue: function(key, value) {
        // Aggregate the settings into a file
        var settings = "";
        for (var key in this.values) {
            if (this.values.hasOwnProperty(key)) {
                settings += key + " " + this.values[key] + "\n";
            }
        }
        // Send it to the server
        bespin.get('files').saveFile(bespin.userSettingsProject, {
            name: "settings",
            content: settings,
            timestamp: new Date().getTime()
        });
    }
});
