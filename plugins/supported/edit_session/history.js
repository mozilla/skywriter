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

var SC = require('sproutcore/runtime').SC;

var MAX_HISTORY_SIZE = 30;

/**
 * @class
 *
 * A list of recently opened files.
 */
exports.History = SC.Object.extend({
    _getHistory: function() {
        var storage = this.get('storage');
        if ('history2' in storage) {
            return JSON.parse(storage.history2);
        }

        return [];
    },

    _setHistory: function(newHistory) {
        var storage = this.get('storage');
        storage.history2 = JSON.stringify(newHistory);
    },

    /**
     * @property{LocalStorage}
     *
     * The backing store to use. Defaults to HTML 5 local storage.
     */
    storage: window.localStorage,

    /**
     * Adds the supplied path to the history.
     */
    addPath: function(path) {
        var history = this._getHistory();

        var obj = null;
        for (var i = history.length - 1; i >= 0; i--) {
            var historyObj = history[i];
            if (historyObj.path === path) {
                obj = historyObj;
                history.splice(i, 1);
                break;
            }
        }

        if (obj === null) {
            obj = { path: path };
        }

        if (history.length >= MAX_HISTORY_SIZE) {
            history.splice(0, history.length - MAX_HISTORY_SIZE + 1);
        }

        history.push(obj);

        this._setHistory(history);
    },

    getRecent: function(max) {
        var history = this._getHistory();
        return history.slice(max < history.length ? -max : 0);
    },

    /**
     * Updates metadata (the selection boundaries or the scroll position) for a
     * path in the history (if the path is at the top).
     *
     * @param path  The path to update.
     * @param key   The key to update ('selection' or 'scroll').
     * @param value The value to set.
     */
    update: function(path, key, value) {
        var history = this._getHistory();
        var lastObject = history[history.length - 1];
        if (lastObject.path !== path) {
            return;
        }

        lastObject[key] = value;

        this._setHistory(history);
    }
});

