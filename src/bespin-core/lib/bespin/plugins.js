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

var bespin = require("bespin");

/**
 *
 */
exports.Extension = SC.Object.extend({
    collection: null,
    pluginName: null,
    resolver: null,
    meta: null,

    init: function(collection, pluginName, resolver, meta) {
        this._pluginName = pluginName;
        this._pluginCollection = collection;
        this._resolver = resolver;
        dojo.mixin(this, meta);
    },

    load: function(callback) {
        var self = this;
        var parts = this.pointer.split(":");
        var modname = this._resolver(parts[0]);

        var module = bespin.plugins.loader.modules[modname];

        if (!module) {
            bespin.plugins.loader.loadScript(modname, {
                callback: function(module) {
                    if (!module._used_by_plugins) {
                        module._used_by_plugins = {};
                    }

                    module._used_by_plugins[self._pluginName] =
                        self._pluginCollection;
                    module._resolver = self._resolver;

                    if (module.activate) {
                        module.activate();
                    }

                    if (callback) {
                        if (parts[1]) {
                            callback(module[parts[1]]);
                        } else {
                            callback(module);
                        }
                    }
                },
                resolver: this._resolver
            });
            return;
        }

        if (callback) {
            if (parts[1]) {
                callback(module[parts[1]]);
            } else {
                callback(module);
            }
        }
    },

    getIfLoaded: function() {
        var parts = this.pointer.split(":");
        var modname = this._resolver(parts[0]);

        var module = bespin.plugins.loader.modules[modname];

        if (parts[1]) {
            return module[parts[1]];
        } else {
            return module;
        }
    }
});

dojo.mixin(bespin.plugins, {
    metadata: {},

    builtins: {},

    extensionPoints: {},

    unregisterExtensionPoints: function(pluginName, collection) {
        if (!collection) {
            collection = bespin.plugins.metadata;
        }
        var extensionPoints = bespin.plugins.extensionPoints;
        var info = collection[pluginName];
        if (!info) {
            return;
        }

        var provides = info.provides;

        if (!provides) {
            return;
        }

        for (var i = 0; i < provides.length; i++) {
            var ep = provides[i];
            var name = ep[0];
            var meta = ep[1];

            var extList = extensionPoints[name];
            if (!extList) {
                continue;
            }

            for (var j = 0; j < extList.length; j++) {
                var ext = extList[j];
                if (ext._pluginName == pluginName) {
                    extList.splice(j,1);
                    bespin.publish("extension:removed:" + name, ext);
                    j--;
                }
            }
        }
    },

    sameFileResolver: function(name) {
        return this.location;
    },

    multiFileResolver: function(name) {
        if (name.charAt(0) != "/") {
            if (this.location.charAt(this.location.length-1) == '/') {
                name = this.location + name + ".js";
            } else {
                name = this.location + '/' + name + '.js';
            }
        }
        return name;
    },

    registerExtensionPoints: function(pluginName, collection, resolver) {
        var extensionPoints = bespin.plugins.extensionPoints;
        var Extension = bespin.plugins.Extension;

        if (!collection) {
            collection = bespin.plugins.metadata;
        }
        var info = collection[pluginName];
        var provides = info.provides;

        if (!provides) {
            return;
        }

        if (!resolver) {
            resolver = bespin.plugins.multiFileResolver;
        }

        resolver = dojo.hitch(info, resolver);

        for (var i = 0; i < provides.length; i++) {
            var ep = provides[i];
            var name = ep[0];
            var meta = ep[1];

            var extList = extensionPoints[name];
            if (!extList) {
                extList = extensionPoints[name] = [];
            }

            var ext = new Extension(collection, pluginName, resolver, meta);
            extList.push(ext);
            bespin.publish("extension:loaded:" + name, ext);
        }
    },

    get: function(epName) {
        return bespin.plugins.extensionPoints[epName] || [];
    },

    loadOne: function(epName, callback) {
        var points = bespin.plugins.extensionPoints[epName];
        if (!points || !points[0]) {
            return false;
        }
        points[0].load(callback);
        return true;
    },

    getLoadedOne: function(epName) {
        var points = bespin.plugins.extensionPoints[epName];
        if (!points || !points[0]) {
            return undefined;
        }
        return points[0].getIfLoaded();
    },

    remove: function(pluginName, collection) {
        if (!collection) {
            collection = bespin.plugins.metadata;
        }
        var info = collection[pluginName];
        if (info) {
            var oldmodule = bespin.plugins.loader.modules[info.location];
        } else {
            var oldmodule = undefined;
        }
        bespin.plugins.unregisterExtensionPoints(pluginName);
        if (oldmodule && oldmodule.deactivate) {
            oldmodule.deactivate();
        }
        delete collection[pluginName];

        if (collection == bespin.plugins.metadata) {
            bespin.get("files").saveFile("BespinSettings",
                {
                    name: "plugins.json",
                    content: dojo.toJson(bespin.plugins.metadata)
                });
        }
    },

    _removeLink: function(node) {
        bespin.get("commandLine").executeCommand('plugin remove "' + node.getAttribute("name") + '"');
    },

    installSingleFilePlugin: function(url) {
        var oldmodule = bespin.plugins.loader.modules[url];

        bespin.plugins.loader.loadScript(url, {
            callback: function(module) {
                if (!module.info) {
                    instruction.addError("Plugin module does not have info!");
                }
                var name = module.info.name;
                if (!name) {
                    name = filename;
                }
                bespin.plugins.unregisterExtensionPoints(name);
                if (oldmodule && oldmodule.deactivate) {
                    oldmodule.deactivate();
                }
                module.info.location = url;
                bespin.plugins.metadata[name] = module.info;
                bespin.plugins.registerExtensionPoints(name,
                        bespin.plugins.metadata, bespin.plugins.sameFileResolver);
                if (module.activate) {
                    module.activate();
                }
                bespin.get("files").saveFile("BespinSettings",
                    {
                        name: "plugins.json",
                        content: dojo.toJson(bespin.plugins.metadata)
                    });

            },
            force: true
        });
    },

    reloadByName: function(pluginName) {
        var info = bespin.plugins.metadata[pluginName];
        if (!info || !info.location) {
            return;
        }
        bespin.plugins.installSingleFilePlugin(info.location);
    },

    _reloadLink: function(node) {
        bespin.get("commandLine").executeCommand('plugin reload "' + node.getAttribute("name") + '"');
    },

    _computeModulesToReload: function(fullname, mod, toReload, pluginsToInit) {
        toReload[fullname] = true;
        var used_by_plugins = mod._used_by_plugins;
        for (var plugin in used_by_plugins) {
            pluginsToInit[plugin] = used_by_plugins[plugin];
        }

        for (var modname in mod._depended_on_by) {
            var othermod = bespin.plugins.loader.modules[modname];
            this._computeModulesToReload(modname, othermod, toReload, pluginsToInit);
        }
    }
});

