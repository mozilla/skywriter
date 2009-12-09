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

var SC = require("sproutcore/runtime").SC;
var builtins = require("builtins");
var r = require;

var object_keys = Object.keys;
if (!object_keys) {
  object_keys = function(obj) {
    var k, ret = [];
    for(k in obj) {
      if (obj.hasOwnProperty(k)) ret.push(k);
    }
    return ret ;
  };
}


exports.Extension = SC.Object.extend({
    _splitPointer: function(property) {
        property = property || "pointer";
        var parts = this.get(property).split("#");
        var modName;
        // this allows syntax like #foo
        // which is equivalent to PluginName:index#foo
        if (parts[0]) {
            modName = this._pluginName + ":" + parts[0];
        } else {
            modName = this._pluginName;
        }
        
        return {
            modName: modName,
            objName: parts[1]
        };
    },
    
    load: function(callback, property) {
        var pointer = this._splitPointer(property);
        
        var self = this;
        
        tiki.async(this._pluginName).then(function() {
            SC.run(function() {
                var foo = self;
                var module = r(pointer.modName);
                if (callback) {
                    if (pointer.objName) {
                        callback(module[pointer.objName]);
                    } else {
                        callback(module);
                    }
                }
            });
        });
    },
    _getLoaded: function(property) {
        var pointer = this._splitPointer(property);
        var module = r(pointer.modName);
        if (pointer.objName) {
            return module[pointer.objName];
        }
        return module;
    }
});

exports.ExtensionPoint = SC.Object.extend({
    init: function() {
        this.extensions = [];
        this.handlers = [];
    },

    addExtension: function(extension) {
        this.extensions.push(extension);
        this.activate(extension);
    },

    /**
     * If we are keeping an index (an indexOn property is set on the
     * extension point), you can look up an extension by key.
     */
    getByKey: function(key) {
        var indexOn = this.get("indexOn");

        if (!indexOn) {
            return undefined;
        }

        for (var i = 0; i < this.extensions.length; i++) {
            if (this.extensions[i][indexOn] == key) {
                return this.extensions[i];
            }
        }
        return undefined;
    },

    activate: function(extension) {
        this.handlers.forEach(function(handler) {
            if (handler.activate) {
                console.log("Calling ", handler.activate);
                console.log(extension);
                handler.load(function(activate) {
                    activate(extension);
                }, "activate");
            }
        });
    },
    
    deactivate: function(extension) {
        this.handlers.forEach(function(handler) {
            console.log("Checking one");
            if (handler.deactivate) {
                console.log("Got one: ", handler.deactivate);
                handler.load(function(deactivate) {
                    console.log("Calling one");
                    deactivate(extension);
                }, "deactivate");
            }
        });
    }
});

exports.Plugin = SC.Object.extend({
    activate: function() {
        var provides = this.provides;
        self = this;
        this.provides.forEach(function(extension) {
            var ep = self.get("catalog").getExtensionPoint(extension.ep);
            ep.activate(extension);
        });
    },
    
    deactivate: function() {
        var provides = this.provides;
        self = this;
        this.provides.forEach(function(extension) {
            console.log("Provides: ", extension);
            var ep = self.get("catalog").getExtensionPoint(extension.ep);
            ep.deactivate(extension);
        });
    }
});

