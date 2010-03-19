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

var SC = require('sproutcore/runtime').SC;

/**
 * Everyone's console is different, and behaves to manipulation in different
 * ways...
 */
if (!window || !window.console) {
    // There is no console - probably Firefox without Firebug
    exports.console = {
        log: function() { this._error(arguments); },
        debug: function() { this._error(arguments); },
        info: function() { this._error(arguments); },
        warn: function() { this._error(arguments); },
        error: function() { this._error(arguments); },
        assert: function() { this._error(arguments); },
        dir: function() { this._error(arguments); },
        dirxml: function() { this._error(arguments); },
        trace: function() { this._error(arguments); },
        group: function() { this._error(arguments); },
        groupCollapsed: function() { this._error(arguments); },
        groupEnd: function() { this._error(arguments); },
        time: function() { this._error(arguments); },
        timeEnd: function() { this._error(arguments); },
        profile: function() { this._error(arguments); },
        profileEnd: function() { this._error(arguments); },
        count: function() { this._error(arguments); },

        _error: function() { /* Is there anything sane we can do here? */ }
    };
}
else if (window.console.profiles || window.console.markTimeline) {
    // Webkit's output functions are borked because they get confused if 'this'
    // is not window.console
    exports.console = window.console;
} else {
    // But we don't do the Webkit case for everyone because not everyone
    // supports the same set of functions. This is the safe set, and this works
    // well in Firefox
    exports.console = {
        log: window.console.log,
        debug: window.console.log,
        info: window.console.info,
        warn: window.console.warn,
        error: window.console.error,
        dir: window.console.dir,
        dirxml: window.console.dirxml,
        trace: window.console.trace,
        group: window.console.group,
        groupEnd: window.console.groupEnd,
        time: window.console.time,
        timeEnd: window.console.timeEnd,
        profile: window.console.profile,
        profileEnd: window.console.profileEnd,
        count: window.console.count

        /* Not in Chrome 5.0.307.11
        assert: window.console.assert,
        groupCollapsed: window.console.groupCollapsed,
        */
    };
}
