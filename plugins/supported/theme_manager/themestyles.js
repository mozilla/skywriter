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
var console = require("bespin:console").console;

var server = require('bespin_server').server;
var less = require('less');

// The less parser to use.
var lessParser = new less.Parser({ optimization: 3 });

// The incremented styleID number.
var styleID = 1;

/**
 * Parse one less files.
 */
var parseExtension = function(extension, colorHeader) {
    var styleElem;

    if (extension._styleID) {
        styleElem = document.getElementById('_bespin_theme_style_' + extension._styleID);
    } else {
        styleElem = document.createElement('style');
        styleElem.setAttribute('id', '_bespin_theme_style_' + styleID);
        extension._styleID = styleID;
        styleID ++;
        document.body.appendChild(styleElem);
    }

    var timer = new Date();

    lessParser.parse(colorHeader + extension._data, function(e, tree) {
        if (e) {
            console.error("Error parsing ", extension._pluginName, extension.name, e.message);
            return;
        }

        try {
            var css = tree.toCSS();
            console.log('  parsing took: ', (new Date()) - timer, 'ms');
        } catch (e) {
            console.error("Error parsing ", extension._pluginName, extension.name, e);
            return;
        }

        if (styleElem && styleElem.firstChild) {
            styleElem.firstChild.textContent = css;
        } else {
            var cssContentNode = document.createTextNode(css);
            styleElem.appendChild(cssContentNode);
        }
    });
}

// Queue with all the plugins waiting to get updated.
var parseQueue = {};

/**
 * Parse the less files for a entire plugin.
 */
exports.parsePlugin = function(pluginName) {
    var plugin = catalog.plugins[pluginName];

    if (!plugin) {
        throw "reparsePlugin: plugin " + pluginName + " is not defined!";
    }

    if (!parseQueue[pluginName]) {
        parseQueue[pluginName] = true;
        setTimeout(function() {
            console.log('=== Parse Plugin: ' + pluginName + ' ===');
            var time = new Date();
            parseQueue[this.name] = false;

            // Get all the colors.
            var colorHeader = '';
            this.provides.forEach(function(extension) {
                if (extension.ep === 'themevariable') {
                    var value = extension.value || extension.defaultValue;
                    colorHeader += '@' + extension.name + ':' + value + ';';
                }
            });

            console.log('  variables: ' + colorHeader);

            this.provides.forEach(function(extension) {
                if (extension.ep === 'themestyles' || (
                        extension.ep === 'theme' && extension._data
                    )) {
                    console.log('  file: ' + extension.url);
                    parseExtension(extension, colorHeader);
                }
            });

            console.log('everything took: ', (new Date()) - time, 'ms');
        }.bind(plugin), 0);
    }
};

exports.registerThemeStyles = function(extension) {
    var resourceURL = catalog.plugins[extension.getPluginName()].resourceURL;

    if (!(extension.url instanceof Array)) {
        extension.url = [ extension.url ];
    }

    extension.url.forEach(function(file) {
        server.request('GET', resourceURL + file).then(function(response) {
            if (!extension._data) {
                extension._data = '';
            }

            // convert url(something) tor url(resourceURL/something).
            extension._data += response.replace(/url\(([^)]*)\)/g, 'url(' + resourceURL + '$1)');

            // parse the plugin.
            exports.parsePlugin(extension.getPluginName());
        }, function(err) {
            console.error('registerLessFile: Could not load ' + lessExtension.url);
        });
    })
};

exports.unregisterThemeStyles = function(extension) {
    if (!extension._styleID) {
        return;
    }

    var styleElem = document.getElementById('_bespin_theme_style_' + extension._styleID);
    styleElem.parentNode.removeChild(styleElem);
    extension._styleID = undefined;
};
