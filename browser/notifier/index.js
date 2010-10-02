require.def(['require', 'exports', 'module',
    'skywriter/plugins',
    'notifier/settings',
    'skywriter/console'
], function(require, exports, module,
    plugins,
    settingsMod,
    consoleMod
) {

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

exports.init = function() {
    var catalog = plugins.catalog;
    catalog.connect("factory", module.id, { "name": "notifier", "action": "new", "pointer": "#Notifier" });
    catalog.addExtensionPoint("notification", {
        "description":
            "tells the notifier about a kind of notification that may be presented to the user. This will be used in a notification configuration user interface, for example.",
        "register": "#registerNotification",
        "unregister": "#unregisterNotification",
        "params": [
            {
                "name": "name",
                "description":
                    "name of the notification type. Notifications are identified by the combination of pluginName_notificationName, so you don't need to worry about making this unique across Skywriter.",
                "type": "string",
                "required": true
            },
            {
                "name": "description",
                "description":
                    "The more human-readable form of the notification name that will be presented to the user.",
                "type": "string"
            },
            {
                "name": "level",
                "description":
                    "default level for these notifications. Value should be 'error', 'info' or 'debug'.",
                "type": "string"
            },
            {
                "name": "onclick",
                "description":
                    "function that should be called if one of these notifications is clicked on. Will be passed the message object.",
                "type": "pointer"
            },
            {
                "name": "iconUrl",
                "description":
                    "custom icon for this notification. looked up relative to the plugins resources directory.",
                "type": "resourceUrl"
            }
        ]
    });
    catalog.connect("notification", module.id, { "name": "debug", "description": "Debugging Messages", "level": "debug" });
    catalog.addExtensionPoint("notificationHandler", {
        "description":
            "A function that is called with message objects whenever appropriate notifications are published.",
        "indexOn": "name",
        "params": [
            {
                "name": "name",
                "description":
                    "convenient name for the handler (used in configuration)",
                "type": "string",
                "required": true
            },
            {
                "name": "description",
                "description": "Longer, more human-readable description of the handler",
                "type": "string"
            },
            {
                "name": "pointer",
                "description": "function that will be called with the message",
                "required": true
            }
        ]
    });
    catalog.connect("notificationHandler", module.id, {
        "name": "console",
        "description": "Logs to the browser console",
        "pointer": "handlers#console"
    });
    catalog.connect("notificationHandler", module.id, {
        "name": "alert",
        "description": "Displays in browser alerts",
        "pointer": "handlers#alert"
    });
    catalog.connect("setting", module.id, {
        "name": "notifications",
        "description":
            "JSON array of objects describing how notifications are configured",
        "type": "text",
        "defaultValue": "[]"
    });
};

exports.deinit = function() {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("notification");
    catalog.removeExtensionPoint("notificationHandler");
};

var catalog = plugins.catalog;
var settings = settingsMod.settings;
var console = consoleMod.console;

exports.Notifier = function() {};

var levels = {
    // Level definitions
    DEBUG: 1,
    INFO: 2,
    ERROR: 3
};

var levelNames = [null, "debug", "info", "error"];

exports._notifications = {};

exports.registerNotification = function(ext) {
    exports._notifications[ext.pluginName + '_' + ext.name] = ext;
};

exports.unregisterNotification = function(ext) {
    delete exports._notifications[ext.pluginName + '_' + ext.name];
};



/*
 * Normalizes and converts a level to an integer value.
 *
 * @param level {string|int} level to convert
 * @return {int} level or null if the level is not properly defined
 */
var _convertLevel = function(level) {
    if (typeof(level) === "number") {
        if (level == 1 || level == 2 || level == 3) {
            return level;
        }
        return null;
    }
    if (level === undefined || level === null) {
        return null;
    }
    if (typeof(level) === "string") {
        level = level.toUpperCase();
        level = levels[level];
        if (level === undefined) {
            return null;
        }
    }
    return level;
};

exports.Notifier.prototype = {
    DEBUG: levels.DEBUG,
    INFO: levels.INFO,
    ERROR: levels.ERROR,
    
    /*
     * Decides which handlers should receive the given message.
     * 
     * @param message {object} the message for which to decide on handlers
     * @param notification {object} extension that defines the notification
     * @param handlers {array} list of available handlers (usually taken from the catalog)
     * @param config {array} list of handler configurations (usually from the "notifications" setting
     * @return an array of handler names
     */
    _chooseHandlers: function(message, notification, handlers, config) {
        var level = message.level;
        level = _convertLevel(level);
        if (level === null) {
            level = notification.level;
            level = _convertLevel(level);
            if (level === null) {
                level = this.INFO;
            }
        }
        message.level = level;
        message.levelName = levelNames[level];
        
        var plugin = message.plugin;
        
        if (!config) {
            config = [];
        }
        
        var result = {};
        var seenHandlers = {};
        config.forEach(function(item) {
            var handler = item.handler;
            if (!handler) {
                return;
            }
            // even if this handler isn't going to be used,
            // we keep track of its presence
            seenHandlers[handler] = true;
            
            var configLevel = _convertLevel(item.level);
            if (configLevel && level < configLevel) {
                return;
            }
            
            if (plugin && item.plugin && item.plugin !== plugin) {
                return;
            }
            result[handler] = true;
        });
        
        // take note of handlers that are installed but not explicitly configured.
        handlers.forEach(function(handler) {
            var handlerLevel = _convertLevel(handler.level);
            if (!handlerLevel || level < handlerLevel || seenHandlers[handler.name]) {
                return;
            }
            result[handler.name] = true;
        });
        
        result = Object.keys(result);
        if (level === levels.ERROR && result.length == 0 && config.length == 0) {
            result.push('alert');
        }
        
        return result;
    },
    
    /*
     * Publishes a notification to the configured handlers. The message object can contain
     * the following:
     * - plugin (required): the name of the plugin sending the message
     * - notification (required): the name of the notification type. This should be defined in the
     *                                plugin metadata
     * - level: overrides the default level for this notification type. should be one of
     *          notifier.ERROR, notifier.INFO, notifier.DEBUG
     * - body (required): main message text (plain text)
     * - title
     * - iconUrl (this will likely have a default for some handlers based on the level)
     * - onclick: called if the user clicks on the notification in a handler that supports clicking on
     *            notifications. It is passed the "message" object (you can place anything
     *            you want in the message to allow proper handling of the click)
     */
    notify: function(message) {
        if (!message.plugin || !message.notification || !message.body) {
            console.error('Received an invalid notification (plugin, notification and body are required)', message);
            return;
        }
        var notification = exports._notifications[message.plugin + '_' + message.notification];
        if (!notification) {
            console.error('Notification message has an unknown notification type:', notification);
            return;
        }
        var handlers = catalog.getExtensions('notificationHandler');
        var config = settings.get('notifications');
        
        try {
            config = JSON.parse(config);
        } catch(e) {
            config = [];
        }
        
        var publishTo = this._chooseHandlers(message, notification, handlers, config);
        publishTo.forEach(function(handlerName) {
            var handler = catalog.getExtensionByKey('notificationHandler', handlerName);
            if (!handler) {
                return;
            }
            handler.load().then(function(handlerFunction) {
                handlerFunction(message);
            });
        });
    },
    
    /*
     * convenience function that is equivalent to
     * notify({
     *  plugin: plugin,
     *  body: body,
     *  notification: "debug"
     * })
     */
    debug: function(plugin, body) {
        this.notify({
            plugin: plugin,
            body: body,
            notification: 'debug'
        });
    }
};

});
