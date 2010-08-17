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

var util = require('bespin:util/util');
var catalog = require('bespin:plugins').catalog;
var console = require('bespin:console').console;
var Promise = require('bespin:promise').Promise;
var group = require('bespin:promise').group;

var proxy = require('bespin:proxy');

var less = require('less');

// The less parser to use.
var lessParser = new less.Parser({ optimization: 3 });

// The incremented styleID number.
var styleID = 1;

// The theme variables as set by the current theme.
exports.currentThemeVariables = null;

// The plugin that should get applied before any other plugins get applied.
exports.basePluginName = null;

// If true, no less file is parsed.
exports.preventParsing = true;

// Stores the variableHeader used by every themeStyleFile for the global
// ThemeVariables.
var globalVariableHeader = '';

// The globalThemeVariables as a combination of the build in once and variables
// defined in a custom theme plugin.
exports.globalThemeVariables = {};

// Stores the internal styleID used with a extension.
var extensionStyleID = {};

// Stores the ThemeStyleFiles' content per plugin - somewhat like a par plugin
// themeStyle cache.
var extensionStyleData = {};

// Takes an JS object that and makes it 'linear'. Every item gets prefixed with
// 'global':
//
//      globalValues = {
//          a: {
//              b: 'test'
//          }
//      }
//
//      returns: { 'global_a_b': 'test' }
var parseGlobalThemeVariables = function(globalValues) {
    var ret = {};
    var nameStack = [];

    var parseSub = function(name, key) {
        nameStack.push(name);
        if (typeof key != 'object') {
            ret[nameStack.join('_')] = key;
        } else {
            for (prop in key) {
                parseSub(prop, key[prop]);
            }
        }
        nameStack.pop();
    };

    parseSub('global', globalValues);
    return ret;
};

//------------------------------------------------------------------------------
// BEGIN: THIS PART IS OVERRIDDEN BY dryice

// Stores the StyleFiles content per plugin during the build of Bespin.
// The variable scheme looks like: { pluginName: { "fileName": data } };
var extensionStyleBuildData = {};

// Stores the default globalTheme ThemeVariables, that are available to every
// ThemeStyleFile.
var defaultGlobalTheme = {
    // standard font.
    font:           'arial, lucida, helvetica, sans-serif',
    // standard font size.
    font_size:      '14px',
    // standard line_height.
    line_height:    '1.8em',
    // text color.
    color:          '#DAD4BA',

    text_shadow:    '1px 1px rgba(0, 0, 0, 0.4)',
    // text error color.
    error_color:    '#F99',
    // the color for headers (<h1> etc).
    header_color:   'white',
    // the color for links.
    link_color:     '#ACF',

    // Basic colors for a controller: textInput, tree etc.
    control: {
        color:          '#E1B41F',
        border:         '1px solid rgba(0, 0, 0, 0.2)',
        border_radius:  '0.25em',
        background:     'rgba(0, 0, 0, 0.2)',

        active: {
            color:          '#FF9600',
            border:         '1px solid #E1B41F',
            inset_color:    '#ff9600',
            background:     'rgba(0, 0, 0, 0.2)'
        }
    },

    pane: {
        h1: {
           font:        "'MuseoSans', Helvetica",
           font_size:   '2.8em',
           color:       "white"
        },

        color:          '#DAD4BA',
        text_shadow:    '1px 1px rgba(0, 0, 0, 0.4)',

        link_color:     'white',

        background:     '#45443C',
        border_radius:  '.5em'
    },

    form: {
        color: 'white',
        text_shadow: '1px 1px rgba(0, 0, 0, 0.4)',

        font: "'Lucida Sans','Lucida Grande',Verdana,Arial,sans-serif",
        font_size: '@global_font_size',
        line_height: '@global_line_height'
    },

    button: {
        color: 'white',
        background: '#3E6CB9'
    },

    container: {
        background:     '#1E1916',
        border:         '1px solid black'
    },

    // The items in the command line menu or something else,
    // that can get selected.
    selectable: {
        color:          'white',
        border:         '0px solid transparent',
        background:     'transparent',

        active: {
            color:          'black',
            border:         '0px solid transparent',
            background:     '#FF8E00'
        },

        hover: {
            color:          'black',
            border:         '0px solid transparent',
            background:     '#FF8E00'
        }
    },

    // A small hint text.
    hint: {
        color:          '#AAA',

        active: {
            color:      'black'
        },

        hover: {
            color:      'black'
        }
    },

    // E.g. in the command line menu, the 'ALT+2'.
    accelerator: {
        color:          '#996633',

        active: {
            color:      'black'
        },

        hover: {
            color:      'black'
        }
    },

    menu: {
        border_color:           'black',
        inset_color_right:      '#1E1916',
        inset_color_top_left:   '#3E3936',
        background:             'transparent'
    }
};

defaultGlobalTheme = parseGlobalThemeVariables(defaultGlobalTheme);

// END: THIS PART IS OVERRIDDEN BY dryice
//------------------------------------------------------------------------------

