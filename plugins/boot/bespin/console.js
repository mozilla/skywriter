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


/**
 * This object represents a "safe console" object that forwards debugging
 * messages appropriately without creating a dependency on Firebug in Firefox.
 */

// We could prefer to copy the methods on window.console to exports.console
// one by one because then we could be sure of using the safe subset that is
// implemented on all browsers, however this doesn't work properly everywhere
// ...

var names = [
    "log", "debug", "info", "warn", "error", "assert", "dir", "dirxml",
    "trace", "group", "groupCollapsed", "groupEnd", "time", "timeEnd",
    "profile", "profileEnd", "count"
];

var noop = function() {};

if (window.console && window.console.markTimeline) {
    // Webkit's output functions are bizarre because they get confused if 'this'
    // is not window.console, so we just copy it all across
    exports.console = window.console;
    
    // webkit browsers don't have as many console methods. make sure they're
    // at least not going to make us crash.
    names.forEach(function(name) {
        if (!exports.console[name]) {
            exports.console[name] = noop;
        }
    });
} else {
    // So we're not in Webkit, but we may still be no console object (in the
    // case of Firefox without Firebug)
    exports.console = { };

    // For each of the console functions, copy them if they exist, stub if not
    names.forEach(function(name) {
        if (window.console && window.console[name]) {
            exports.console[name] = window.console[name];
        } else {
            exports.console[name] = noop;
        }
    });
}
