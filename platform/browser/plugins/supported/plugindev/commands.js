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

var catalog = require('bespin:plugins').catalog;
var Promise = require('bespin:promise').Promise;
var groupPromises = require('bespin:promise').group;
var util = require('bespin:util/util');
var env = require('environment').env;

var server = require('bespin_server').server;
var pathutils = require('filesystem:path');

var getPluginName = function(path) {
    if (util.endsWith(path, '/')) {
        var trimmedPath = path.replace(/\/$/, '');
        return pathutils.basename(trimmedPath);
    }

    return pathutils.splitext(pathutils.basename(path))[0];
};

var changePluginInfo = function(request) {
    var pr = new Promise();
    var prChangeDone = new Promise();

    var pluginConfig;

    prChangeDone.then(function(prSaveDone) {
        pluginConfigFile.saveContents(JSON.stringify(pluginConfig)).then(
            function() {
                if (typeof(prSaveDone) == 'string') {
                    request.done(prSaveDone);
                } else if (!util.none(prSaveDone)) {
                    prSaveDone.resolve();
                }
            }, function(error) {
                request.doneWithError('Unable to save plugin configuration: ' +
                                        error.message);

                if (typeOf(prSaveDone) != 'string' && !util.none(prSaveDone)) {
                    prSaveDone.reject();
                }
            }
        );
    });

    var pluginConfigPath = 'BespinSettings/pluginInfo.json';
    var pluginConfigFile = catalog.getObject("files").getFile(pluginConfigPath);
    pluginConfigFile.loadContents().then(function(contents) {
        pluginConfig = JSON.parse(contents);
        pr.resolve({
            pluginConfig: pluginConfig,
            prChangeDone: prChangeDone
        });
    }, function(error) {
        if (error.xhr && error.xhr.status == 404) {
            pluginConfig = {};
            pr.resolve({
                pluginConfig: pluginConfig,
                prChangeDone: prChangeDone
            });
        } else {
            request.doneWithError('Unable to load your plugin config: ' + error.message);
            prChangeDone.reject();
        }
    });

    return pr;
};

/*
 * the plugin add command to add a new plugin file or directory.
 */
exports.add = function(args, request) {
    var path = args.path;
    var session = env.session;
    path = session.getCompletePath(path);
    path = path.replace(/\/$/, '');

    var pluginName = getPluginName(path);
    if (catalog.plugins[pluginName]) {
        request.done('Plugin ' + pluginName + ' already exists.');
        return;
    }

    // Function to rollback the plugin addition from pluginInfo.js
    var rollbackPluginAdd = function(data) {
        if (data.pluginConfig.plugins != undefined) {
            var plugins = data.pluginConfig.plugins;

            for (var i = 0; i < plugins.length; i++) {
                if (plugins[i] == path) {
                    plugins.splice(i, 1);
                    break;
                }
            }
        }

        data.prChangeDone.resolve();
    };

    // Load the pluginInfo data.
    changePluginInfo(request).then(function(data) {
        var prSaveDone = new Promise();

        // After the pluginInfo.json is saved, load the plugin metadata.
        prSaveDone.then(function() {
            catalog.loadMetadataFromURL(
                server.base_url + '/plugin/reload/' + pluginName
            ).then(function() {
                request.done('Plugin loaded and pluginInfo file saved.');
            }, function(error) {
                request.doneWithError('Couldn\'t add the plugin: ' + error.message);

                // We don't handle failure as we can't do anything if it fails.
                changePluginInfo(request).then(rollbackPluginAdd);
            });
        });

        // Add the plugin to the pluginInfo.json file.
        if (data.pluginConfig.plugins == undefined) {
            data.pluginConfig.plugins = [];
        }
        data.pluginConfig.plugins.push(path);

        data.prChangeDone.resolve(prSaveDone);
    });

    request.async();
};

/*
 * the plugin list command
 */
exports.list = function(args, request) {
    var deactivatedPlugins = catalog.deactivatedPlugins;

    var plugins = catalog.getPlugins({
        sortBy: ['type', 'name']
    });

    var output = ['<div class="plugin_list">'];
    var lastPluginType = null;
    plugins.forEach(function(plugin) {
        if (plugin.type != lastPluginType) {
            if (lastPluginType) {
                output.push('</table></div>');
            }
            output.push('<div class="plugin_group">');
            output.push('<h2>');
            output.push(plugin.type);
            output.push(' plugins</h2><table>');
            lastPluginType = plugin.type;
        }

        output.push('<tr><th class="right">' + plugin.name);

        var deactivated = deactivatedPlugins[plugin.name];
        if (deactivated === catalog.USER_DEACTIVATED) {
            output.push(' (deactivated):');
        } else if (deactivated === catalog.DEPENDS_DEACTIVATED){
            output.push(' (deact/dept):');
        }

        output.push('</th><td>');

        if (plugin.description) {
            output.push(plugin.description);
        } else {
            output.push('&nbsp;');
        }
        output.push('</td></tr>');
    });

    if (lastPluginType) {
        output.push('</table></div>');
    }

    output.push('</div>');
    request.done(output.join(''));
};

