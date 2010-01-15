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
var choice = require("choice");

/**
 * A base class for all the various methods of storing settings.
 * <p>Usage:
 * <pre>
 * // Create manually, or require 'settings' from the container.
 * // This is the manual version:
 * var choice = require("Settings:choice");
 * // Add a new setting
 * choice.addChoice({ name:"foo", ... });
 * // Display the default value
 * var settings = require("bespin:plugins").catalog.getObject("settings");
 * alert(settings.values.foo);
 * // Alter the value, which also publishes the change etc.
 * settings.values.foo = "bar";
 * // Reset the value to the default
 * settings.resetValue("foo");
 * </pre>
 * @class
 */
exports.MemorySettings = SC.Object.extend({
    /**
     * The current settings.
     */
    values: {},

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
        var setting = choice._settings[key];
        if (setting) {
            this.values[key] = setting.defaultValue;
        } else {
            delete this.values[key];
        }
    },

    /**
     * Retrieve a list of the known settings and their values
     */
    _list: function() {
        var reply = [];
        for (var prop in this.values) {
            if (this.values.hasOwnProperty(prop)) {
                reply.push({ 'key': prop, 'value': this.values[prop] });
            }
        }
        return reply;
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
                var setting = choice._settings[key];
                if (setting) {
                    value = choice._types[setting.type].fromString(value);
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
                var setting = choice._settings[key];
                if (setting) {
                    reply[key] = choice._types[setting.type].toString(value);
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
        for (var name in choice._settings) {
            if (choice._settings.hasOwnProperty(name)) {
                var setting = choice._settings[name];
                defaultValues[setting.name] = setting.defaultValue;
            }
        }
        return defaultValues;
    }
});
