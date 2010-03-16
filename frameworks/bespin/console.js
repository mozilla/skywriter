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
    log: function() {
        if (!SC.none(window.console)) {
            window.console.log.apply(window.console, arguments);
        }
    },

    debug: function() {
        if (!SC.none(window.console)) {
            window.console.debug.apply(window.console, arguments);
        }
    },

    info: function() {
        if (!SC.none(window.console)) {
            window.console.info.apply(window.console, arguments);
        }
    },

    warn: function() {
        if (!SC.none(window.console)) {
            window.console.warn.apply(window.console, arguments);
        }
    },

    error: function() {
        if (!SC.none(window.console)) {
            window.console.error.apply(window.console, arguments);
        }
    },

    assert: function() {
        if (!SC.none(window.console)) {
            window.console.assert.apply(window.console, arguments);
        }
    },

    dir: function() {
        if (!SC.none(window.console)) {
            window.console.dir.apply(window.console, arguments);
        }
    },

    dirxml: function() {
        if (!SC.none(window.console)) {
            window.console.dirxml.apply(window.console, arguments);
        }
    },

    trace: function() {
        if (!SC.none(window.console)) {
            window.console.trace.apply(window.console, arguments);
        }
    },

    group: function() {
        if (!SC.none(window.console)) {
            window.console.group.apply(window.console, arguments);
        }
    },

    groupCollapsed: function() {
        if (!SC.none(window.console)) {
            window.console.groupCollapsed.apply(window.console, arguments);
        }
    },

    groupEnd: function() {
        if (!SC.none(window.console)) {
            window.console.groupEnd.apply(window.console, arguments);
        }
    },

    time: function() {
        if (!SC.none(window.console)) {
            window.console.time.apply(window.console, arguments);
        }
    },

    timeEnd: function() {
        if (!SC.none(window.console)) {
            window.console.timeEnd.apply(window.console, arguments);
        }
    },

    profile: function() {
        if (!SC.none(window.console)) {
            window.console.profile.apply(window.console, arguments);
        }
    },

    profileEnd: function() {
        if (!SC.none(window.console)) {
            window.console.profileEnd.apply(window.console, arguments);
        }
    },

    count: function() {
        if (!SC.none(window.console)) {
            window.console.count.apply(window.console, arguments);
        }
    }
});

