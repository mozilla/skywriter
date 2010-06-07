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
var t = require('plugindev');
var notifier = require('notifier');

var defaultHandlers = function() {
    return [
        {
            "name": "console",
            "description": "Logs the output to the browser's console."
        },
        {
            "name": "alert",
            "description": "Shows a browser alert popup"
        },
        {
            "name": "popup",
            "description": "Displays a more Growl-like display",
            "level": "error"
        }
    ]
};

exports.testHandlerSelection = function() {
    var n = new notifier.Notifier();
    var config = [];
    var handlers = [];
    var notification = {level: 'info'};
    var result = n._chooseHandlers({plugin: 'bar'}, notification, handlers, config);
    t.deepEqual(result, [], 'should get empty list for empty handlers/config');
    
    // note that if nothing is configured and error level is reached,
    // the alert handler is going to be presented regardless of whether it
    // is present in handlers
    result = n._chooseHandlers({plugin: 'bar', level: 'error'}, notification, handlers, config);
    t.deepEqual(result, ['alert'], 'error level, alert handler returned by default');
    
    handlers = defaultHandlers();
    notification.level = 'error';
    result = n._chooseHandlers({plugin: 'bar'}, notification, handlers, config);
    t.deepEqual(result, ['popup'], 'expected popup from default level set in handler ep');
    
    config = [
        {
            handler: 'popup',
            level: 'info'
        }
    ];
    handlers = defaultHandlers();
    notification.level = 'info';
    result = n._chooseHandlers({plugin: 'bar'}, notification, handlers, config);
    t.deepEqual(result, ['popup'], 'expected popup with configured handler');
    
    config[0].plugin = 'foo';
    result = n._chooseHandlers({plugin: 'bar'}, notification, handlers, config);
    t.deepEqual(result, [], 'expected none when plugin does not match');
};