/*
 * the plugin remove command
 */
exports.remove = function(args, request) {
    var pluginName = args.plugin;
    var plugin = catalog.plugins[pluginName];
    if (!plugin) {
        request.doneWithError('Plugin ' + pluginName + ' not found.');
        return;
    }
    if (plugin.type != 'user') {
        request.doneWithError('Plugin ' + pluginName + ' is a ' + plugin.type
            + ' plugin. Only user installed/added plugins can be removed');
        return;
    }
    catalog.removePlugin(pluginName);

    var pluginConfigFile = catalog.getObject("files").getFile('BespinSettings/pluginInfo.json');

    pluginConfigFile.loadContents().then(function(contents) {
        var pluginConfig = JSON.parse(contents);
        var paths = pluginConfig.plugins;
        var found = false;
        for (var i = 0; i < paths.length; i++) {
            var pathPluginName = getPluginName(paths[i]);
            if (pathPluginName == pluginName) {
                found = true;
                paths.splice(i, 1);
                break;
            }
        }
        if (found) {
            var newConfig = JSON.stringify(pluginConfig);
            pluginConfigFile.saveContents(newConfig).then(function() {
                request.done('Plugin ' + pluginName + ' removed and plugin config file saved.');
            }, function(error) {
                request.doneWithError('Unable to save plugin config file: ' + error.message);
            });
        } else {
            var obj = files.remove(plugin.userLocation).then(function() {
                request.done('Plugin ' + pluginName + ' removed.');
            }, function(error) {
                request.doneWithError('Unable to delete plugin files at '
                    + plugin.userLocation + ' (' + error.message + ')');
            });
        }
    }, function(error) {
        // file not found from the server is okay, we just need
        // to remove the plugin. If there's no pluginConfig, then
        // we know this is not a user edited plugin.
        if (error.xhr && error.xhr.status == 404) {
            var obj = files.remove(plugin.userLocation).remove().then(function() {
                request.done('Plugin removed.');
            }, function(error) {
                request.doneWithError('Unable to delete plugin files at '
                    + plugin.userLocation + ' (' + error.message + ')');
            });
        } else {
            request.doneWithError('Unable to load your plugin config: ' + error.message);
        }
    });
    request.async();
};

var locationValidator = /^(http|https):\/\//;

/*
 * the plugin install command
 */
exports.install = function(args, request) {
    var body, url;

    var plugin = args.plugin;
    if (locationValidator.exec(plugin)) {
        body = util.objectToQuery({url: plugin});
        url = '/plugin/install/';
    } else {
        body = null;
        url = '/plugin/install/' + escape(plugin);
    }

    var pr = server.request('POST', url,
        body, {
            evalJSON: true
    });

    pr.then(function(metadata) {
        catalog.registerMetadata(metadata);
        request.done('Plugin installed');
    }, function(error) {
        request.doneWithError('Plugin installation failed: ' + error.message);
    });
    request.async();
};

/*
 * the plugin upload command - uploads a plugin to the
 * plugin gallery.
 */
exports.upload = function(args, request) {
    if (!args.pluginName) {
        request.doneWithError('You must provide the name of the plugin to install.');
    }
    var pr = server.request('POST', '/plugin/upload/'
        + escape(args.pluginName));
    pr.then(function() {
        request.done('Plugin successfully uploaded.');
    }, function(error) {
        request.doneWithError('Upload failed: ' + error.message);
    });

    request.async();
};

/*
 * the plugin gallery command - lists the plugins in the
 * plugin gallery
 */
exports.gallery = function(args, request) {
    var pr = server.request('GET', '/plugin/gallery/',
        null, {
            evalJSON: true
    });
    pr.then(function(data) {
        output = '<h2>Bespin Plugin Gallery</h2><p>These plugins can be installed ' +
            'by typing \'plugin install NAME\'</p><table><thead><tr><th>Name</th>' +
            '<th>Description</th></tr></thead><tbody>';
        data.forEach(function(p) {
            output += '<tr><td>' + p.name + '</td><td>' + p.description +
                '</td></tr>';
        });
        output += '</tbody></table>';
        request.done(output);
    }, function(error) {
        request.doneWithError('Error from server: ' + error.message);
    });
    request.async();
};

/*
 * the plugin order command - order the plugins and save the new ordering to
 * to the pluginInfo.json file.
 */
exports.order = function(args, request) {
    if (args.order === null) {
        request.done('Current pluginorder: ' +
                                catalog.getExtensionsOrdering().join(', '));
    }

    var newOrder = args.order.split(' ');
    catalog.orderExtensions(newOrder);

    changePluginInfo(request).then(function(data) {
        data.pluginConfig.ordering = newOrder;

        data.prChangeDone.resolve("Pluginorder saved: " + newOrder.join(', '));
    });
};

