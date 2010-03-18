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
 * This object represents a "safe console" object that forwards debugging
 * messages appropriately without creating a dependency on Firebug in Firefox.
 */
exports.console = SC.Object.create({
    log: window.console ?
        window.console.log :
        function() { this._error(arguments); },

    debug: window.console ?
        window.console.log :
        function() { this._error(arguments); },

    info: window.console ?
        window.console.info :
        function() { this._error(arguments); },

    warn: window.console ?
        window.console.warn :
        function() { this._error(arguments); },

    error: window.console ?
        window.console.error :
        function() { this._error(arguments); },

    assert: window.console ?
        window.console.assert :
        function() { this._error(arguments); },

    dir: window.console ?
        window.console.dir :
        function() { this._error(arguments); },

    dirxml: window.console ?
        window.console.dirxml :
        function() { this._error(arguments); },

    trace: window.console ?
        window.console.trace :
        function() { this._error(arguments); },

    group: window.console ?
        window.console.group :
        function() { this._error(arguments); },

    groupCollapsed: window.console ?
        window.console.groupCollapsed :
        function() { this._error(arguments); },

    groupEnd: window.console ?
        window.console.groupEnd :
        function() { this._error(arguments); },

    time: window.console ?
        window.console.time :
        function() { this._error(arguments); },

    timeEnd: window.console ?
        window.console.timeEnd :
        function() { this._error(arguments); },

    profile: window.console ?
        window.console.profile :
        function() { this._error(arguments); },

    profileEnd: window.console ?
        window.console.profileEnd :
        function() { this._error(arguments); },

    count: window.console ?
        window.console.count :
        function() { this._error(arguments); },

    _error: function() {
    }
});

