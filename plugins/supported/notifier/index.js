/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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

var catalog = require('bespin:plugins').catalog;

/**
 * This API follows the broad principles of the Gears notification API in the
 * hope that a future HTML spec might.
 */
var Notification = function(iconUrl, title, body) {
    this.iconUrl = iconUrl;
    this.title = title;
    this.body = body;
};

Notification.prototype = {
    /**
     * Causes the notification to displayed to the user. This may or may not
     * happen immediately, depending on the constraints of the presentation
     * method.
     */
    show: function() {
        var handlerExts = catalog.getExtensions('notificationHandler');
        handlerExts.forEach(function(handlerExt) {
            try {
                handlerExt.load(function(handler) {
                    handler.showNotification(this);
                }.bind(this));
            } catch (ex) {
                console.error(ex);
            }
        }, this);
    },

    /**
     * Causes the notification to not be displayed.
     * If the notification has been displayed already, it must be closed.
     * If it has not yet been displayed, it must be removed from the set of
     * pending notifications.
     */
    cancel: function() {
        var handlerExts = catalog.getExtensions('notificationHandler');
        handlerExts.forEach(function(handlerExt) {
            try {
                handlerExt.load(function(handler) {
                    handler.cancelNotification(this);
                });
            } catch (ex) {
                console.error(ex);
            }
        }, this);
    },

    /**
     * Event listener function corresponding to event type "display".
     * This listener must be called when the notification is displayed to the
     * user, which need not be immediately when show() is called.
     */
    ondisplay: null,

    /**
     * Event listener function corresponding to event type "error".
     * This listener must be called when the notification cannot be displayed to
     * the user because of an error.
     */
    onerror: null,

    /**
     * Event listener function corresponding to event type "close".
     * This listener must be called when the notification is closed by the user.
     * This event must not occur until the "display" event.
     */
    onclose: null
};

/**
 * Creates a new notification object with the provided content.
 * <p>If the origin of the script which executes this method does not have
 * permission level PERMISSION_ALLOWED, this method will throw a security
 * exception.
 * @param iconUrl {string} contains the URL of an image resource to be shown
 * with the notification;
 * @param title {string} contains a string which is the primary text of the
 * notification;
 * @param body {string} contains a string which is secondary text for the
 * notification.
 * @return Notification
 */
exports.createNotification = function(iconUrl, title, body) {
    return new Notification(iconUrl, title, body);
};

/*
 * For Bespin it is likely that the content will be already on the server so
 * it makes more sense to do this with some local URL only? Since this function
 * is optional, we are excluding it until we know the best way to handle it.
 * <p>User agents with the ability to present notifications with HTML contents
 * should implement this method; user agents without that ability may only
 * implement createNotification.
 * @param url {string} contains the URL of a resource which contains HTML
 * content to be shown as the content of the notification.
 * If the origin of the script which executes this method does not have
 * permission level PERMISSION_ALLOWED, this method will throw a security
 * exception.
 * @return Notification
 *
exports.createHTMLNotification = function(url) {
};
*/

/**
 * Indicates that the user has granted permission to scripts with this origin to
 * show notifications.
 */
exports.PERMISSION_ALLOWED = 0;

/**
 * Indicates that the user has not taken an action regarding notifications for
 * scripts from this origin.
 */
exports.PERMISSION_NOT_ALLOWED = 1;

/**
 * Indicates that the user has explicitly blocked scripts with this origin from
 * showing notifications.
 */
exports.PERMISSION_DENIED = 2;

/**
 * For Bespin, since there will be a number of ways of notifying the user
 * some of which will not require permission, this function will always return
 * PERMISSION_ALLOWED.
 * @return {number} PERMISSION_ALLOWED
 */
exports.checkPermission = function() {
    return exports.PERMISSION_ALLOWED;
};

/**
 * Since Bespin handles permissions for notifications, this method will always
 * call callback quickly.
 */
exports.requestPermission = function(callback) {
    window.setTimeout(callback, 1);
};
