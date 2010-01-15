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
require("globals");

var builtins = require("builtins");
var r = require;

var object_keys = Object.keys;
if (!object_keys) {
    object_keys = function(obj) {
        var k, ret = [];
        for (k in obj) {
            if (obj.hasOwnProperty(k)) {
                ret.push(k);
            }
        }
        return ret;
    };
}

var _splitPointer = function(pluginName, pointer) {
    if (!pointer) {
        return undefined;
    }
    
    var parts = pointer.split("#");
    var modName;
    
    // this allows syntax like #foo
    // which is equivalent to PluginName:index#foo
    if (parts[0]) {
        modName = pluginName + ":" + parts[0];
    } else {
        modName = pluginName;
    }
    
    return {
        modName: modName,
        objName: parts[1]
    };
};

var _retrieveObject = function(pointerObj) {
    var module = r(pointerObj.modName);
    if (pointerObj.objName) {
        return module[pointerObj.objName];
    }
    return module;
};

exports.Extension = SC.Object.extend({
    _getPointer: function(property) {
        property = property || "pointer";
        return _splitPointer(this._pluginName, this.get(property));
    },
    
    init: function() {
        this._observers = [];
    },
    
    load: function(callback, property) {
        var pointer = this._getPointer(property);
        
        if (!pointer) {
            console.error("Extension cannot be loaded because it has no poitner");
            console.log(this);
            return;
        }
        
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
    
    /*
    * Loads this extension and passes the result to the callback.
    * Any time this extension changes, the callback is called with
    * the new value. Note that if this extension goes away, the
    * callback will be called with undefined.
    * 
    * observingPlugin is required, because if that plugin is
    * torn down, all of its observing callbacks need to be torn down
    * as well.
    */ 
    observe: function(observingPlugin, callback, property) {
        this._observers.push({plugin: observingPlugin, 
            callback: callback, property: property});
        this.load(callback, property);
    },
    
    _getLoaded: function(property) {
        var pointer = this._getPointer(property);
        return _retrieveObject(pointer);
    }
});

exports.ExtensionPoint = SC.Object.extend({
    init: function() {
        this.extensions = [];
        this.handlers = [];
    },

    addExtension: function(extension) {
        this.extensions.push(extension);
        this.register(extension);
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

    register: function(extension) {
        this.handlers.forEach(function(handler) {
            if (handler.register) {
                handler.load(function(register) {
                    register(extension);
                }, "register");
            }
        });
    },

    unregister: function(extension) {
        this.handlers.forEach(function(handler) {
            if (handler.unregister) {
                handler.load(function(unregister) {
                    unregister(extension);
                }, "unregister");
            }
        });
    }
});

exports.Plugin = SC.Object.extend({
    register: function() {
        var provides = this.provides;
        self = this;
        this.provides.forEach(function(extension) {
            var ep = self.get("catalog").getExtensionPoint(extension.ep);
            ep.register(extension);
        });
    },

    unregister: function() {
        var provides = this.provides;
        self = this;
        this.provides.forEach(function(extension) {
            var ep = self.get("catalog").getExtensionPoint(extension.ep);
            ep.unregister(extension);
        });
    },
    
    _getObservers: function() {
        var result = {};
        this.provides.forEach(function(extension) {
            console.log("ep: ", extension.ep);
            console.log(extension._observers);
            result[extension.ep] = extension._observers;
        });
        return result;
    },
    
    /*
    * Figure out which plugins depend on a given plugin. This
    * will allow the reload behavior to unregister/reregister
    * all of the plugins that depend on the one being reloaded.
    */
    _findDependents: function(pluginList, dependents) {
        var pluginName = this.name;
        var self = this;
        pluginList.forEach(function(testPluginName) {
            if (testPluginName == pluginName) {
                return;
            }
            var plugin = self.catalog.plugins[testPluginName];
            if (plugin && plugin.depends) {
                plugin.depends.forEach(function(dependName) {
                    if (dependName == pluginName && !dependents[testPluginName]) {
                        dependents[testPluginName] = true;
                        plugin._findDependents(pluginList, dependents);
                    }
                });
            }
        });
    },
    
    /*
    * reloads the plugin and reinitializes all
    * dependent plugins
    */
    reload: function(callback) {
        // All reloadable plugins will have a reloadURL
        if (!this.get("reloadURL")) {
            return;
        }
        
        var pluginName = this.name;
        
        var reloadPointer = this.get("reloadPointer");
        if (reloadPointer) {
            var pointer = _splitPointer(pluginName, reloadPointer);
            var func = _retrieveObject(pointer);
            if (func) {
                func();
            } else {
                console.error("Reload function could not be loaded. Aborting reload.");
                return;
            }
        }
        
        // find all of the dependents recursively so that
        // they can all be unregisterd
        var dependents = {};
        
        var self = this;
        
        var pluginList = object_keys(this.catalog.plugins);
        
        this._findDependents(pluginList, dependents);
        
        // notify everyone that this plugin is going away
        this.unregister();
        
        for (var dependName in dependents) {
            this.catalog.plugins[dependName].unregister();
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
        this.catalog.loadMetadata(this.reloadURL,
            function() {
                // actually load the plugin, so that it's ready
                // for any dependent plugins
                tiki.async(pluginName).then(function() {
                    // reregister all of the dependent plugins
                    for (dependName in dependents) {
                        self.catalog.plugins[dependName].register();
                    }
                    
                    if (callback) {
                        // at long last, reloading is done.
                        callback();
                    }
                });
            }
        );
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

    /**
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
        if (extension.register) {
            extension.load(function(register) {
                if (!register) {
                    throw extension.name + " is not ready";
                }
                ep.extensions.forEach(function(ext) {
                    register(ext);
                });
            }, "register");
        }

    },

    load: function(metadata) {
        for (var name in metadata) {
            var md = metadata[name];
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
            md.name = name;
            var plugin = exports.Plugin.create(md);
            this.plugins[name] = plugin;
        }
    },
    
    /*
    * Loads the named plugin, calling the provided callback
    * when the plugin is loaded. This function is a convenience
    * for unusual situations and debugging only. Generally,
    * you should load plugins by calling load() on an Extesnion
    * object.
    */
    loadPlugin: function(pluginName, callback) {
        var p = tiki.async(pluginName);
        if (callback) {
            p.then(callback, function(reason) {
                console.error("Plugin loading canceled: ", reason);
            });
        }
    },

    loadMetadata: function(url, callback) {
        SC.Request.create({ address: url }).notify(0, this,
            this._metadataFinishedLoading, { callback: callback }).send("");
    },
    
    /*
    * for the given plugin, get the first part of the URL required to
    * get at that plugin's resources (images, etc.).
    */
    getResourceURL: function(pluginName) {
        var plugin = this.plugins[pluginName];
        if (plugin == undefined) {
            return undefined;
        }
        return plugin.resourceURL;
    },

    _metadataFinishedLoading: function(response, params) {
        if (!response.isError) {
            var body = response.body();
            var data = JSON.parse(body);
            for (var pluginName in data) {
                if (data[pluginName].errors) {
                    console.error("Plugin ", pluginName, " has errors:");
                    data[pluginName].errors.forEach(function(error) {
                        console.error(error);
                    });
                    delete data[pluginName];
                    continue;
                }
                tiki.register(pluginName, data[pluginName]);
            }
            this.load(data);
        }
        if (params.callback) {
            params.callback(this, response);
        }
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
// reregister all of the dependent plugins

exports.catalog = exports.Catalog.create();

exports.startupHandler = function(ep) {
    ep.load(function(func) {
        func();
    });
};
