/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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

var catalog = require('bespin:plugins').catalog;
var Event = require('events').Event;
var ThemeStyles = require('themestyles');
var settings = require('settings').settings;

exports._currentThemeExtension = null;

exports.themeEvent = Event();

exports.themeSettingDidChanged = function(settingName, themeName) {
    var theme = catalog.getExtensionByKey('theme', themeName);

    if (themeName === 'standard') {
        if (exports._currentThemeExtension) {
            ThemeStyles.unregisterThemeStyles(exports._currentThemeExtension);
        }

        exports._currentThemeExtension = undefined;

        var themeVariableExt = catalog.getExtensions('themevariable');
        themeVariableExt.forEach(function(extension) {
            if (extension.value) {
                extension.value = undefined;
                ThemeStyles.parsePlugin(extension.getPluginName());
            }
        });

        exports.themeEvent();

        return;
    }

    if (!themeName || !theme) {
        // request.doneWithError('Couldn\'t find a theme for the name: ' + themeName);
        return;
    }

    theme.load().then(function(extension) {
        // Remove the former themeStyle file, if the former extension has one declaired.
        if (exports._currentThemeExtension) {
            ThemeStyles.unregisterThemeStyles(exports._currentThemeExtension);
        }

        var data = extension();
        // Store the data for later use.
        exports._currentThemeExtension = theme;

        var themeVariableExt = catalog.getExtensions('themevariable');
        var newValue;
        themeVariableExt.forEach(function(extension) {
            if (data[extension._pluginName] && data[extension._pluginName][extension.name]) {
                newValue = data[extension._pluginName][extension.name];
            } else {
                newValue = undefined;
            }
            if (newValue !== extension.value) {
                extension.value = newValue;
                ThemeStyles.parsePlugin(extension._pluginName);
            }
        });

        catalog.publish('themeChange');

        // If the theme has a url that points to a themeStyles file, then register it.
        if (theme.url) {
            ThemeStyles.registerThemeStyles(theme);
        }
    }, function(err) {
        // request.doneWithError('Error while loading theme plugin: ' + err.message);
    });
};

catalog.registerExtension('settingChange', {
    match: "theme",
    pointer: exports.themeSettingDidChanged.bind(exports)
});

exports.registerTheme = function(extension) {
    var currentThemeName = settings.get('theme');
    if (extension.name === currentThemeName) {
        exports.themeSettingDidChanged();
    }
};

exports.unregisterTheme = function(extension) {
    if (extension.name === settings.get('theme')) {
        exports.themeSettingDidChanged('standard');
    }
};
