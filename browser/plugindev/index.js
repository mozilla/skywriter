require.def(['require', 'exports', 'module',
    'skywriter/console',
    'plugindev/core_test',
    'core_test/assert',
    'core_test/test',
    'plugindev/environment',
    'plugindev/skywriter_server',
    'skywriter/plugins'
], function(require, exports, module,
    consoleMod,
    core_test,
    assert,
    test,
    environment,
    skywriter_server,
    plugins
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
    catalog.connect("themestyles", module.id, { "url": "plugindev.less" });
    catalog.connect("command", module.id, {
        "name": "plugin reload",
        "params": [
            {
                "name": "plugin",
                "type": {
                    "name": "selection",
                    "pointer": "plugindev:index#getPlugins"
                }
            }
        ],
        "description": "Reload the named plugin.",
        "pointer": "#reloadCommand"
    });
    catalog.connect("command", module.id, {
        "name": "test",
        "params": [
            {
                "name": "testmodule",
                "type": {
                    "name": "selection",
                    "pointer": "plugindev:index#getPlugins"
                },
                "description":
                    "Provide a plugin name to run all tests for a plugin, 'all' to run all known tests, or plugin:module to run the tests in a specific module. If you omit this, the last tests run will be run again.",
                "defaultValue": null
            }
        ],
        "description": "Run a collection of tests.",
        "pointer": "testing#testrunner"
    });
    catalog.connect("command", module.id, { "name": "plugin", "description": "Plugin management" });
    catalog.connect("command", module.id, {
        "name": "plugin add",
        "description":
            "Add a file or directory in your Skywriter files as a plugin.",
        "params": [
            {
                "name": "path",
                "type": "text",
                "description": "Path to a file or directory."
            }
        ],
        "pointer": "commands#add"
    });
    catalog.connect("command", module.id, {
        "name": "plugin list",
        "description": "List the installed plugins",
        "pointer": "commands#list"
    });
    catalog.connect("command", module.id, {
        "name": "plugin remove",
        "description":
            "Remove a plugin (deletes installed plugins, just removes the reference to 'add'ed plugins).",
        "params": [
            {
                "name": "plugin",
                "type": {
                    "name": "selection",
                    "pointer": "skywriter:plugins#getUserPlugins"
                }
            }
        ],
        "pointer": "commands#remove"
    });
    catalog.connect("command", module.id, {
        "name": "plugin install",
        "description": "Install a plugin from a given URL",
        "params": [
            {
                "name": "plugin",
                "type": "text",
                "description":
                    "name (if in Gallery) or URL where the plugin can be found"
            }
        ],
        "pointer": "commands#install"
    });
    catalog.connect("command", module.id, {
        "name": "plugin upload",
        "description": "Upload a plugin you've created to the plugin gallery.",
        "params": [
            {
                "name": "pluginName",
                "type": "text",
                "description": "name of the plugin to upload"
            }
        ],
        "pointer": "commands#upload"
    });
    catalog.connect("command", module.id, {
        "name": "plugin gallery",
        "description": "List the plugins in the Plugin Gallery",
        "pointer": "commands#gallery"
    });
    catalog.connect("command", module.id, {
        "name": "plugin order",
        "description": "Set the order of plugin extensions.",
        "params": [
            {
                "name": "order",
                "type": "text",
                "description":
                    "if given, set the plugin order, otherwise show the order",
                "defaultValue": null
            }
        ],
        "pointer": "commands#order"
    });
    catalog.connect("command", module.id, {
        "name": "plugin deactivate",
        "description": "Deactivate plugins.",
        "params": [
            {
                "name": "pluginNames",
                "type": {
                    "name": "selection",
                    "pointer": "plugindev:index#getUserActivePlugins"
                },
                "description": "Plugins to deactivate separated by a space",
                "defaultValue": ""
            }
        ],
        "pointer": "commands#deactivate"
    });
    catalog.connect("command", module.id, {
        "name": "plugin activate",
        "description": "Activate plugins.",
        "params": [
            {
                "name": "pluginNames",
                "type": {
                    "name": "selection",
                    "pointer": "plugindev:index#getUserDeactivatedPlugins"
                },
                "description": "Plugins to activate separated by a space",
                "defaultValue": ""
            }
        ],
        "pointer": "commands#activate"
    });
    catalog.connect("command", module.id, {
        "name": "plugin info",
        "description": "Display detailed information for a plugin",
        "params": [
            {
                "name": "pluginName",
                "type": "text",
                "description": "name of the plugin for which to display info"
            }
        ],
        "pointer": "commands#info"
    });
    catalog.connect("command", module.id, {
        "name": "ep",
        "description":
            "Display information about the extension points in this Skywriter",
        "params": [
            {
                "name": "ep",
                "type": "text",
                "description":
                    "(optional) name of an extension point for which to display details"
            }
        ],
        "pointer": "commands#ep"
    });
    catalog.connect("command", module.id, { "name": "debug", "description": "Commands useful for debugging" });
    catalog.connect("command", module.id, {
        "name": "debug syntaxcontexts",
        "description": "Displays the active contexts at the insertion point",
        "pointer": "debug#syntaxContexts"
    });
    catalog.connect("type", module.id, {
        "name": "pluginURL",
        "description": "a valid URL (http/https) from which to install a plugin",
        "pointer": "commands#pluginURL"
    });
};

exports.deinit = function() {
    catalog.disconnectAll(module.id);
};

var console = consoleMod.console;



var DefaultLogger = require('loggers/default', 'core_test');
var env = environment.env;

var server = skywriter_server.server;
var pluginCatalog = plugins.catalog;

// Transfer names from core_test so that this is the
// test interface used by plugins.

var testNames = [ 'test', 'ok', 'equal', 'notEqual', 'deepEqual',
    'strictEqual', 'throws' ];

testNames.forEach(function(name) {
    exports[name] = assert[name];
});

// These belong in core_test. When they are accepted there, we should
// remove these.

/**
  Automatically fail.

  @param {String} message
    optional message

  @returns {void}
*/
exports.fail = function(msg) {
  assert.ok(false, msg);
};

/**
  Return a function, which automatically fails any test under

  @param {String} message
    optional message

  @returns {void}
*/
exports.never = function(msg) {
  return function() {
    exports.fail(msg);
  };
};

/**
 * Reloads the named plugin, calling the callback when it's complete.
 */
exports.reload = function(pluginName, callback) {
    var plugin = pluginCatalog.plugins[pluginName];
    if (plugin == undefined) {
        throw 'Plugin undefined';
    } else if (pluginCatalog.deactivatedPlugins[pluginName]) {
        throw 'Plugin deactivated';
    }
    plugin.reload(callback);
};

var getPluginsBasic = function(testFunc) {
    var reply = [];
    for (var name in pluginCatalog.plugins) {
        if (pluginCatalog.plugins.hasOwnProperty(name)) {
            if (testFunc(pluginCatalog.plugins[name])) {
                reply.push(pluginCatalog.plugins[name]);
            }
        }
    }
    reply.sort(function(a, b) {
        return a.name.localeCompare(b.name);
    });
    return reply;
};

/**
 *
 */
exports.getPlugins = function() {
    var reply = getPluginsBasic(function(plugin) {
        return plugin.description;
    });
    reply.unshift({ name:'all', description:'Runs all the available tests' });
    return reply;
};

exports.getUserActivePlugins = function() {
    return getPluginsBasic(function(plugin) {
        return (plugin.type == 'user' &&
                            !pluginCatalog.deactivatedPlugins[plugin.name]);
    });
};

exports.getUserDeactivatedPlugins = function() {
    return getPluginsBasic(function(plugin) {
        return (plugin.type == 'user' &&
                            pluginCatalog.deactivatedPlugins[plugin.name]);
    });
};

exports.reloadCommand = function(args, request) {
    if (!args.plugin) {
        request.doneWithError('You must provide a plugin name');
        return;
    }
    try
    {
        exports.reload(args.plugin, function() {
            request.done('Plugin ' + args.plugin + ' reloaded.');
        });
    } catch (e) {
        if (e == 'Plugin undefined') {
            request.doneWithError('Cannot find plugin ' + args.plugin);
            return;
        } else if (e == 'Plugin deactivated') {
            request.doneWithError('Plugin ' + args.plugin + ' is deactivated.');
            return;
        }
        throw e;
    }
    request.async();
};

/*
* runs the test in the fully qualified named testmodule.
* For example, to run the test in tests/myTestModule in the Foo plugin,
* you would run runTest('Foo:tests/myTestModule')
*
* The test module's plugin is reloaded before running.
*/
exports.runTest = function(testmodule) {
    var pluginName = testmodule.split(':', 1)[0];
    if (!pluginName) {
        pluginName = testmodule;
    }
    exports.reload(pluginName, function() {
        var mod = require(testmodule);
        if (!mod.name) {
            mod.name = testmodule;
        }
        test.run(mod);
    });
};

exports.tempTest = function(testmodule) {
    var pluginName = testmodule.split(':', 1)[0];
    if (!pluginName) {
        pluginName = testmodule;
    }
    pluginCatalog.loadPlugin(pluginName).then(function() {
        core_test.module(testmodule);
        var mod = require(testmodule);
        // run the tests, logging to the console
        test.run(mod, console);
    });
};

});
