// module: bespin

dojo.mixin(exports, {
    // BEGIN VERSION BLOCK
    /** The core version of the Bespin system */
    versionNumber: 'tip',
    /** The version number to display to users */
    versionCodename: 'DEVELOPMENT MODE',
    /** The version number of the API (to ensure that the client and server are talking the same language) */
    apiVersion: 'dev',
    // END VERSION BLOCK
  
    /** Basic setting. TODO: Explain why this is here or move it */
    defaultTabSize: 4,

    /** The name of the project that contains the users client side settings */
    userSettingsProject: "BespinSettings",

    /** A list of the events that have fired at least once, for fireAfter */
    _eventLog: {},

    /** Holds the count to keep a unique value for setTimeout */
    _lazySubscriptionCount: 0,

    /** Holds the timeouts so they can be cleared later */
    _lazySubscriptionTimeout: {},
  
    /**
     * Given a topic and a set of parameters, publish onto the bus.
     * maps onto dojo.publish but lets us abstract away for the future
     */
    publish: function(topic, args) {
        if (window.globalStorage && window.globalStorage[location.hostname] && window.globalStorage[location.hostname].debug) {
            console.log("Publish", topic, args);
        }

        exports._eventLog[topic] = true;
        dojo.publish("bespin:" + topic, dojo.isArray(args) ? args : [ args || {} ]);
    },

    /**
     * Given an array of topics, fires given callback as soon as all of the
     * topics have fired at least once
     */
    fireAfter: function(topics, callback) {
        if (!dojo.isArray(topics)) {
            throw new Error("fireAfter() takes an array of topics. '" + topics + "' is not an array.");
        }

        var count = topics.length;
        var done  = function () {
            if (count == 0) {
                callback();
            }
        };

        for (var i = 0; i < topics.length; ++i) {
            var topic = topics[i];
            if (exports._eventLog[topic]) {
                --count;
            } else {
                exports.subscribe(topic, function () {
                    --count;
                    done();
                });
            }
            done();
        }
    },

    /**
     * Given a topic and a function, subscribe to the event.
     * <p>If minTimeBetweenPublishMillis is set to an integer the subscription
     * will not be invoked more than once within this time interval.
     * <p>Maps onto dojo.subscribe but lets us abstract away for the future
     * TODO: Is minTimeBetweenPublishMillis ever used? I'm not sure that it's
     * that useful given our synchronous implementation, and we should perhaps
     * replace this parameter with a scope with which to call the callback
     */
    subscribe: function(topic, callback, minTimeBetweenPublishMillis) {
        if (minTimeBetweenPublishMillis) {
            var orig = callback;

            var count = this._lazySubscriptionCount++;

            var self = this;
            callback = function() { // lazySubscriptionWrapper
                if (self._lazySubscriptionTimeout[count]) {
                    clearTimeout(self._lazySubscriptionTimeout[count]);
                }

                self._lazySubscriptionTimeout[count] = setTimeout(function() {
                    orig.apply(self, arguments);
                    delete self._lazySubscriptionTimeout[count];
                }, minTimeBetweenPublishMillis);
            };
        }
        return dojo.subscribe("bespin:" + topic, callback);
    },

    /**
     * Unsubscribe the functions from the topic.
     * <p>Maps onto dojo.unsubscribe but lets us abstract away for the future
     */
    unsubscribe: dojo.unsubscribe,

    /**
     * Methods for registering components with the main system
     */
    registeredComponents: {},

    /**
     * Given an id and an object, register it inside of Bespin.
     * <p>The way to attach components into bespin for others to get them out
     */
    register: function(id, object) {
        this.registeredComponents[id] = object;

        exports.publish("component:register:" + id, { id: id, object: object });

        return object;
    },

    /**
     * Given an id, return the component.
     */
    get: function(id) {
        return this.registeredComponents[id];
    },
    
    unregister: function(id) {
        delete this.registeredComponents[id];
    },
    
    /**
     * Given an id, and function to run, execute it if the component is available
     */
    withComponent: function(id, func) {
        var component = this.get(id);
        if (component) {
            return func(component);
        }
    },
    
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
    getComponent: function(id, callback, context) {
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
    },
    
    factories: {
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
                        parentElement: dojo.byId("debugbar")
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
    },

    /**
     * Set innerHTML on the element given, with the Bespin version info
     */
    displayVersion: function(el) {
        el = dojo.byId(el) || dojo.byId("version");
        if (!el) return;
        el.innerHTML = '<a href="https://wiki.mozilla.org/Labs/Bespin/ReleaseNotes" title="Read the release notes">Version <span class="versionnumber">' + this.versionNumber + '</span> "' + this.versionCodename + '"</a>';
    },
    
    _subscribeToExtension: function(key) {
        exports.subscribe("extension:removed:" + key, function() {
            var item = exports.get(key);
            if (item && item.destroy) {
                item.destroy();
            }
            exports.unregister(key);
        });
    },
    
    _initializeReloaders: function() {
        for (var key in exports.factories) {
            exports._subscribeToExtension(key);
        }
    }
});

// bespin.subscribe("extension:loaded:bespin.subscribe", function(ext) {
//     var subscription = bespin.subscribe(ext.topic, function(e) {
//         ext.load(function(func) {
//             func(e);
//         });
//     });
//     ext.subscription = subscription;
// });
// 
// bespin.subscribe("extension:removed:bespin.subscribe", function(ext) {
//     if (ext.subscription) {
//         bespin.unsubscribe(ext.subscription);
//     }
// });
// 
// bespin._initializeReloaders();