exports.Catalog = SC.Object.extend({
    init: function() {
        this.points = {};
        this.plugins = {};
        
        // set up the "extensionpoint" extension point.
        // it indexes on name.
        var ep = this.getExtensionPoint("extensionpoint");
        ep.set("indexOn", "name");
        this.load(builtins.metadata);
    },
    
    /*
    * Retrieve a registered singleton. Returns undefined
    * if that factory is not registered.
    */
    getObject: function(name) {
        var ext = this.getExtensionByKey("factory", name);
        if (ext === undefined) {
            return undefined;
        }
        
        var obj = ext.get("instance");
        if (obj) {
            return obj;
        }
        
        var exported = ext._getLoaded();
        var action = ext.action;
        
        if (action == "call") {
            obj = exported();
        } else if (action == "create") {
            obj = exported.create();
        } else if (action == "new") {
            obj = new exported();
        } else if (action == "value") {
            obj = exported;
        } else {
            throw "Create action must be call|create|new|value. " +
                    "Found" + action;
        }
        
        ext.set("instance", obj);
        return obj;
    },

    /** Retrieve an extension point object by name. */
    getExtensionPoint: function(name) {
        if (this.points[name] === undefined) {
            this.points[name] = exports.ExtensionPoint.create({
                name: name,
                catalog: this
            });
        }
        return this.points[name];
    },

    /**
     * Retrieve the list of extensions for the named extension point.
     * If none are defined, this will return an empty array.
     */
    getExtensions: function(name) {
        var ep = this.getExtensionPoint(name);
        if (ep === undefined) {
            return [];
        }
        return ep.extensions;
    },

    /**
     * Look up an extension in an indexed extension point by the given key. If
     * the extension point or the key are unknown, undefined will be returned.
     */
    getExtensionByKey: function(name, key) {
        var ep = this.getExtensionPoint(name);
        if (ep === undefined) {
            return undefined;
        }

        return ep.getByKey(key);
    },

    _registerExtensionPoint: function(extension) {
        var ep = this.getExtensionPoint(extension.name);
        ep.handlers.push(extension);
        if (extension.indexOn) {
            ep.set("indexOn", extension.indexOn);
        }
    },
    
    _registerExtensionHandler: function(extension) {
        var ep = this.getExtensionPoint(extension.name);
        ep.handlers.push(extension);
        if (extension.activate) {
            extension.load(function(activate) {
                ep.extensions.forEach(function(ext) {
                    activate(ext);
                });
            }, "activate");
        }
        
    },

    load: function(metadata) {
        for (var name in metadata) {
            var md = metadata[name];
            if (md.active === undefined) {
                md.active = true;
            }
            md.catalog = this;
            if (md.provides) {
                var provides = md.provides;
                for (var i = 0; i < provides.length; i++) {
                    var extension = exports.Extension.create(provides[i]);
                    extension._pluginName = name;
                    provides[i] = extension;
                    var epname = extension.ep;
                    if (epname == "extensionpoint") {
                        this._registerExtensionPoint(extension);
                    } else if (epname == "extensionhandler") {
                        this._registerExtensionHandler(extension);
                    }
                    var ep = this.getExtensionPoint(extension.ep);
                    ep.addExtension(extension);
                }
            } else {
                md.provides = [];
            }
            var plugin = exports.Plugin.create(md);
            this.plugins[name] = plugin;
        }
    },

    loadMetadata: function(url, callback) {
        SC.Request.create({ address: url }).notify(0, this,
            this._metadataFinishedLoading, { callback: callback }).send("");
    },

    _metadataFinishedLoading: function(response, params) {
        if (!response.isError) {
            var body = response.body();
            eval(body);
        }
        params.callback(this, response);
    },
    
    _deactivate: function(plugin) {
        plugin.deactivate();
    },
    
    /*
    * Figure out which plugins depend on a given plugin. This
    * will allow the reload behavior to deactivate/reactivate
    * all of the plugins that depend on the one being reloaded.
    */
    _findDependents: function(pluginName, pluginList, dependents) {
        self = this;
        pluginList.forEach(function(testPluginName) {
            if (testPluginName == pluginName) {
                return;
            }
            var plugin = self.plugins[testPluginName];
            if (plugin && plugin.depends) {
                plugin.depends.forEach(function(dependName) {
                    if (dependName == pluginName && !dependents[testPluginName]) {
                        dependents[testPluginName] = true;
                        self._findDependents(testPluginName, pluginList, dependents);
                    }
                });
            }
        });
    },
    
    /*
    * reloads the named plugin and reinitializes all
    * dependent plugins
    */
    reload: function(pluginName) {
        var plugin = this.plugins[pluginName];

        // find all of the dependents recursively so that
        // they can all be deactivated
        var dependents = {};
        
        var self = this;
        
        var pluginList = object_keys(this.plugins);
        
        this._findDependents(pluginName, pluginList, dependents);
        
        // notify everyone that this plugin is going away
        this._deactivate(plugin);
        
        for (var dependName in dependents) {
            this._deactivate(this.plugins[dependName]);
        }
        
        // remove all traces of the plugin
        
        var nameMatch = new RegExp("^" + pluginName + ":");
        
        _removeFromList(nameMatch, tiki.scripts);
        _removeFromList(nameMatch, tiki.modules,
            function(module) {
                delete tiki._factories[module];
            });
        _removeFromList(nameMatch, tiki.stylesheets);
        _removeFromList(new RegExp("^" + pluginName + "$"), tiki.packages);
        
        var promises = tiki._promises;
        
        delete promises.catalog[pluginName];
        delete promises.loads[pluginName];
        _removeFromObject(nameMatch, promises.modules);
        _removeFromObject(nameMatch, promises.scripts);
        _removeFromObject(nameMatch, promises.stylesheets);
        
        delete tiki._catalog[pluginName];
        
        // clear the sandbox of modules from all of the dependent plugins
        var fullModList = [];
        var sandbox = tiki.sandbox;
        
        var i = sandbox.modules.length;
        var dependRegexes = [];
        for (dependName in dependents) {
            dependRegexes.push(new RegExp("^" + dependName + ":"));
        }
        
        while (--i >= 0) {
            var item = sandbox.modules[i];
            if (nameMatch.exec(item)) {
                fullModList.push(item);
            } else {
                var j = dependRegexes.length;
                while (--j >= 0) {
                    if (dependRegexes[j].exec(item)) {
                        fullModList.push(item);
                        break;
                    }
                }
            }
        }
        
        // make a private Tiki call that clears these
        // modules from the module cache in the sandbox.
        sandbox.clear.apply(sandbox, fullModList);
        
        // reload the plugin metadata
        this.loadMetadata("/server/plugin/reload/" + pluginName,
            function() {
                // actually load the plugin, so that it's ready
                // for any dependent plugins
                tiki.async(pluginName, function() {
                    // reactivate all of the dependent plugins
                    for (dependName in dependents) {
                        self.plugins[dependName].activate();
                    }
                });
            }
        );
        
    }
});

var _removeFromList = function(regex, array, matchFunc) {
    var i = 0;
    while (i < array.length) {
        if (regex.exec(array[i])) {
            var item = array.splice(i, 1);
            if (matchFunc) {
                matchFunc(item);
            }
            continue;
        }
        i++;
    }
};

var _removeFromObject = function(regex, obj) {
    var keys = object_keys(obj);
    var i = keys.length;
    while (--i > 0) {
        if (regex.exec(keys[i])) {
            delete obj[keys[i]];
        }
    }
};
// reactivate all of the dependent plugins

exports.catalog = exports.Catalog.create();

exports.startupHandler = function(ep) {
    ep.load(function(func) {
        func();
    });
};
