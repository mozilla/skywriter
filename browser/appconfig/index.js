require.def(['require', 'exports', 'module',
    'thirdparty/jquery',
    'settings/index',
    'skywriter/promise',
    'skywriter/console',
    'skywriter/util/stacktrace',
    'skywriter/util/util',
    'skywriter/plugins',
    'environment',
    'theme_manager/index'
], function(require, exports, module,
    jquery,
    settingsMod,
    promise,
    consoleMod,
    stacktrace,
    util,
    plugins,
    environment,
    themeManager
) {

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
 * The Original Code is Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Skywriter Team (skywriter@mozilla.com)
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

exports.init = function() {
    var catalog = plugins.catalog;
    catalog.addExtensionPoint("appLaunched", { "description": "Event: Fired when the app is completely launched." });
};

exports.deinit = function() {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("appLaunched");
};

var $ = jquery.$;
var settings = settingsMod.settings;
var Promise = promise.Promise;
var console = consoleMod.console;
var Trace = stacktrace.Trace;


var firstSkywriter = true;

/*
 * launch Skywriter with the configuration provided. The configuration is
 * an object with the following properties:
 * - theme: an object with the basePlugin as string and the standardTheme as
 *          string. Both are optional. If no basePlugin is given, screen_theme
 *          is used if this exists.
 * - objects: an object with a collection of named objects that will be
 *            registered with the plugin catalog (see PluginCatalog.registerObject)
 *            This will automatically be augmented with sane defaults (for
 *            example, most Skywriter users want a text editor!)
 * - gui: instructions on how to build a GUI. Specifically, the current border
 *        layout positions will be filled in. Again this provides sane defaults.
 * - container: node to attach to (optional). If not provided a node will be
 *              created. and added to the body.
 * - settings: settings to preconfigure
 */
exports.launch = function(config) {
    var launchPromise = new Promise();

    // Remove the "Loading..." hint.
    $('#_skywriter_loading').remove();

    // This will hold the require function to get the catalog.
    var require;

    // Is this the fist Skywriter?
    if (firstSkywriter) {
        // Use the global require.
        // require = skywriter.tiki.require;
        firstSkywriter = false;
    } else {
        // Otherwise create a new tiki-skywriter sandbox and a new require function.
        // var sandbox = new (skywriter.tiki.require('skywriter:sandbox').Sandbox);
        // require = sandbox.createRequire({
        //     id: 'index',
        //     ownerPackage: skywriter.tiki.loader.anonymousPackage
        // });
    }

    // Here we go: Require the catalog that is used for this Skywriter instance.
    var catalog = plugins.catalog;

    // Launch Skywriter!
    config = config || {};
    exports.normalizeConfig(catalog, config);
    var objects = config.objects;
    for (var key in objects) {
        catalog.registerObject(key, objects[key]);
    }

    for (var setting in config.settings) {
        settings.set(setting, config.settings[setting]);
    }

    // Resolve the launchPromise and pass the env variable along.
    var resolveLaunchPromise = function() {
        var env = environment.env;

        var editor = env.editor;
        if (editor) {
            if (config.lineNumber) {
                editor.setLineNumber(config.lineNumber);
            }
            if (config.stealFocus) {
                editor.focus = true;
            }
            if (config.readOnly) {
                editor.readOnly = config.readOnly;
            }
            if (config.syntax) {
                editor.syntax = config.syntax;
            }
        }
        var commandLine = catalog.getObject('commandLine');
        if (commandLine) {
            env.commandLine = commandLine;
        }

        catalog.publish(this, 'appLaunched');

        launchPromise.resolve(env);
    }.bind(this);

    var themeLoadingPromise = new Promise();

    themeLoadingPromise.then(function() {
        if (objects.loginController) {
            catalog.createObject("loginController").then(
                function(loginController) {
                    var pr = loginController.showLogin();
                    pr.then(function(username) {
                        // Add the username as constructor argument.
                        config.objects.session.arguments.push(username);

                        exports.launchEditor(catalog, config).then(resolveLaunchPromise,
                                        launchPromise.reject.bind(launchPromise));
                    });
                });
        } else {
            exports.launchEditor(catalog, config).then(resolveLaunchPromise,
                                        launchPromise.reject.bind(launchPromise));
        }
    }, function(error) {
        launchPromise.reject(error);
    });

    // If the themeManager plugin is there, then check for theme configuration.
    if (catalog.plugins.theme_manager) {
        skywriter.tiki.require.ensurePackage('::theme_manager', function() {
            
            if (config.theme.basePlugin) {
                themeManager.setBasePlugin(config.theme.basePlugin);
            }
            if (config.theme.standard) {
                themeManager.setStandardTheme(config.theme.standard);
            }
            themeManager.startParsing().then(function() {
                themeLoadingPromise.resolve();
            }, function(error) {
                themeLoadingPromise.reject(error);
            });
        });
    } else {
        themeLoadingPromise.resolve();
    }

    return launchPromise;
};

exports.normalizeConfig = function(catalog, config) {
    if (config.objects === undefined) {
        config.objects = {};
    }
    if (config.autoload === undefined) {
        config.autoload = [];
    }
    if (config.theme === undefined) {
        config.theme = {};
    }
    if (!config.theme.basePlugin && catalog.plugins.screen_theme) {
        config.theme.basePlugin = 'screen_theme';
    }
    if (!config.initialContent) {
        config.initialContent = '';
    }
    if (!config.settings) {
        config.settings = {};
    }

    if (!config.objects.notifier && catalog.plugins.notifier) {
        config.objects.notifier = {
        };
    }

    if (!config.objects.loginController && catalog.plugins.userident) {
        config.objects.loginController = {
        };
    }
    if (!config.objects.fileHistory && catalog.plugins.file_history) {
        config.objects.fileHistory = {
            factory: 'file_history',
            arguments: [
                "session"
            ],
            objects: {
                "0": "session"
            }
        };
    }
    if (!config.objects.server && catalog.plugins.skywriter_server) {
        config.objects.server = {
            factory: "skywriter_server"
        };
        config.objects.filesource = {
            factory: "skywriter_filesource",
            arguments: [
                "server"
            ],
            objects: {
                "0": "server"
            }
        };
    }
    if (!config.objects.files && catalog.plugins.filesystem &&
        config.objects.filesource) {
        config.objects.files = {
            arguments: [
                "filesource"
            ],
            "objects": {
                "0": "filesource"
            }
        };
    }
    if (!config.objects.editor) {
        config.objects.editor = {
            factory: "text_editor",
            arguments: [
                config.initialContent
            ]
        };
    }
    if (!config.objects.session) {
        config.objects.session = {
            arguments: [
                "editor"
            ],
            "objects": {
                "0": "editor"
            }
        };
    }
    if (!config.objects.commandLine && catalog.plugins.command_line) {
        config.objects.commandLine = {
        };
    }
    if (!config.objects.toolbar && catalog.plugins.toolbar) {
        config.objects.toolbar = {};
    }

    if (config.gui === undefined) {
        config.gui = {};
    }

    var alreadyRegistered = {};
    for (var key in config.gui) {
        var desc = config.gui[key];
        if (desc.component) {
            alreadyRegistered[desc.component] = true;
        }
    }

    if (!config.gui.north && config.objects.toolbar
        && !alreadyRegistered.toolbar) {
        config.gui.north = { component: "toolbar" };
    }
    if (!config.gui.center && config.objects.editor
        && !alreadyRegistered.editor) {
        config.gui.center = { component: "editor" };
    }
    if (!config.gui.south && config.objects.commandLine
        && !alreadyRegistered.commandLine) {
        config.gui.south = { component: "commandLine" };
    }
};

exports.launchEditor = function(catalog, config) {
    var retPr = new Promise();

    if (config === null) {
        var message = 'Cannot start editor without a configuration!';
        console.error(message);
        retPr.reject(message);
        return retPr;
    }

    var pr = createAllObjects(catalog, config);
    pr.then(function() {
        generateGUI(catalog, config, retPr);
    }, function(error) {
        console.error('Error while creating objects');
        new Trace(error).log();
        retPr.reject(error);
    });

    return retPr;
};

var createAllObjects = function(catalog, config) {
    var promises = [];
    for (var objectName in config.objects) {
        promises.push(catalog.createObject(objectName));
    }
    return Promise.group(promises);
};

var generateGUI = function(catalog, config, pr) {
    var error;

    var container = document.createElement('div');
    container.setAttribute('class', 'container');

    var centerContainer = document.createElement('div');
    centerContainer.setAttribute('class', 'center-container');
    var centerAdded = false;

    var element = config.element || document.body;
    // Add the 'skywriter' class to the element in case it doesn't have this already.
    util.addClass(element, 'skywriter');
    element.appendChild(container);
    
    // this shouldn't be necessary, but it looks like Firefox has an issue
    // with the box-ordinal-group CSS property
    ['north', 'west', 'center', 'east', 'south'].forEach(function(place) {
        var descriptor = config.gui[place];
        if (!descriptor) {
            return;
        }

        var component = catalog.getObject(descriptor.component);
        if (!component) {
            error = 'Cannot find object ' + descriptor.component +
                            ' to attach to the Skywriter UI';
            console.error(error);
            pr.reject(error);
            return;
        }

        element = component.element;
        if (!element) {
            error = 'Component ' + descriptor.component + ' does not have' +
                          ' an "element" attribute to attach to the Skywriter UI';
            console.error(error);
            pr.reject(error);
            return;
        }

        $(element).addClass(place);

        if (place == 'west' || place == 'east' || place == 'center') {
            if (!centerAdded) {
                container.appendChild(centerContainer);
                centerAdded = true;
            }
            centerContainer.appendChild(element);
        } else {
            container.appendChild(element);
        }

        // Call the elementAppended event if there is one.
        if (component.elementAppended) {
            component.elementAppended();
        }
    });

    pr.resolve();
};

});
