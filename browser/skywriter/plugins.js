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

require.def(['require', 'exports', 'module',
    'skywriter/promise',
    'skywriter/console',
    'skywriter/util/util',
    'skywriter/util/stacktrace',
    'skywriter/proxy'
], function(require, exports, module,
    promise,
    console,
    util,
    stacktrace,
    proxy
) {

// require("skywriter/globals");

var Promise = promise.Promise;
var Trace = stacktrace.Trace;

//var loader = require.loader;
//var browser = loader.sources[0];

var USER_DEACTIVATED    = 'USER';
var DEPENDS_DEACTIVATED = 'DEPENDS';

/**
 * Split an extension pointer from module/path#objectName into an object of the
 * type { modName:"module/path", objName:"objectName" } using a pluginName
 * as the base to which roots the pointer
 */
var _splitPointer = function(pluginName, pointer) {
    if (!pointer) {
        return undefined;
    }

    var parts = pointer.split("#");
    var modName;

    // this allows syntax like #foo
    // which is equivalent to PluginName:index#foo
    if (parts[0]) {
        modName = pluginName + "/" + parts[0];
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

/**
 * An Extension represents some code that can be lazy-loaded when needed.
 * @constructor
 */
exports.Extension = function(metadata) {
    this.pluginName = null;

    for (property in metadata) {
        if (metadata.hasOwnProperty(property)) {
            this[property] = metadata[property];
        }
    }

    this._observers = [];
};

exports.Extension.prototype = {
    /**
     * Asynchronously load the actual code represented by this Extension
     * @param callback Function to call when the load has finished (deprecated)
     * @param property Extension property to load (default 'pointer')
     * @returns A promise to be fulfilled on completion. Preferred over using the
     * <tt>callback</tt> parameter.
     */
    load: function(callback, property, catalog) {
        catalog = catalog || exports.catalog;
        var promise = new Promise();

        var onComplete = function(func) {
            if (callback) {
                callback(func);
            }
            promise.resolve(func);
        };

        var pointerVal = this[property || 'pointer'];
        if (util.isFunction(pointerVal)) {
            onComplete(pointerVal);
            return promise;
        }

        var pointerObj = _splitPointer(this.pluginName, pointerVal);

        if (!pointerObj) {
            console.error('Extension cannot be loaded because it has no \'pointer\'');
            console.log(this);

            promise.reject(new Error('Extension has no \'pointer\' to call'));
            return promise;
        }

        var pluginName = this.pluginName;
        require([pointerObj.modName], function() {
            var func = _retrieveObject(pointerObj);
            onComplete(func);

            // TODO: consider caching 'func' to save looking it up again
            // Something like: this._setPointer(property, data);
        });

        return promise;
    },

    /**
     * Loads this extension and passes the result to the callback.
     * Any time this extension changes, the callback is called with the new value.
     * Note that if this extension goes away, the callback will be called with
     * undefined.
     * <p>observingPlugin is required, because if that plugin is torn down,
     * all of its observing callbacks need to be torn down as well.
     */
    observe: function(observingPlugin, callback, property) {
        this._observers.push({
            plugin: observingPlugin,
            callback: callback,
            property: property
        });
        this.load(callback, property);
    },

    /**
     * Returns the name of the plugin that provides this extension.
     */
    getPluginName: function() {
        return this.pluginName;
    },

    /**
     *
     */
    _getLoaded: function(property) {
        var pointerObj = this._getPointer(property);
        return _retrieveObject(pointerObj);
    }
};

/**
 * An ExtensionPoint is a get of Extensions grouped under the same name
 * for fast access.
 * @constructor
 */
exports.ExtensionPoint = function(name, catalog) {
    this.name = name;
    this.catalog = catalog;

    this.pluginName = undefined;
    this.indexOn = undefined;

    this.extensions = [];
    this.handlers = [];
};

/**
 * Implementation of ExtensionPoint
 */
exports.ExtensionPoint.prototype = {
    /**
    * Retrieves the list of plugins which provide extensions
    * for this extension point.
    */
    getImplementingPlugins: function() {
        var pluginSet = {};
        this.extensions.forEach(function(ext) {
            pluginSet[ext.pluginName] = true;
        });
        var matches = Object.keys(pluginSet);
        matches.sort();
        return matches;
    },

    /**
     * Get the name of the plugin that defines this extension point.
     */
    getDefiningPluginName: function() {
        return this.pluginName;
    },

    /**
     * If we are keeping an index (an indexOn property is set on the
     * extension point), you can look up an extension by key.
     */
    getByKey: function(key) {
        var indexOn = this.indexOn;

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
        var catalog = this.catalog;
        this.extensions.push(extension);
        this.handlers.forEach(function(handler) {
            if (handler.register) {
                handler.load(function(register) {
                    if (!register) {
                        console.error('missing register function for pluginName=', extension.pluginName, ", extension=", extension.name);
                    } else {
                         register(extension, catalog);
                    }
                }, "register", catalog);
            }
        });
    },

    unregister: function(extension) {
        var catalog = this.catalog;
        this.extensions.splice(this.extensions.indexOf(extension), 1);
        this.handlers.forEach(function(handler) {
            if (handler.unregister) {
                handler.load(function(unregister) {
                    if (!unregister) {
                        console.error('missing unregister function for pluginName=', extension.pluginName, ", extension=", extension.name);
                    } else {
                         unregister(extension, catalog);
                    }
                }, "unregister", catalog);
            }
        });
    },

    /**
     * Order the extensions by a plugin order.
     */
    orderExtensions: function(pluginOrder) {
        var orderedExt = [];

        for (var i = 0; i < pluginOrder.length; i++) {
            var n = 0;
            while (n != this.extensions.length) {
                if (this.extensions[n].pluginName === pluginOrder[i]) {
                    orderedExt.push(this.extensions[n]);
                    this.extensions.splice(n, 1);
                } else {
                    n ++;
                }
            }
        }

        this.extensions = orderedExt.concat(this.extensions);
    }
};

/**
 * A Plugin is a set of Extensions that are loaded as a unit
 * @constructor
 */
exports.Plugin = function(metadata) {
    // Should be provided in the metadata
    this.catalog = null;
    this.name = null;
    this.active = false;

    for (property in metadata) {
        if (metadata.hasOwnProperty(property)) {
            this[property] = metadata[property];
        }
    }
};

/**
 * Implementation of Plugin
 */
exports.Plugin.prototype = {
    activate: function() {
        if (this.active) {
            return;
        }
        var mod = require(this.mainModuleName);
        this.catalog._currentPlugin = this.name;
        mod.init();
        this.active = true;
    },
    
    _getObservers: function() {
        var result = {};
        this.provides.forEach(function(extension) {
            console.log('ep: ', extension.ep);
            console.log(extension._observers);
            result[extension.ep] = extension._observers;
        });
        return result;
    },

    /**
     * Figure out which plugins depend on a given plugin. This
     * will allow the reload behavior to unregister/reregister
     * all of the plugins that depend on the one being reloaded.
     * If firstLevelOnly is true, only direct dependent plugins are listed.
     */
    _findDependents: function(pluginList, dependents, firstLevelOnly) {
        var pluginName = this.name;
        var self = this;
        pluginList.forEach(function(testPluginName) {
            if (testPluginName == pluginName) {
                return;
            }
            var plugin = self.catalog.plugins[testPluginName];
            if (plugin && plugin.dependencies) {
                for (dependName in plugin.dependencies) {
                    if (dependName == pluginName && !dependents[testPluginName]) {
                        dependents[testPluginName] = {
                            keepModule: false
                        };
                        if (!firstLevelOnly) {
                            plugin._findDependents(pluginList, dependents);
                        }
                    }
                }
            }
        });
    },

    /**
     * reloads the plugin and reinitializes all
     * dependent plugins
     */
    reload: function(callback) {
    }
};

var _setPath = function(root, path, value) {
    var segments = path.split('.');
    var current = root;
    var top = segments.length - 1;
    if (top > 0) {
        for (var i = 0; i < top; i++) {
            current = current[segments[i]];
        }
    }
    current[top] = value;
};

exports.Catalog = function() {
    this.points = {};
    this.plugins = {};
    this.metadata = {};

    this.USER_DEACTIVATED = USER_DEACTIVATED;
    this.DEPENDS_DEACTIVATED = DEPENDS_DEACTIVATED;

    // Stores the deactivated plugins. Plugins deactivated by the user have the
    // value USER_DEACTIVATED. If a plugin is deactivated because a required
    // plugin is deactivated, then the value is a DEPENDS_DEACTIVATED.
    this.deactivatedPlugins = {};
    this._extensionsOrdering = [];
    this.instances = {};
    this.instancesLoadPromises = {};
    this._objectDescriptors = {};

    // Stores the child catalogs.
    this.children = [];

    // set up the "extensionpoint" extension point.
    // it indexes on name.
    var ep = this.getExtensionPoint("extensionpoint", true);
    ep.indexOn = "name";
};

exports.Catalog.prototype = {

    /**
     * Returns true if the extension is shared.
     */
    shareExtension: function(ext) {
        return this.plugins[ext.pluginName].share;
    },

    /**
     * Returns true, if the plugin is loaded (checks if there is a module in the
     * current sandbox).
     */
    isPluginLoaded: function(pluginName) {
        var usedExports = Object.keys(require.sandbox.usedExports);

        return usedExports.some(function(item) {
            return item.indexOf('::' + pluginName + ':') == 0;
        });
    },

    /**
     * Registers information about an instance that will be tracked
     * by the catalog. The first parameter is the name used for looking up
     * the object. The descriptor should contain:
     * - factory (optional): name of the factory extension used to create the
     *                       object. defaults to the same value as the name
     *                       property.
     * - arguments (optional): array that is passed in if the factory is a
     *                      function.
     * - objects (optional): object that describes other objects that are
     *                      required when constructing this one (see below)
     *
     * The objects object defines objects that must be created before this
     * one and how they should be passed in. The key defines how they
     * are passed in, and the value is the name of the object to pass in.
     * You define how they are passed in relative to the arguments
     * array, using a very simple interface of dot separated keys.
     * For example, if you have an arguments array of [null, {foo: null}, "bar"]
     * you can have an object array like this:
     * {
     *  "0": "myCoolObject",
     *  "1.foo": "someOtherObject"
     * }
     *
     * which will result in arguments like this:
     * [myCoolObject, {foo: someOtherObject}, "bar"]
     * where myCoolObject and someOtherObject are the actual objects
     * created elsewhere.
     *
     * If the plugin containing the factory is reloaded, the object will
     * be recreated. The object will also be recreated if objects passed in
     * are reloaded.
     *
     * This method returns nothing and does not actually create the objects.
     * The objects are created via the createObject method and retrieved
     * via the getObject method.
     */
    registerObject: function(name, descriptor) {
        this._objectDescriptors[name] = descriptor;
    },

    /**
     * Stores an object directly in the instance cache. This should
     * not generally be used because reloading cannot work with
     * these objects.
     */
    _setObject: function(name, obj) {
        this.instances[name] = obj;
    },

    /**
     * Creates an object with a previously registered descriptor.
     *
     * Returns a promise that will be resolved (with the created object)
     * once the object has been made. The promise will be resolved
     * immediately if the instance is already there.
     *
     * throws an exception if the object is not registered or if
     * the factory cannot be found.
     */
    createObject: function(name) {
        // console.log("Creating", name);

        // If there is already a loading promise for this instance, then
        // return this one.
        if (this.instancesLoadPromises[name] !== undefined) {
            // console.log("Already have one (it's very nice)");
            return this.instancesLoadPromises[name];
        }

        var descriptor = this._objectDescriptors[name];
        if (descriptor === undefined) {
            throw new Error('Tried to create object "' + name +
                '" but that object is not registered.');
        }

        var factoryName = descriptor.factory || name;
        var ext = this.getExtensionByKey("factory", factoryName);
        if (ext === undefined) {
            throw new Error('When creating object "' + name +
                '", there is no factory called "' + factoryName +
                '" available."');
        }

        // If this is a child catalog and the extension is shared, then
        // as the master/parent catalog to create the object.
        if (this.parent && this.shareExtension(ext)) {
            return this.instancesLoadPromises[name] = this.parent.createObject(name);
        }

        // Otherwise create a new loading promise (which is returned at the
        // end of the function) and create the instance.
        var pr = this.instancesLoadPromises[name] = new Promise();

        var factoryArguments = descriptor.arguments || [];
        var argumentPromises = [];
        if (descriptor.objects) {
            var objects = descriptor.objects;
            for (var key in objects) {
                var objectName = objects[key];
                var ropr = this.createObject(objectName);
                argumentPromises.push(ropr);
                // key is changing, so we need to hang onto the
                // current value
                ropr.location = key;
                ropr.then(function(obj) {
                    _setPath(factoryArguments, ropr.location, obj);
                });
            }
        }

        Promise.group(argumentPromises).then(function() {
            ext.load().then(function(factory) {
                // console.log("Got factory for ", name);
                var action = ext.action;
                var obj;

                if (action === "call") {
                    obj = factory.apply(factory, factoryArguments);
                } else if (action === "new") {
                    if (factoryArguments.length > 1) {
                        pr.reject(new Error('For object ' + name + ', create a simple factory function and change the action to call because JS cannot handle this case.'));
                        return;
                    }
                    obj = new factory(factoryArguments[0]);
                } else if (action === "value") {
                    obj = factory;
                } else {
                    pr.reject(new Error("Create action must be call|new|value. " +
                            "Found" + action));
                    return;
                }

                this.instances[name] = obj;
                pr.resolve(obj);
            }.bind(this));
        }.bind(this));

        return pr;
    },

    /**
     * Retrieve a registered object. Returns undefined
     * if the instance has not been created.
     */
    getObject: function(name) {
        return this.instances[name] || (this.parent ? this.parent.getObject(name) : undefined);
    },

    /**
     * Retrieve an extension point object by name, optionally creating it if it
     * does not exist.
     */
    getExtensionPoint: function(name, create) {
        if (create && this.points[name] === undefined) {
            this.points[name] = new exports.ExtensionPoint(name, this);
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
     * Sets the order of the plugin's extensions. Note that this orders *only*
     * Extensions and nothing else (load order of CSS files e.g.)
     */
    orderExtensions: function(pluginOrder) {
        pluginOrder = pluginOrder || this._extensionsOrdering;

        for (name in this.points) {
            this.points[name].orderExtensions(pluginOrder);
        }
        this._extensionsOrdering = pluginOrder;
    },

    /**
     * Returns the current plugin exentions ordering.
     */
    getExtensionsOrdering: function() {
        return this._extensionsOrdering;
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

    // Topological sort algorithm from Wikipedia, credited to Tarjan 1976.
    //     http://en.wikipedia.org/wiki/Topological_sort
    _toposort: function(metadata) {
        var sorted = [];
        var visited = {};
        var visit = function(key) {
            if (key in visited || !(key in metadata)) {
                return;
            }

            visited[key] = true;
            var depends = metadata[key].dependencies;
            if (!util.none(depends)) {
                for (var dependName in depends) {
                    visit(dependName);
                }
            }

            sorted.push(key);
        };

        for (var key in metadata) {
            visit(key);
        }

        return sorted;
    },
    
    connect: function(epName, modName, metadata) {
        var pluginName = modName.split('/')[0];
        this.registerExtension(epName, metadata, pluginName);
    },
    
    loadAndActivatePlugins: function(plugins) {
        var pr = new Promise();
        var self = this;
        var toLoad = [];
        plugins.forEach(function(pluginData) {
            if (self.plugins[pluginData.name]) {
                return;
            }
            pluginData.mainModuleName = pluginData.main ? pluginData.name + '/' + pluginData.main : pluginData.name;
            pluginData.catalog = self;
            self.plugins[pluginData.name] = new exports.Plugin(pluginData);
            toLoad.push(pluginData.mainModuleName);
        });
        require(toLoad, function() {
            plugins.forEach(function(pluginData) {
                self.plugins[pluginData.name].activate();
            });
            pr.resolve();
        });
        return pr;
    },

    /**
     * Loads the named plugin, returning a promise called
     * when the plugin is loaded. This function is a convenience
     * for unusual situations and debugging only. Generally,
     * you should load plugins by calling load() on an Extension
     * object.
     */
    loadPlugin: function(pluginName) {
        var pr = new Promise();
        var plugin = this.plugins[pluginName];
        if (plugin.objects) {
            var objectPromises = [];
            plugin.objects.forEach(function(objectName) {
                objectPromises.push(this.createObject(objectName));
            }.bind(this));
            Promise.group(objectPromises).then(function() {
                require.ensurePackage(pluginName, function() {
                    pr.resolve();
                });
            });
        } else {
            require([ pluginName ], function(err) {
                if (err) {
                    pr.reject(err);
                } else {
                    pr.resolve();
                }
            });
        }
        return pr;
    },

    /**
     * Dactivates a plugin. If no plugin was deactivated, then a string is
     * returned which contains the reason why deactivating was not possible.
     * Otherwise the plugin is deactivated as well as all plugins that depend on
     * this plugin and a array is returned holding all depending plugins that were
     * deactivated.
     *
     * @param pluginName string Name of the plugin to deactivate
     * @param recursion boolean True if the funciton is called recursive.
     */
    deactivatePlugin: function(pluginName, recursion) {
        var plugin = this.plugins[pluginName];
        if (!plugin) {
            // Deactivate the plugin only if the user called the function.
            if (!recursion) {
                this.deactivatedPlugins[pluginName] = USER_DEACTIVATED;
            }
            return 'There is no plugin named "' + pluginName + '" in this catalog.';
        }

        if (this.deactivatedPlugins[pluginName]) {
            // If the plugin is already deactivated but the user explicip wants
            // to deactivate the plugin, then store true as deactivation reason.
            if (!recursion) {
                this.deactivatedPlugins[pluginName] = USER_DEACTIVATED;
            }
            return 'The plugin "' + pluginName + '" is already deactivated';
        }

        // If the function is called within a recursion, then mark the plugin
        // as DEPENDS_DEACTIVATED otherwise as USER_DEACTIVATED.
        this.deactivatedPlugins[pluginName] = (recursion ? DEPENDS_DEACTIVATED
                                                          : USER_DEACTIVATED);

        // Get all plugins that depend on this plugin.
        var dependents = {};
        var deactivated = [];
        plugin._findDependents(Object.keys(this.plugins), dependents, true);

        // Deactivate all dependent plugins.
        Object.keys(dependents).forEach(function(plugin) {
            var ret = this.deactivatePlugin(plugin, true);
            if (Array.isArray(ret)) {
                deactivated = deactivated.concat(ret);
            }
        }, this);

        // Deactivate this plugin.
        plugin.unregister();

        if (recursion) {
            deactivated.push(pluginName);
        }

        return deactivated;
    },

    /**
     * Activates a plugin. If the plugin can't be activated a string is returned
     * explaining why. Otherwise the plugin is activated, all plugins that depend
     * on this plugin are tried to activated and an array with all the activated
     * depending plugins is returned.
     * Note: Depending plugins are not activated if they user called
     * deactivatePlugin on them to deactivate them explicit.
     *
     * @param pluginName string Name of the plugin to activate.
     * @param recursion boolean True if the funciton is called recursive.
     */
    activatePlugin: function(pluginName, recursion) {
        var plugin = this.plugins[pluginName];
        if (!plugin) {
            return 'There is no plugin named "' + pluginName + '" in this catalog.';
        }

        if (!this.deactivatedPlugins[pluginName]) {
            return 'The plugin "' + pluginName + '" is already activated';
        }

        // Don't activate this plugin if the user explicip deactivated this one
        // and the plugin activation call is called beacuse another plugin
        // this one depended on was activated.
        if (recursion && this.deactivatedPlugins[pluginName] === USER_DEACTIVATED) {
            return;
        }

        // Check if all dependent plugins are activated.
        if (plugin.depends && plugin.depends.length != 0) {
            var works = plugin.depends.some(function(plugin) {
                return !this.deactivatedPlugins[plugin];
            }, this);

            if (!works) {
                // The user activated the plugin but some of the dependent
                // plugins are still deactivated. Change the deactivation reason
                // to DEPENDS_DEACTIVATED.
                this.deactivatedPlugins[pluginName] = DEPENDS_DEACTIVATED;
                return 'Can not activate plugin "' + pluginName +
                        '" as some of its dependent plugins are not activated';
            }
        }

        // Activate this plugin.
        plugin.register();
        this.orderExtensions();
        delete this.deactivatedPlugins[pluginName];

        // Try to activate all the plugins that depend on this one.
        var activated = [];
        var dependents = {};
        plugin._findDependents(Object.keys(this.plugins), dependents, true);
        Object.keys(dependents).forEach(function(pluginName) {
            var ret = this.activatePlugin(pluginName, true);
            if (Array.isArray(ret)) {
                activated = activated.concat(ret);
            }
        }, this);

        if (recursion) {
            activated.push(pluginName);
        }

        return activated;
    },

    /**
     * Removes a plugin, unregistering it and cleaning up.
     */
    removePlugin: function(pluginName) {
        var plugin = this.plugins[pluginName];
        if (plugin == undefined) {
            throw new Error("Attempted to remove plugin " + pluginName
                                            + " which does not exist.");
        }

        plugin.unregister();
        plugin._cleanup(true /* leaveLoader */);
        delete this.metadata[pluginName];
        delete this.plugins[pluginName];
    },

    /**
     * for the given plugin, get the first part of the URL required to
     * get at that plugin's resources (images, etc.).
     */
    getResourceURL: function(pluginName) {
        var link = document.getElementById("skywriter_base");
        var base = "";
        if (link) {
            base += link.href;
            if (!util.endsWith(base, "/")) {
                base += "/";
            }
        }
        var plugin = this.plugins[pluginName];
        if (plugin == undefined) {
            return undefined;
        }
        return base + plugin.resourceURL;
    },

    /**
     * Check the dependency graph to ensure we don't have cycles.
     */
    _checkLoops: function(pluginName, data, trail) {
        var circular = false;
        trail.forEach(function(node) {
            if (pluginName === node) {
                console.error("Circular dependency", pluginName, trail);
                circular = true;
            }
        });
        if (circular) {
            return true;
        }
        trail.push(pluginName);
        if (!data[pluginName]) {
            console.error("Missing metadata for ", pluginName);
        } else {
            if (data[pluginName].dependencies) {
                for (var dependency in data[pluginName].dependencies) {
                    var trailClone = trail.slice();
                    var errors = this._checkLoops(dependency, data, trailClone);
                    if (errors) {
                        console.error("Errors found when looking at ", pluginName);
                        return true;
                    }
                }
            }
        }
        return false;
    },

    /**
     * Retrieve an array of the plugin objects.
     * The opts object can include the following options:
     * onlyType (string): only include plugins of this type
     * sortBy (array): list of keys to sort by (the primary sort is first).
     *                 default is sorted alphabetically by name.
     */
    getPlugins: function(opts) {
        var result = [];
        var onlyType = opts.onlyType;

        for (var key in this.plugins) {
            var plugin = this.plugins[key];

            // apply the filter
            if ((onlyType && plugin.type && plugin.type != onlyType)
                || plugin.name == "skywriter") {
                continue;
            }

            result.push(plugin);
        }

        var sortBy = opts.sortBy;
        if (!sortBy) {
            sortBy = ["name"];
        }

        var sortfunc = function(a, b) {
            for (var i = 0; i < sortBy.length; i++) {
                key = sortBy[i];
                if (a[key] < b[key]) {
                    return -1;
                } else if (b[key] < a[key]) {
                    return 1;
                }
            }
            return 0;
        };

        result.sort(sortfunc);
        return result;
    },

    /**
     * Returns a promise to retrieve the object at the given property path,
     * loading the plugin if necessary.
     */
    loadObjectForPropertyPath: function(path, context) {
        var promise = new Promise();
        var parts = /^([^:]+):([^#]+)#(.*)$/.exec(path);
        if (parts === null) {
            throw new Error("loadObjectForPropertyPath: malformed path: '" +
                path + "'");
        }

        var pluginName = parts[1];
        if (pluginName === "") {
            if (util.none(context)) {
                throw new Error("loadObjectForPropertyPath: no plugin name " +
                    "supplied and no context is present");
            }

            pluginName = context;
        }

        require.ensurePackage(pluginName, function() {
            promise.resolve(this.objectForPropertyPath(path));
        }.bind(this));

        return promise;
    },

    /**
     * Finds the object for the passed path or array of path components.  This is
     * the standard method used in SproutCore to traverse object paths.
     * @param path {String} the path
     * @param root {Object} optional root object.  window is used otherwise
     * @param stopAt {Integer} optional point to stop searching the path.
     * @returns {Object} the found object or undefined.
     */
    objectForPropertyPath: function(path, root, stopAt) {
        stopAt = (stopAt == undefined) ? path.length : stopAt;
        if (!root) {
            root = window;
        }

        var hashed = path.split("#");
        if (hashed.length !== 1) {
            var module = require(hashed[0]);
            if (module === undefined) {
                return undefined;
            }

            path = hashed[1];
            root = module;
            stopAt = stopAt - hashed[0].length;
        }

        var loc = 0;
        while (root && loc < stopAt) {
            var nextDotAt = path.indexOf('.', loc);
            if (nextDotAt < 0 || nextDotAt > stopAt) {
                nextDotAt = stopAt;
            }
            var key = path.slice(loc, nextDotAt);
            root = root[key];
            loc = nextDotAt + 1;
        }

        if (loc < stopAt) {
            root = undefined; // hit a dead end. :(
        }

        return root;
    },

    /**
     * Publish <tt>value</tt> to all plugins that match both <tt>ep</tt> and
     * <tt>key</tt>.
     * @param source {object} The source calling the publish function.
     * @param epName {string} An extension point (indexed by the catalog) to which
     * we publish the information.
     * @param key {string} A key to which we publish (linearly searched, allowing
     * for regex matching).
     * @param value {object} The data to be passed to the subscribing function.
     */
    publish: function(source, epName, key, value) {
        var ep = this.getExtensionPoint(epName);

        if (this.shareExtension(ep)) {
            if (this.parent) {
                this.parent.publish(source, epName, key, value);
            } else {
                this.children.forEach(function(child) {
                    child._publish(source, epName, key, value);
                });
                this._publish(source, epName, key, value);
            }
        } else {
            this._publish(source, epName, key, value);
        }
    },

    _publish: function(source, epName, key, value) {
        var subscriptions = this.getExtensions(epName);
        subscriptions.forEach(function(sub) {
            // compile regexes only once
            if (sub.match && !sub.regexp) {
                sub.regexp = new RegExp(sub.match);
            }
            if (sub.regexp && sub.regexp.test(key)
                    || sub.key === key
                    || (util.none(sub.key) && util.none(key))) {
                sub.load().then(function(handler) {
                    handler(source, key, value);
                });
            }
        });
    },

    /**
     * The subscribe side of #publish for use when the object which will
     * publishes is created dynamically.
     * @param ep The extension point name to subscribe to
     * @param metadata An object containing:
     * <ul>
     * <li>pointer: A function which should be called on matching publish().
     * This can also be specified as a pointer string, however if you can do
     * that, you should be placing the metadata in package.json.
     * <li>key: A string that exactly matches the key passed to the publish()
     * function. For smarter matching, you can use 'match' instead...
     * <li>match: A regexp to be used in place of key
     * </ul>
     */
    registerExtension: function(ep, metadata, pluginName) {
        var extension = new exports.Extension(metadata);
        extension.pluginName = pluginName === undefined ? '__dynamic' : pluginName;
        this.getExtensionPoint(ep, true).register(extension);
    },
    
    addExtensionPoint: function(epName, metadata) {
        // extensionpoint is a special case, because it is set up from the get-go.
        if (epName == "extensionpoint") {
            return;
        }
        console.log("defining ep ", epName, " for ", this._currentPlugin);
        metadata.pluginName = this._currentPlugin;
        exports.registerExtensionPoint(new exports.Extension(metadata), this, false);
    }
};

/**
 * Register handler for extension points.
 * The argument `deactivated` is set to true or false when this method is called
 * by the _registerMetadata function.
 */
exports.registerExtensionPoint = function(extension, catalog, deactivated) {
    var ep = catalog.getExtensionPoint(extension.name, true);
    ep.description = extension.description;
    ep.pluginName = extension.pluginName;
    ep.params = extension.params;
    if (extension.indexOn) {
        ep.indexOn = extension.indexOn;
    }

    if (!deactivated && (extension.register || extension.unregister)) {
        exports.registerExtensionHandler(extension, catalog);
    }
};

/**
 * Register handler for extension handler.
 */
exports.registerExtensionHandler = function(extension, catalog) {
    // Don't add the extension handler if there is a master/partent catalog
    // and this plugin is shared. The extension handlers are only added
    // inside of the master catalog.
    if (catalog.parent && catalog.shareExtension(extension)) {
        return;
    }

    var ep = catalog.getExtensionPoint(extension.name, true);
    ep.handlers.push(extension);
    if (extension.register) {
        // Store the current extensions to this extension point. We can't
        // use the ep.extensions array within the load-callback-function, as
        // the array at that point in time also contains extensions that got
        // registered by calling the handler.register function directly.
        // As such, using the ep.extensions in the load-callback-function
        // would result in calling the handler's register function on a few
        // extensions twice.
        var extensions = util.clone(ep.extensions);

        extension.load(function(register) {
            if (!register) {
                throw extension.name + " is not ready";
            }
            extensions.forEach(function(ext) {
                // console.log('call register on:', ext)
                register(ext, catalog);
            });
        }, "register", catalog);
    }
};

/**
 * Unregister handler for extension point.
 */
exports.unregisterExtensionPoint = function(extension, catalog) {
    // Note: When an extensionPoint is unregistered, the extension point itself
    // stays but the handler goes away.
    // DISCUSS: Is this alright? The other option is to remove the ep completly.
    // The downside of this is, that when the ep arrives later again, it has
    // to look for extension handlers bound to this ep and add them all again.
    if (extension.register || extension.unregister) {
        exports.unregisterExtensionHandler(extension);
    }
};

/**
 * Unregister handler for extension handler.
 */
exports.unregisterExtensionHandler = function(extension, catalog) {
    // Don't remove the extension handler if there is a master/partent catalog
    // and this plugin is shared. The extension handlers are only added
    // inside of the master catalog.
    if (catalog.parent && catalog.shareExtension(extension)) {
        return;
    }

    var ep = catalog.getExtensionPoint(extension.name, true);
    if (ep.handlers.indexOf(extension) == -1) {
        return;
    }
    ep.handlers.splice(ep.handlers.indexOf(extension), 1);
    if (extension.unregister) {
        // Store the current extensions to this extension point. We can't
        // use the ep.extensions array within the load-callback-function, as
        // the array at that point in time also contains extensions that got
        // registered by calling the handler.register function directly.
        // As such, using the ep.extensions in the load-callback-function
        // would result in calling the handler's register function on a few
        // extensions twice.
        var extensions = util.clone(ep.extensions);

        extension.load(function(unregister) {
            if (!unregister) {
                throw extension.name + " is not ready";
            }
            extensions.forEach(function(ext) {
                // console.log('call register on:', ext)
                unregister(ext);
            });
        }, "unregister");
    }
};

exports.catalog = new exports.Catalog();

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
    var keys = Object.keys(obj);
    var i = keys.length;
    while (--i > 0) {
        if (regex.exec(keys[i])) {
            delete obj[keys[i]];
        }
    }
};

exports.getUserPlugins = function() {
    return exports.catalog.getPlugins({ onlyType: 'user' });
};

});
