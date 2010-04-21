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
 * Broadcast a notification to anyone listening
 */
exports.notify = function(notification) {
    if (!notification.isNotification) {
        notification = exports.Notification.create(notification);
    }

    var handlerExts = catalog.getExtensions('notificationHandler');
    handlerExts.forEach(function(handlerExt) {
        try {
            handlerExt.load(function(handler) {
                handler(notification);
            });
        } catch (ex) {
            console.error(ex);
        }
    }, this);
};

/**
 * The unique ID to be applied to the next item.
 * TODO: Do we need this?
 */
var nextId = 0;

/**
 * This API follows the broad principles of the Gears notification API in the
 * hope that a future HTML spec might
 */
exports.Notification = SC.Object.extend({
    /**
     * Specifies the title of the notification.
     * Recommended read-write string
     */
    title: undefined,

    /**
     * Specifies the URL of the icon to display.
     * Recommended read-write string
     */
    icon: undefined,

    /**
     * Specifies the additional subtitle. For example, this could be used to
     * display the appointment time for the calendar notification.
     * Optional read-write string
     */
    subtitle: undefined,

    /**
     * Specifies the main content of the notification. For example, email
     * notifications could put a snippet in this field.
     * Optional read-write string
     */
    description: undefined,

    /**
     * Yeay. Manual RTTI.
     */
    isNotification: true,

    /*
     * GEARS adds 2 further fields which could be useful, however we're not
     * supporting them right now:
     * - displayAtTime
     * This is the time when the notification is meant to be displayed.
     * If this is not provided, the notification will be displayed immediately.
     * Optional read-write Date
     *
     * - displayUntilTime
     * This is the time when the notification is meant to go away.
     * If this is not set, the notification just get displayed and goes away
     * after the default timeout. If it is set, then once displayed, the
     * notification will remain on screen until the user dismisses it or the
     * desired time has arrived.
     * Optional read-write Date
     */

    /**
     * A unique ID for the notification. It can be used for duplicate detection.
     * If this is not set, a unique ID will be generated.
     * Mandatory private read-only string
     */
    _id: null,

    /**
     * @see #addAction()
     */
    _actions: [],

    /**
     *
     */
    init: function() {
        this._id = '' + (nextId++);
    },

    /**
     * Adds an action for this notification.
     * The parameter text specifies the text to display for the action.
     * The action is a JavaScript function to use when the user selects the
     * action.
     */
    addAction: function(text, action) {
        this._actions.pushObject({ text:text, action:action });
    }
});
