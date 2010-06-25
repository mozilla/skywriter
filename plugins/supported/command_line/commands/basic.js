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

var bespin = require('bespin:index');
var util = require('bespin:util/util');
var env = require('environment').env;

/**
 * 'eval' command
 */
exports.evalCommand = function(args, request) {
    var result;
    var javascript = args.javascript;
    try {
        result = eval(javascript);
    } catch (e) {
        result = '<b>Error: ' + e.message + '</b>';
    }

    var msg = '';
    var type = '';
    var x;

    if (util.isFunction(result)) {
        // converts the function to a well formated string
        msg = (result + '').replace(/\n/g, '<br>').replace(/ /g, '&#160');
        type = 'function';
    } else if (util.isObject(result)) {
        if (Array.isArray(result)) {
            type = 'array';
        } else {
            type = 'object';
        }

        var items = [];
        var value;

        for (x in result) {
            if (result.hasOwnProperty(x)) {
                if (util.isFunction(result[x])) {
                    value = '[function]';
                } else if (util.isObject(result[x])) {
                    value = '[object]';
                } else {
                    value = result[x];
                }

                items.push({name: x, value: value});
            }
        }

        items.sort(function(a,b) {
            return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
        });

        for (x = 0; x < items.length; x++) {
            msg += '<b>' + items[x].name + '</b>: ' + items[x].value + '<br>';
        }

    } else {
        msg = result;
        type = typeof result;
    }

    request.done('Result for eval <b>"' + javascript + '"</b>' +
            ' (type: '+ type+'): <br><br>'+ msg);
};

/**
 * 'version' command
 */
exports.versionCommand = function(args, request) {
    var version = 'Bespin ' + bespin.versionNumber + ' (' + 
            bespin.versionCodename + ')';
    request.done(version);
};

var messages = [
    'really wants you to trick it out in some way.',
    'is your Web editor.',
    'would love to be like Emacs on the Web.',
    'is written on the Web platform, so you can tweak it.'
];

/**
 * 'bespin' command
 */
exports.bespinCommand = function(args, request) {
    var index = Math.floor(Math.random() * messages.length);
    request.done('Bespin ' + messages[index]);
};