/**
 * Returns an object with all the themeVariables value for a given plugin.
 */
exports.getPluginThemeVariables = function(pluginName) {
    var plugin = catalog.plugins[pluginName];

    if (!plugin) {
        return null;
    }

    // Hash to look for custom theme variables.
    var themeVariables = {};
    if (exports.currentThemeVariables &&
            exports.currentThemeVariables[pluginName]) {
        themeVariables = exports.currentThemeVariables[pluginName];
    }

    // Set the value for all themeVariables in this plugin.
    plugin.provides.forEach(function(ext) {
        if (ext.ep === 'themevariable') {
            var value = ext.name;
            // The value is the customThemeVariable OR the defaultValue if the
            // customThemeVariable is not given.
            themeVariables[value] = themeVariables[value] || ext.defaultValue;
        }
    });

    return themeVariables;
};

/**
 * Update the globalThemeVariables. This is called whenever the theme changes.
 */
exports.parseGlobalVariables = function() {
    var globalObj = {};
    var globalHeader = '';
    var currentThemeVariables = exports.currentThemeVariables;

    util.mixin(globalObj, defaultGlobalTheme);

    if (currentThemeVariables  && currentThemeVariables['global']) {
        util.mixin(globalObj,
                    parseGlobalThemeVariables(currentThemeVariables['global']));
    }

    exports.globalThemeVariables = globalObj;

    for (prop in globalObj) {
        globalHeader += '@' + prop + ':' + globalObj[prop] + ';';
    }

    globalVariableHeader = globalHeader;
};

// Parse the globalThemeVariables.
exports.parseGlobalVariables();

/**
 * Parse one less files.
 */
var parseLess = function(pr, pluginName, variableHeader) {
    // Use already existing DOM style element or create a new one on the page.
    if (extensionStyleID[pluginName]) {
        styleElem = document.getElementById('_bespin_theme_style_' +
                                                extensionStyleID[pluginName]);
    } else {
        styleElem = document.createElement('style');
        styleElem.setAttribute('id', '_bespin_theme_style_' + styleID);
        extensionStyleID[pluginName] = styleID;
        styleID ++;
        document.body.appendChild(styleElem);
    }

    // DEBUG ONLY.
    // var timer = new Date();

    // Parse the data.
    var dataToParse = globalVariableHeader + // global ThemeVariables
                            variableHeader + // plugin specific ThemeVariables
                            extensionStyleData[pluginName]; // and the data
    lessParser.parse(dataToParse, function(e, tree) {
        var errMsg;
        if (e) {
            errMsg = 'Error less parsing ' +  pluginName + ' ' +  e.message;
            console.error(errMsg);
            pr.reject(errMsg);
            return;
        }

        try {
            var css = tree.toCSS();

            // DEBUG ONLY.
            // console.log('  parsing took: ', (new Date()) - timer, 'ms');
        } catch (e) {
            errMsg = 'Error less parsing ' + pluginName + ' ' + e;
            console.error(errMsg);
            pr.reject(errMsg);
            return;
        }

        // Add the parsed CSS content in the styleElement.
        if (styleElem && styleElem.firstChild) {
            styleElem.firstChild.textContent = css;
        } else {
            var cssContentNode = document.createTextNode(css);
            styleElem.appendChild(cssContentNode);
        }
        pr.resolve();
    });
};

// Queue with all the plugins waiting to get updated.
var parseQueue = {};

/**
 * Parse the less files for a entire plugin. The plugin is not parsed directly,
 * but with a small delay. Otherwise it could happen that the plugin is parsed
 * although not all themeVariables are available.
 * Returns a promise that is resolved after the plugin is successfully parsed.
 * An error during parsing rejects the promise.
 */
exports.parsePlugin = function(pluginName) {
    // Parse only if this is permitted.
    if (exports.preventParsing) {
        return (new Promise).resolve();
    }

    var plugin = catalog.plugins[pluginName];

    if (!plugin) {
        throw "reparsePlugin: plugin " + pluginName + " is not defined!";
    }

    // Start parsing only if it isn't started already.
    if (!parseQueue[pluginName]) {
        // Mark that the plugin is queued.
        parseQueue[pluginName] = new Promise();

        setTimeout(function() {
            // DEBUG ONLY:
            // console.log('=== Parse Plugin: ' + pluginName + ' ===');
            // var time = new Date();

            var themeVariables = exports.getPluginThemeVariables(pluginName);

            // Store the StyleVariables for the StyleData to parse.
            var variableHeader = '';

            for (prop in themeVariables) {
                variableHeader += '@' + prop + ':' + themeVariables[prop] + ';';
            }

            // DEBUG ONLY:
            // console.log('  variables: ', variableHeader, globalVariableHeader);

            var parsePr = new Promise;
            parsePr.then(function(data) {
                parseQueue[this.name].resolve(data);
                parseQueue[this.name] = null;
            }.bind(this), function() {
                parseQueue[this.name].reject(data);
                parseQueue[this.name] = null;
            }.bind(this))

            parseLess(parsePr, pluginName, variableHeader);

            // DEBUG ONLY:
            // console.log('everything took: ', (new Date()) - time, 'ms');
        }.bind(plugin), 0);
    }

    return parseQueue[pluginName];
};