exports.deactivate = function(args, request) {
    var pluginNames = args.pluginNames.split(' ');
    var pluginsDeactivated = [], output = [];

    pluginNames.forEach(function(pluginName) {
        var ret = catalog.deactivatePlugin(pluginName);
        if (Array.isArray(ret)) {
            pluginsDeactivated.push(pluginName);
            output.push('Plugin deactivated: ' + pluginName +
                              ' + dependent plugins: ' + ret.join(', '));
        } else {
            output.push('<span class="cmd_error">' + ret + '</span>');
        }
    });

    changePluginInfo(request).then(function(data) {
        var deactivated = {};
        for (plugin in catalog.deactivatedPlugins) {
            if (catalog.deactivatedPlugins[plugin] === catalog.USER_DEACTIVATED) {
                deactivated[plugin] = true;
            }
        }
        data.pluginConfig.deactivated = deactivated;

        output.push('Deactivated plugins saved.');
        data.prChangeDone.resolve('Finished with following messages: <UL><LI>' +
                              output.join('<LI>') + '<UL>');
        request.async();
    }, function(err) {
        request.error('Failed to save the new deactivated plugins: ' +
                              err.message);
    });
    request.async();
};

exports.activate = function(args, request) {
    var pluginNames = args.pluginNames.split(' ');
    var pluginsActivated = [];

    var prReloadList = [];
    var output = [];

    // Activae/reload plugins.
    pluginNames.forEach(function(pluginName) {
        var ret = catalog.activatePlugin(pluginName);
        if (Array.isArray(ret)) {
            pluginsActivated.push(pluginName);
            output.push('Plugin activated: ' + pluginName +
                            ' + dependent plugins: ' + ret.join(', '));
        } else {
            output.push('<span class="cmd_error">' + ret + '</span>');
        }
    });

    changePluginInfo(request).then(function(data) {
        var deactivated = {};
        for (plugin in catalog.deactivatedPlugins) {
        if (catalog.deactivatedPlugins[plugin] === catalog.USER_DEACTIVATED) {
                deactivated[plugin] = true;
            }
        }
        data.pluginConfig.deactivated = deactivated;

        output.push('Activated plugins saved.');
        data.prChangeDone.resolve('Finished with following messages: ' +
                                      '<UL><LI>' + output.join('<LI>') +
                                      '<UL>');
    }, function(err) {
        request.error('Failed to save the new activated plugins: ' +
                        err.message);
    });
    request.async();
};

// plugin info command
exports.info = function(args, request) {
    if (!args.pluginName) {
        request.doneWithError('Please provide a plugin name.');
        return;
    }
    var plugin = catalog.plugins[args.pluginName];
    if (!plugin) {
        request.doneWithError('Unknown plugin: ' + pluginName);
        return;
    }
    var output = '';
    output += '<div class="plugin_info"><h2>';
    output += plugin.name;
    output += '</h2>';
    output += '<p>';
    output += plugin.description;
    output += '</p>';
    output += '<h3>Plugin provides:</h3>';
    output += '<ul>';
    plugin.provides.forEach(function(provided) {
        output += '<li>';
        output += provided.ep;
        if (provided.name) {
            output += " (" + provided.name + ')';
        }
        output += '</li>';
    });
    output += '</ul>';
    output += '</div>';
    request.done(output);
};

// ep command
exports.ep = function(args, request) {
    var output = '';
    if (args.ep) {
        var ep = catalog.getExtensionPoint(args.ep);
        if (ep === undefined) {
            request.doneWithError('Unknown extension point: ' + args.ep);
            return;
        }
        output += '<div class="ep_info"><h2>';
        output += ep.name;
        output += '</h2>';
        output += '<p>' + ep.description + '</p>';
        output += '<p>This extension point is defined in the plugin ' + ep.getDefiningPluginName() + '</p>';
        if (ep.params) {
            output += '<h3>Parameters:</h3>';
            output += '<table class="params"><tbody>';
            ep.params.forEach(function(param) {
                output += '<td><th>' + param.name;
                if (param.required) {
                    output += ' (required)';
                }
                output += ':</th>';
                if (param.type) {
                    output += ' (';
                    output += param.type;
                    output += ')';
                }
                output += '</td><td>';
                output += param.description;
                output += '</td></tr>';
            });
            output += '</tbody></table>';
        }
        output += '<h3>Installed plugins which provide these extensions:</h3>';
        output += '<ul>';
        ep.getImplementingPlugins().forEach(function(pluginName) {
            output += '<li>';
            output += pluginName;
            output += '</li>';
        });
        output += '</ul></div>';
    } else {
        output += '<div class="ep_info"><h2>Available extension points</h2>';
        output += '<ul>';
        var epNames = Object.keys(catalog.points);
        epNames.sort();
        epNames.forEach(function(epName) {
            output += '<li>' + epName + '</li>';
        });
        output += '</ul></div>';
    }
    request.done(output);
};
