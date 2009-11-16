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

var util = require("util/util");
var builtins = require("builtins");

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
exports.Container = SC.Object.extend(/** @lends exports.Container */ {
    /**
     * Methods for registering components with the main system
     */
    components: {},

    /**
     * To prevent a loop where a requires b, requires a we track things we are
     * creating, and if asked to create something thats already there, we die
     */
    beingCreated: {},

    /**
     * Containers contain themselves so they can be got at easily
     */
    init: function() {
        this.register("ioc", this);
    },

    /**
     * Given an id and an object, register it inside of Bespin.
     * <p>The way to attach components into bespin for others to get them out
     */
    register: function(id, object) {
        this.components[id] = object;
        this.inject(object);
        console.log("container.register", id, object);
        return object;
    },

    /**
     * Undoes the effects of #register()
     */
    unregister: function(id) {
        delete this.components[id];
    },

    /**
     * Inject the requirements into an object
     */
    inject: function(object) {
        if (object && object.requires) {
            // Clone the requires structure so we can remove fulfilled
            // requirements and not trip over anything in the prototype chain.
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
                     * We've found a component to match , so this needs to be
                     * injected into object[property] and recalled for next time
                     */
                    var onFound = function(component) {
                        object[property] = component;
                        delete requirements[property];
                        checkCompleted();
                    }.bind(this);

                    var source = object.requires[property];
                    var component = this.components[source];
                    if (component !== undefined) {
                        onFound(component);
                    } else {
                        this._createFromFactory(name, function(component) {
                            this.register(name, component);
                            onFound(component);
                        }.bind(this));
                    }
                }
            }
        }
    },

    /**
     * Given an id, return the component.
     */
    get: function(id) {
        var object = this.components[id];
        if (object === undefined) {
            var onCreate = function(component) {
                this.register(id, component);
                object = component;
            }.bind(this);
            this._createFromFactory(id, onCreate);
        }
        return object;
    },

    /**
     * Asynchronous component management.
     * <p>Retrieve the component with the given ID. If the component is not yet
     * loaded, load the component and pass it along. The callback is called with
     * the component as the single parameter.
     */
    getComponent: function(id, callback, context) {
        context = context || window;
        var component = this.components[id];
        if (component !== undefined) {
            callback.call(context, component);
        } else {
            var onCreate = function(component) {
                this.register(id, component);
                callback.call(context, component);
            }.bind(this);
            this._createFromFactory(id, onCreate);
        }
    },

    /**
     * Internal function to create an object using a lookup into the factories
     * registry.
     * <p>We lookup <code>id</code> in <code>factories</code>. If the value is a
     * function we call it, passing <code>onCreate</code>. If the value is a
     *  stringthen we split on ":", and <code>require</code> the section before,
     * and call the function exported under the string after the ":".
     * <p>For example if the module "bespin/foo" exported a function using
     * <code>exports.bar = function(onCreate) { ... }</code> then we could use
     * that as a factory using "bespin/foo:bar".
     * @private
     */
    _createFromFactory: function(id, onCreate) {
        if (this.beingCreated[id] !== undefined) {
            console.trace();
            throw "Already creating " + id;
        }

        this.beingCreated[id] = onCreate;
        try {
            var factory = builtins.factories[id];
            if (factory === undefined) {
                console.trace();
                throw "No component factory '" + id + "'";
            } else if (util.isFunction(factory)) {
                factory(onCreate);
            } else {
                // Extract the method
                var parts = factory.split(" ");
                if (parts.length != 2) {
                    throw "Can't split " + factory + " into 2 parts on ' '";
                }
                var action = parts.shift();
                // Split on ":" for module and export
                var factory = parts.join(" ");
                var parts = factory.split(":");
                if (parts.length != 2) {
                    throw "Can't split " + factory + " into 2 parts on ':'";
                }
                // Maybe rather than being synch with "module = re(parts[0]);"
                // we should be doing this
                // re.when(re.async(parts[0]), function(module) {
                //     var exported = module[parts[1]];
                //     ...
                // });
                // This works for now, and I'm not trying to solve every problem
                // What we really want is a give it me now if you can, otherwise
                // we go async ...
                // We can't handle dynamic requirements yet
                var re = require;
                var module = re(parts[0]);
                var exported = module[parts[1]];
                if (action == "call") {
                    exported(onCreate);
                } else if (action == "create") {
                    onCreate(exported.create());
                } else if (action == "new") {
                    onCreate(new exported());
                } else if (action == "value") {
                    onCreate(exported);
                } else {
                    throw "Create action must be call|create|new|value. " +
                            "Found" + action;
                }
            }
        }
        finally {
            delete this.beingCreated[id];
        }
    }
});

/**
 * When we don't want to provide an object that actually does anything.
 * TODO: Delete this when we don't need to create fake components any more
 */
exports.dummyFactory = function(onCreate) {
    onCreate(null);
};
