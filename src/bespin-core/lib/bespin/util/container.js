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

var hub = require("bespin/util/hub");

/**
 * Methods for registering components with the main system
 */
var registeredComponents = {};

/**
 * Given an id and an object, register it inside of Bespin.
 * <p>The way to attach components into bespin for others to get them out
 */
exports.register = function(id, object) {
    registeredComponents[id] = object;
    hub.publish("component:register:" + id, { id: id, object: object });
    return object;
};

/**
 * Undoes the effects of #register()
 */
exports.unregister = function(id) {
    delete registeredComponents[id];
};

/**
 * Given an id, return the component.
 */
exports.get = function(id) {
    return registeredComponents[id];
};

/**
 * Given an id, and function to run, execute it if the component is available
 */
exports.withComponent = function(id, func) {
    var component = this.get(id);
    if (component) {
        return func(component);
    }
};

/**
 * Asynchronous component management.
 *
 * Retrieve the component with the given ID. If the component is
 * not yet loaded, load the component and pass it along. The
 * callback is called with the component as the single parameter.
 *
 * This function returns:
 * * true if the component was already available and the callback
 *   has been called
 * * false if the component was not loaded and is being loaded
 *   asynchronously
 * * undefined if the component is unknown.
 */
exports.getComponent = function(id, callback, context) {
    context = context || window;
    var component = exports.get(id);
    if (!component) {
        var factory = exports.factories[id];
        if (!factory) {
            return undefined;
        }
        factory(callback, context);
        return false;
    } else {
        callback.call(context, component);
    }
    return true;
};

exports.factories = {
    popup: function(callback, context) {
        exports.plugins.loadOne("popup", function(popupmod) {
            var popup = exports.register("popup", new popupmod.Window());
            callback.call(context, popup);
        });
    },
    piemenu: function(callback, context) {
        exports.plugins.loadOne("piemenu", function(piemenumod) {
            exports.register("piemenu", new piemenumod.Window());

            // the pie menu doesn't animate properly
            // without restoring control to the UI temporarily
            setTimeout(function() {
                var piemenu = exports.get("piemenu");
                callback.call(context, piemenu);
            }, 25);
        });
    },
    commandLine: function(callback, context) {
        exports.plugins.loadOne("commandLine", function(commandline) {
            var commandLine = exports.register("commandLine",
                new commandline.Interface('command', exports.command.store)
            );
            callback.call(context, commandLine);
        });
    },
    debugbar: function(callback, context) {
        exports.plugins.loadOne("debugbar", function(debug) {
            var commandLine = exports.register("debugbar",
                new debug.EvalCommandLineInterface('debugbar_command', null, {
                    idPrefix: "debugbar_",
                    parentElement: document.getElementById("debugbar")
                })
            );
            callback.call(context, commandLine);
        });
    },
    breakpoints: function(callback, context) {
        exports.plugins.loadOne("breakpoints", function(BreakpointManager) {
            var breakpoints = exports.register("breakpoints",
                new BreakpointManager()
            );
            callback.call(context, breakpoints);
        });
    }
};

var subscribeToExtension = function(key) {
    hub.subscribe("extension:removed:" + key, function() {
        var item = exports.get(key);
        if (item && item.destroy) {
            item.destroy();
        }
        hub.unregister(key);
    });
};

var initializeReloaders = function() {
    for (var key in exports.factories) {
        subscribeToExtension(key);
    }
};

// hub.subscribe("extension:loaded:bespin.subscribe", function(ext) {
//     var subscription = hub.subscribe(ext.topic, function(e) {
//         ext.load(function(func) {
//             func(e);
//         });
//     });
//     ext.subscription = subscription;
// });
//
// hub.subscribe("extension:removed:bespin.subscribe", function(ext) {
//     if (ext.subscription) {
//         hub.unsubscribe(ext.subscription);
//     }
// });
//
// initializeReloaders();
