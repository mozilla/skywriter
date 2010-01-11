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
 * <li>Ensure that values can be bound in a SC sense
 * <li>Convert all subscriptions to bindings.
 * <li>Implement HTML5 storage option
 * <li>Make all settings have a 'description' member and use that in set|unset
 * commands.
 * <li>When the command system is re-worked to include more GUI interaction,
 * expose data in settings to that system.
 * </ul>
 *
 * <p>For future versions of the API it might be better to decrease the
 * dependency on settings, and increase it on the system with a setting.
 * e.g. Now:
 * <pre>
 * settings.addSetting({ name:"foo", ... });
 * settings.values.foo = "bar";
 * </pre>
 * <p>Vs the potentially better:
 * <pre>
 * var foo = settings.addSetting({ name:"foo", ... });
 * foo.value = "bar";
 * </pre>
 * <p>Comparison:
 * <ul>
 * <li>The latter version gains by forcing access to the setting to be through
 * the module providing it, so there wouldn't be any hidden dependencies.
 * <li>It's also more compact.
 * <li>It could provide access to to other methods e.g. <tt>foo.reset()</tt>
 * and <tt>foo.onChange(function(val) {...});</tt> (but see SC binding)
 * <li>On the other hand dependencies are so spread out right now that it's
 * probably hard to do this easily. We should move to this in the future.
 * </ul>
 */

var SC = require("sproutcore/runtime").SC;
var util = require("bespin:util/util");

/**
 * A base class for all the various methods of storing settings.
 * <p>Usage:
 * <pre>
 * // Create manually, or require 'settings' from the container.
 * // This is the manual version:
 * var settingsMod = require("settings");
 * var settings = settingsMod.InMemorySettings.create();
 * // Add a new setting
 * settings.addSetting({ name:"foo", ... });
 * // Display the default value
 * alert(settings.values.foo);
 * // Alter the value, which also publishes the change etc.
 * settings.values.foo = "bar";
 * // Reset the value to the default
 * settings.resetValue("foo");
 * </pre>
 * @class
 */
exports.InMemorySettings = SC.Object.extend({
    /**
     * The current settings.
     */
    values: {},

    /**
     * Our store of the settings that we accept.
     */
    _settings: {},

    /**
     * Setup the default settings
     * @constructs
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
     * Reset the value of the <code>key</code> setting to it's default
     */
    resetValue: function(key) {
        var setting = this._settings[key];
        if (setting) {
            this.values[key] = setting.defaultValue;
        } else {
            delete this.values[key];
        }
    },

    /**
     * Retrieve a list of the known settings and their values
     */
    list: function() {
        var reply = [];
        for (var prop in this.values) {
            if (this.values.hasOwnProperty(prop)) {
                reply.push({ 'key': prop, 'value': this.values[prop] });
            }
        }
        return reply;
    },

    /**
     * Function to add to the list of available settings.
     * <p>Example usage:
     * <pre>
     * bepsin.get("settings").addSetting({
     *     name: "tabsize", // For use in settings.values.X
     *     type: "number",  // To allow value checking. See #_types
     *     defaultValue: 4  // Default value for use when none is directly set
     * });
     * </pre>
     * @param {object} setting Object containing name/type/defaultValue members.
     */
    addSetting: function(setting) {
        if (!setting.name) {
            throw "Settings need 'name' members";
        }
        if (!this._types[setting.type]) {
            throw "setting.type should be one of [number|boolean|text|object]. Got " + setting.type;
        }
        if (!setting.defaultValue === undefined) {
            throw "Settings need 'defaultValue' members";
        }
        if (!this._types[setting.type].validator(setting.defaultValue)) {
            throw "Default value " + setting.defaultValue +
                    " is not a valid " + setting.type;
        }
        // Recall the setting
        this._settings[setting.name] = setting;
        // Set the default value up. We do this before __defineSetter__ because
        // we don't want to publish the change to everyone. This might not be
        // the correct behavior. Need experience to tell.
        this.values["_" + setting.name] = setting.defaultValue;

        // Add a setter to values so subclasses can save, and we can publish
        // This also remaps name to _name so we need the getter below too
        this.values.__defineSetter__(setting.name, function(value) {
            this.values["_" + setting.name] = value;
            this._changeValue(setting.name, value);
        }.bind(this));
        // Add a getter to values we can remap to the _name version
        this.values.__defineGetter__(setting.name, function(value) {
            this.values["_" + setting.name] = value;
        }.bind(this));
    },

    /**
     * These are the types that we accept. They are vaguely based on the Jetpack
     * settings system (https://wiki.mozilla.org/Labs/Jetpack/JEP/24) although
     * clearly more restricted.
     * <p>If you alter this list, remember to alter the error message in
     * #addSetting() to reflect the altered list of types.
     * In addition to these types, Jetpack also accepts range, member, password
     * that we are thinking of adding in the short term.
     */
    _types: {
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
        this._loadFromObject(this._defaultValues());
    },

    /**
     * Utility to load settings from an object
     */
    _loadFromObject: function(data) {
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var value = data[key];
                // We don't ignore values that are not associated with a setting
                // so if there is no setting, just use the string value
                var setting = this._settings[key];
                if (setting) {
                    value = this._types[setting.type].fromString(value);
                }
                this.values[key] = value;
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
                var value = this.values[key];
                // We don't delete values that are not associated with a setting
                // so if there is no setting, just use value.toString()
                var setting = this._settings[key];
                if (setting) {
                    reply[key] = this._types[setting.type].toString(value);
                } else {
                    reply[key] = "" + value;
                }
            }
        }
        return reply;
    },

    /**
     * The default initial settings
     */
    _defaultValues: function() {
        var defaultValues = {};
        for (var name in this._settings) {
            if (this._settings.hasOwnProperty(name)) {
                var setting = this._settings[name];
                defaultValues[setting.name] = setting.defaultValue;
            }
        }
        return defaultValues;
    }
});

/**
 * Save the settings in a cookie
 * This code has not been tested since reboot
 * @class
 * @augments exports.InMemorySettings
 */
exports.CookieSettings = exports.InMemorySettings.extend(/** @lends exports.CookieSettings */{
    _loadInitialValues: function() {
        this._loadDefaultValues();
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
 * @class
 * @augments exports.InMemorySettings
 */
exports.ServerSettings = exports.InMemorySettings.extend(/** @lends exports.ServerSettings */ {
    requires: {
        files: 'files'
    },

    _loadInitialValues: function() {
        this._loadDefaultValues();

        var onLoad = function(file) {
            // Strip \n\n from the end of the file and insert into this.settings
            file.content.split(/\n/).forEach(function(setting) {
                if (setting.match(/^\s*#/)) {
                    return; // if comments are added ignore
                }
                if (setting.match(/\S+\s+\S+/)) {
                    var pieces = setting.split(/\s+/);
                    this.values[pieces[0].trim()] = pieces[1].trim();
                }
            });
        };

        this.files.loadContents(this.files.userSettingsProject, "settings", onLoad);
    },

    _changeValue: function(key, value) {
        // Aggregate the settings into a file
        var content = "";
        for (var key in this.values) {
            if (this.values.hasOwnProperty(key)) {
                content += key + " " + this.values[key] + "\n";
            }
        }
        // Send it to the server
        this.files.saveFile(this.files.userSettingsProject, {
            name: "settings",
            content: content,
            timestamp: new Date().getTime()
        });
    }
});