bespin.plugins.commands = new bespin.command.Store(bespin.command.store, {
    name: "plugin",
    preview: "manage Bespin plugins",
    subcommanddefault: "help"
});

bespin.plugins.commands.addCommand({
    name: "install",
    takes: ["name"],
    execute: function(instruction, name) {
        var editSession = bespin.get('editSession');
        var filename = editSession.path;
        var project  = editSession.project;
        var url = "/getscript/file/at/" + project + "/" + filename;

        bespin.plugins.installSingleFilePlugin(url);
        instruction.addOutput("Plugin installed.");
    }
});

bespin.plugins.commands.addCommand({
    name: "list",
    execute: function(instruction) {
        var output = '<h2>Installed plugins:</h2>';
        output += '<table>';
        for (var name in bespin.plugins.metadata) {
            output += '<tr><td>' + name +
                '</td><td><a onclick="bespin.plugins._removeLink(this)" name="' + name + '">Remove</a></td><td><a onclick="bespin.plugins._reloadLink(this)" name="' + name + '">Reload</a></td></tr>';
        }
        output += "</table>";
        instruction.addOutput(output);
    }
});

bespin.plugins.commands.addCommand({
    name: "remove",
    takes: ['name'],
    execute: function(instruction, name) {
        name = name.substring(1, name.length-1);
        bespin.plugins.remove(name);
        instruction.addOutput("Plugin removed");
    }
});

bespin.plugins.commands.addCommand({
    name: "reload",
    takes: ['name'],
    execute: function(instruction, name) {
        name = name.substring(1, name.length-1);
        bespin.plugins.reloadByName(name);
        instruction.addOutput("Plugin reloaded");
    }
});

bespin.subscribe("bespin:editor:initialized", function() {
    bespin.get("files").loadContents("BespinSettings", "plugins.json",
        function(info) {
            var data = dojo.fromJson(info.content);
            bespin.plugins.metadata = data;
            for (var name in data) {
                bespin.plugins.registerExtensionPoints(name);
            }
    });

    bespin.get("server").request("GET", "/js/bespin/builtins.json", null, {
        evalJSON: true,
        onSuccess: function(data) {
            bespin.plugins.builtins = data;
            for (var name in data) {
                bespin.plugins.registerExtensionPoints(name,
                    bespin.plugins.builtins, bespin.plugins.multiFileResolver);
            }

            // preload a couple of components to make them zippier.
            bespin.getComponent("commandLine", function() {});
            bespin.getComponent("popup", function() {});
        }
    });
});

bespin.subscribe("file:saved", function(e) {
    var settings = bespin.get("settings");
    var fullname = "/getscript/file/at/" + e.project + "/" + e.path;
    if (settings) {
        var editbespin = settings.get("editbespin");
        if (editbespin == e.project) {
            // remove the "frontend/" from the beginning of the path
            fullname = "/getscript/" + e.path.substring(9);
        }
    }

    // Implement plugin reloading
    var mod = bespin.plugins.loader.modules[fullname];
    if (!mod) {
        return;
    }

    var toReload = {};
    var pluginsToInit = {};
    bespin.plugins._computeModulesToReload(fullname, mod, toReload,
                                        pluginsToInit);

    for (var plugin in pluginsToInit) {
        bespin.plugins.unregisterExtensionPoints(plugin,
                pluginsToInit[plugin]);
    }

    for (var modname in toReload) {
        delete bespin.plugins.loader.modules[modname];
    }

    for (var plugin in pluginsToInit) {
        bespin.plugins.registerExtensionPoints(plugin, pluginsToInit[plugin]);
    }

});