// Function that pocesses the loaded StyleFile content.
var processStyleContent = function(resourceURL, pluginName, data, p) {
    // Convert url(something) to url(resourceURL/something).
    data = data.replace(/url\(['"]*([^'")]*)(['"]*)\)/g,
                                      'url(' + resourceURL + '$1)');
    extensionStyleData[pluginName] += data;

    // Resolve the promise when given.
    if (p) {
        p.resolve();
    }
};

var themeDataLoadPromise = null;

exports.registerThemeStyles = function(extension) {
    var pluginName = extension.getPluginName();
    var resourceURL = catalog.getResourceURL(pluginName);

    // Make the extension.url parameter an array if it isn't yet.
    if (!(extension.url instanceof Array)) {
        extension.url = [ extension.url ];
    }

    // (Re)set the loaded StyleData for the plugin.
    extensionStyleData[pluginName] = '';

    var loadPromises = [];

    var preventParsing = exports.preventParsing;

    // Load the StyleFiles.
    extension.url.forEach(function(styleFile) {
        if (extensionStyleBuildData[pluginName] &&
                extensionStyleBuildData[pluginName][styleFile]) {
            // Process the StyleContent.
            processStyleContent(resourceURL, pluginName,
                                extensionStyleBuildData[pluginName][styleFile]);
        } else {
            var p = new Promise();
            loadPromises.push(p);

            var url = resourceURL + styleFile + '?' + (new Date).getTime();
            proxy.xhr('GET', url, true, function(xhr) {
                xhr.overrideMimeType('text/plain');
            }).then(function(response) {
                  processStyleContent(resourceURL, pluginName, response, p);
            }, function(err) {
                console.error('registerLessFile: Could not load ' +
                        resourceURL + styleFile);

                // The file couldn't get loaded but to make the group
                // work we have to mark this loadPromise as resolved so that
                // at least the other sucessfully loaded files can get
                // proceeded.
                p.resolve();
            });
        }
    });

    if (loadPromises.length === 0) {
        exports.parsePlugin(pluginName);
    } else {
        // If parsing is allowed, then wait until all the styleFiles are loaded
        // and parse the plugin.
        if (!preventParsing) {
            group(loadPromises).then(function() {
                exports.parsePlugin(pluginName);
            });
        }

        if (themeDataLoadPromise !== null) {
            loadPromises = loadPromises.concat(themeDataLoadPromise);
        }
        themeDataLoadPromise = group(loadPromises);
    }
};

/**
 * Call this function to reparse all the ThemeStyles files.
 * Returns a promise. The promise is resolved after all themeStyles are reparsed.
 */
exports.reparse = function() {
    var pr = new Promise();

    // Reparse only if this is permitted.
    if (exports.preventParsing) {
        return pr.resolve();
    }

    // Reparsing makes only sense if there is a themeDataLoadPromise.
    // If the value is null, then no styleFile was loaded and there is nothing
    // to reparse.
    if (themeDataLoadPromise) {
        // When all the styleFiles are loaded.
        themeDataLoadPromise.then(function() {
            var parsePromises = [];

            // Reparese all the themeStyles. Instead of loading the themeStyles
            // again from the server, the cache extensionStyleData is used.
            // Every plugin in this cache is reparsed.

            // Check if a basePlugin is set and parse this one first.
            var basePluginName = exports.basePluginName;
            if (basePluginName !== null && extensionStyleData[basePluginName]) {
                parsePromises.push(exports.parsePlugin(basePluginName));
            }

            // Parse the other plugins.
            for (var pluginName in extensionStyleData) {
                // Skip the basePlugin as this is already parsed.
                if (pluginName === basePluginName) {
                    continue;
                }
                parsePromises.push(exports.parsePlugin(pluginName));
            }

            // After all themeStyles are parsed, resolve the returned promise.
            group(parsePromises).then(pr.resolve.bind(pr), pr.reject.bind(pr));
        }, function(err) {
            pr.reject(err);
        });
    } else {
        pr.resolve();
    }
    return pr;
};

/**
 * Unregister a themeStyle.
 * @param The extension to unregister.
 */
exports.unregisterThemeStyles = function(extension) {
    var pluginName = extension.getPluginName();
    if (!extensionStyleID[pluginName]) {
        return;
    }

    // Remove the style element from the page.
    var styleID = '_bespin_theme_style_' + extensionStyleID[pluginName];
    var styleElement = document.getElementById(styleID);
    styleElement.parentNode.removeChild(styleElement);

    // Remove the style reference.
    delete extensionStyleID[pluginName];
    // Remove the themeStyle cache.
    delete extensionStyleData[pluginName];
};
