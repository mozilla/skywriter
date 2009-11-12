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
 * A hub for client side pub/sub.
 * <p>It's probably best to avoid using this in place of SproutCore bindings
 * unless there is a good reason to do so.
 */
exports.Hub = SC.Object.extend(/** @lends exports.Hub */ {
    /**
     * Where our pub/sub topics are their subscribers are stored
     */
    _topics: {},

    /**
     * A list of the events that have fired at least once, for fireAfter
     */
    _eventLog: {},

    /**
     * Invoke all listener method subscribed to topic.
     * <p>From dojo.publish()
     * <p>Example:
     * <pre>
     * bespin.subscribe("alerts", null, function(caption, message) {
     *     alert(caption + "\n" + message);
     * });
     * bespin.publish("alerts", [ "read this", "hello world" ]);
     * </pre>
     * @param {String} topic The name of the topic to publish.
     * @param {Array} args An array of arguments. The arguments will be applied
     * to each topic subscriber (as first class parameters, via apply).
     * Note that args is an array, which is more efficient vs variable length
     * argument list. Ideally, var args would be implemented via Array
     * throughout the APIs.
     */
    publish: function(topic, args) {
        if (window.globalStorage && window.globalStorage[location.hostname] &&
                window.globalStorage[location.hostname].debug) {
            console.log("Publish", topic, args);
        }

        this._eventLog[topic] = true;
        var topic = "bespin:" + topic;
        args = Array.isArray(args) ? args : [ args || {} ];

        var dispatcher = this._topics[topic];
        if (dispatcher) {
            dispatcher.apply(null, args);
        }
    },

    /**
     * Attach a listener to a named topic. The listener function is invoked
     * whenever the named topic is published (see: bespin.publish).
     * Returns a handle which is needed to unsubscribe this listener.
     * <p>From dojo.subscribe()
     * <p>Example:
     * <pre>
     * bespin.subscribe("alerts", null, function(caption, message) {
     *     alert(caption + "\n" + message);
     * });
     * bespin.publish("alerts", [ "read this", "hello world" ]);
     * </pre>
     * @param {String} topic ID to match topic of publishes
     * @param {String|Function} method The name of a function in context, or a
     * function reference. Invoked when topic is published.
     * @param {Object|null} context Scope for method call, or null for default
     */
    subscribe: function(topic, method, context) {
        var topic = "bespin:" + topic;
        var boundMethod = method.bind(context);

        // this._topics[topic] is null, a dispatcher, or some other function
        var dispatcher = this._topics[topic];

        // Ensure a dispatcher
        if (!dispatcher || !dispatcher._listeners) {
            var origDispatcher = dispatcher;

            var dispatcher = function() {
                var listeners = arguments.callee._listeners;
                var target = arguments.callee.target;

                // return value comes from original target function
                var r = target && target.apply(this, arguments);

                // make local copy of listener array so it is immutable during
                // processing
                var listeners = [].concat(listeners);

                // invoke listeners after target function
                for (var i in listeners) {
                    if (!(i in Array.prototype)) {
                        listeners[i].apply(this, arguments);
                    }
                }
                // return value comes from original target function
                return r;
            }.bind(this);

            // following comments pulled out-of-line to prevent cloning them
            // in the returned function.
            // - indices (i) that are really in the array of listeners (ls) will
            //   not be in Array.prototype. This is the 'sparse array' trick
            //   that keeps us safe from libs that take liberties with built-in
            //   objects
            // - listener is invoked with current scope (this)

            // original target function is special
            dispatcher.target = origDispatcher;
            // dispatcher holds a list of listeners
            dispatcher._listeners = [];
            // redirect topics to dispatcher
            this._topics[topic] = dispatcher;
        }

        // The contract is that a handle is returned that can
        // identify this listener for disconnect.
        //
        // The type of the handle is private. Here is it implemented as Integer.
        // DOM event code has this same contract but handle is Function
        // in non-IE browsers.
        //
        // We could have separate lists of before and after listeners.
        var listened = dispatcher._listeners.push(boundMethod) ; /*Handle*/

        return [topic, listened];
    },

    /**
     * Remove a topic listener.
     * <p>From dojo.unsubscribe()
     * <p>Example:
     * <pre>
     * var alerter = bespin.subscribe("alerts", function() { ... });
     * bespin.unsubscribe(alerter);
     * </pre>
     * @param handle The handle returned from a call to subscribe.
     */
    unsubscribe: function(handle) {
        if (handle) {
            var topic = handle[0];
            var listener = handle[1];

            var dispatcher = this._topics[topic];
            // remember that listener is the index+1 (0 is not a valid listener)
            if (dispatcher && dispatcher._listeners && listener--) {
                delete dispatcher._listeners[listener];
            }
        }
    },

    /**
     * Given an array of topics, fires given callback as soon as all of the
     * topics have fired at least once
     */
    fireAfter: function(topicList, callback) {
        if (!Array.isArray(topicList)) {
            throw new Error("fireAfter() takes an array of topics. '" +
                    topicList + "' is not an array.");
        }

        var count = topicList.length;
        var done  = function () {
            if (count == 0) {
                callback();
            }
        };

        for (var i = 0; i < topicList.length; ++i) {
            var topic = topicList[i];
            if (this._eventLog[topic]) {
                --count;
            } else {
                this.subscribe(topic, function () {
                    --count;
                    done();
                });
            }

            done();
        }
    }
});
