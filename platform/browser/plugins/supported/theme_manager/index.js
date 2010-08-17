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

var Promise = require('bespin:promise').Promise;
var catalog = require('bespin:plugins').catalog;
var Event = require('events').Event;
var themestyles = require('themestyles');
var settings = require('settings').settings;

// The current themeExt used on the page.
var currentThemeExt = null;

// Name of the themePlugin that is used as standard theme. This is not the
// base theme.
var standardThemeName = null;

// Load promise for the basePlugin.
var basePluginLoadPromise = null;

// Export the themeStyles object. This is necessary, as in some cases you want
// to access the themeStyles object when the `themeChange` event was fired.
exports.themestyles = themestyles;

exports.themeSettingChanged = function(source, settingName, themeName) {
    // Get the themeExtensionPoint for 'themeName'
    var themeExt = catalog.getExtensionByKey('theme', themeName);

    // 'themeName' === standard : Remove the current set theme.
    // !themeName || !themeExt  : The named theme couldn't get found
    if (themeName === 'standard' || !themeName || !themeExt) {
        themeExt = null;
        // If a standardTheme is given, try to get it.
        if (standardThemeName !== null) {
            themeExt = catalog.getExtensionByKey('theme', standardThemeName);

        }
    }

    // If no theme should get applied (including no standardTheme).
    if (!themeExt) {
        // If there is a currentTheme before switching to 'standard' which means
        // removing the currentTheme as applied on the page.
        if (currentThemeExt) {
            // There might be a themeStyle file to remove.
            themestyles.unregisterThemeStyles(currentThemeExt);

            currentThemeExt = null;

            // Reset the themeVariables applied by the theme.
            themestyles.currentThemeVariables = null;

            // Update the globalVariables.
            themestyles.parseGlobalVariables();

            // Reparse all the applied themeStyles.
            themestyles.reparse();

            // Publish the 'themeChange' event.
            catalog.publish(this, 'themeChange');
        }
        return;
    } else {
        themeExt.load().then(function(theme) {
            // Remove the former themeStyle file, if the former extension has
            // one declaired.
            if (currentThemeExt) {
                themestyles.unregisterThemeStyles(currentThemeExt);
            }

            // The theme is a function. Execute it to get the themeData.
            themestyles.currentThemeVariables = theme();

            // Store the data for later use.
            currentThemeExt = themeExt;

            // Update the globalVariables.
            themestyles.parseGlobalVariables();

            // Reparse all the applied themeStyles.
            themestyles.reparse();

            // If the theme has a url that points to a themeStyles file, then
            // register it.
            if (themeExt.url) {
                themestyles.registerThemeStyles(themeExt);
            }

            // Publish the 'themeChange' event.
            catalog.publish(exports, 'themeChange');
        });
    }
};

catalog.registerExtension('settingChange', {
    match: "theme",
    pointer: exports.themeSettingChanged.bind(exports)
});

/**
 * Sets the standard theme that is used when no other theme is specified or
 * the specified theme is not around.
 */
exports.setStandardTheme = function(themeName) {
    standardThemeName = themeName;

    // If the current theme is equal to themeName, then the theme is already
    // applied. Otherwise, call themeSttingChanged which handles the standard-
    // theme change then.
    if (themeName !== settings.get('theme')) {
        exports.themeSettingChanged(this);
    }
};

/**
 * Sets the plugin that should get treated as 'basePlugin'. BasePlugins contains
 * the generic theming for buttons, inputs, panes etc.
 */
exports.setBasePlugin = function(pluginName) {
    // Set the basePlugin.
    themestyles.basePluginName = pluginName;
};

/**
 * This function has to be called to enable parsing. Before calling this
 * function, parsing is prevented. This allows the developer to prevent parsing
 * until certain basic theme plugins are loaded.
 * Returns a promise that is resolved after all currently applied themeStyles
 * are parsed.
 */
exports.startParsing = function() {
    // Allow the parsing.
    themestyles.preventParsing = false;

    // Reparse all the applied themeStyles.
    return themestyles.reparse();
};

exports.registerTheme = function(extension) {
    var currentThemeName = settings.get('theme');
    if (extension.name === currentThemeName) {
        exports.themeSettingChanged(this, 'theme', extension.name);
    }
};

exports.unregisterTheme = function(extension) {
    if (extension.name === settings.get('theme')) {
        exports.themeSettingChanged(this);
    }
};

// Called when the app is launched.
exports.appLaunched = function() {
    // Fire the `themeChange` event as some plugins might haven't triggered it
    // during the launch of the app.
    catalog.publish(exports, 'themeChange');
};
