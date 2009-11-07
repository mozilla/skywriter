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

/**
 * The Bespin container provides a way for various parts of the system to
 * discover each other.
 *
 * <p>Currently 'bespin' is a singleton that is referenced everywhere. This code
 * reduces the need for it to be a singleton, makes dependencies more explicit,
 * allows for dynamic re-loading and makes component access simpler.
 *
 * <p>When any component is registered with the container it is introspected for
 * a 'requires' member. This map links desired member names to system titles.
 * For example:
 * <pre>requires: { fred:'jane', shiela:'bill' }</pre>
 * <p>The container assumes from this that it should inject the 'jane' component
 * into the fred member of this object, and the 'bill' component into the shiela
 * member, so the component can access a 'jane' using <code>this.fred</code>.
 *
 * <p>It will be more common for the requires line to have the same name in
 * both slots, for example: <code>requires: { editor:'editor' }</code>.
 *
 * <p>There will be a mapping from the component names ('jane'/'dave' above) to
 * creator functions that will be provided by the plug-in system. Currently,
 * however this is hard coded. This will allow people to provide alternative
 * implementations of any core component, and since the container can track who
 * uses what, it can re-inject newer versions of those components at runtime.
 */

var util = require("bespin:util/util");

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

    console.log("container.register", id, object);
    if (object.requires) {
        // Clone the requires structure so we can remove fulfilled requirements
        // and not trip over anything in the prototype chain.
        var requirements = {};
        for (var property in object.requires) {
            if (object.requires.hasOwnProperty(property)) {
                var name = object.requires[property];
                requirements[property] = name;
            }
        }

        /**
         * Call afterContainerSetup if we've injected all that we need to
         */
        var checkCompleted = function() {
            var remaining = 0;
            for (var i in requirements) {
                if (object.requires.hasOwnProperty(property)) {
                    remaining++;
                }
            }
            if (remaining == 0) {
                if (object.afterContainerSetup) {
                    object.afterContainerSetup();
                }
            }
        };

        checkCompleted();

        for (var property in requirements) {
            if (object.requires.hasOwnProperty(property)) {
                var name = requirements[property];
                /**
                 * We've found a component to match name, so this needs to be
                 * injected into object[property] and recalling for next time.
                 */
                var onCreate = function(component) {
                    object[property] = component;
                    exports.register(name, component);
                    delete requirements[property];
                    checkCompleted();
                };

                var source = object.requires[name];
                var component = exports.get(source);
                if (component) {
                    onCreate(component);
                } else {
                    createFromFactory(name, onCreate);
                }
            }
        }
    }

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
 * Asynchronous component management.
 * <p>Retrieve the component with the given ID. If the component is not yet
 * loaded, load the component and pass it along. The callback is called with the
 * component as the single parameter.
 */
exports.getComponent = function(id, callback, context) {
    context = context || window;
    var component = exports.get(id);
    if (component) {
        callback.call(context, component);
    } else {
        var onCreate = function(component) {
            exports.register(id, component);
            callback.call(context, component);
        };
        createFromFactory(id, onCreate);
    }
};

/**
 * When we don't want to provide an object that actually does anything
 */
exports.dummyFactory = function(onCreate) {
    onCreate({});
};

/**
 * We can't handle dynamic requirements yet
 */
var re = require;

/**
 * Internal function to create an object using a lookup into the factories
 * registry.
 * <p>We lookup <code>id</code> in <code>factories</code>. If the value is a
 * function we call it, passing <code>onCreate</code>. If the value is a string
 * then we split on ":", and <code>require</code> the section before, and call
 * the function exported under the string after the ":".
 * <p>For example if the module "bespin/foo" exported a function using
 * <code>exports.bar = function(onCreate) { ... }</code> then we could use that
 * as a factory using "bespin/foo:bar".
 */
function createFromFactory(id, onCreate) {
    var factory = exports.factories[id];
    if (!factory) {
        console.error("No component ", id);
    } else if (util.isFunction(factory)) {
        factory(onCreate);
    } else {
        // Assume string and split on ":"
        var parts = factory.split(":");
        if (parts.length != 2) {
            console.error("Can't split ", factory, "into 2 parts on ':'");
        } else {
            // Maybe rather than being synchronous with "module = re(parts[0]);"
            // we should be doing this
            // re.when(re.async(parts[0]), function(module) {
            //     var exported = module[parts[1]];
            //     ...
            // });
            // This works for now, and I'm not trying to solve every problem
            var module = re(parts[0]);
            var exported = module[parts[1]];
            if (util.isFunction(exported)) {
                exported(onCreate);
            } else {
                onCreate(exported);
            }
        }
    }
}

/**
 * How to create the various components that make up core bespin.
 * Ideally these would all be strings like 'settings', then we could easily load
 * the entire initial configuration from the plugin system.
 */
exports.factories = {
    settings: "bespin/settings:factory",
    session: "bespin/util/container:dummyFactory",
    file: "bespin/util/container:dummyFactory",
    popup: function(onCreate) {
        exports.plugins.loadOne("popup", function(popupmod) {
            onCreate(new popupmod.Window());
        });
    },
    piemenu: function(onCreate) {
        exports.plugins.loadOne("piemenu", function(piemenumod) {
            var piemenu = new piemenumod.Window();
            // the pie menu doesn't animate properly
            // without restoring control to the UI temporarily
            setTimeout(function() { onCreate(piemenu); }, 25);
        });
    },
    commandLine: function(onCreate) {
        onCreate({});
        /*
        exports.plugins.loadOne("commandLine", function(commandline) {
            onCreate(new commandline.Interface('command', exports.command.store));
        });
        */
    },
    debugbar: function(onCreate) {
        exports.plugins.loadOne("debugbar", function(debug) {
            onCreate(new debug.EvalCommandLineInterface('debugbar_command', null, {
                idPrefix: "debugbar_",
                parentElement: document.getElementById("debugbar")
            }));
        });
    },
    breakpoints: function(onCreate) {
        exports.plugins.loadOne("breakpoints", function(BreakpointManager) {
            onCreate(new BreakpointManager());
        });
    }
};

/*
var hub = re quire("bespin/util/hub");

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
*/
